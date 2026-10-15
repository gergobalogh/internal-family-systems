// node scripts/studio/generate.mjs [--in image]... <out.jpg> <prompt files...>
// Sends the prompt files (joined by blank lines) as one message in the open AI
// Studio chat and saves the image it returns. Earlier images in the same chat
// stay in context, so an "EDIT the attached image" prompt edits the last one.
// --in attaches an image of your own to the message, e.g. to edit it; repeat
// it for more than one.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fetchImage, withStudio } from './connect.mjs'

const TIMEOUT = 240_000

const args = process.argv.slice(2)
const attach = []
while (args[0] === '--in') attach.push(args.splice(0, 2)[1])
const [out, ...promptFiles] = args
if (!out || !promptFiles.length) {
  console.error('usage: node scripts/studio/generate.mjs [--in image]... <out.jpg> <prompt files...>')
  process.exit(1)
}
const prompt = (await Promise.all(promptFiles.map((f) => readFile(f, 'utf8')))).join('\n\n').trim()

/** Waits until the Run button is not showing Stop and, with `enabled`, can be
 *  clicked (it can't while the prompt box is empty). */
function runReady(page, enabled = true) {
  return page.waitForFunction(
    (enabled) => {
      const run = document.querySelector('button.ctrl-enter-submits')
      return run && !run.innerText.includes('Stop') && (!enabled || run.getAttribute('aria-disabled') !== 'true')
    },
    enabled,
    { timeout: 360_000 },
  )
}

const swapped = (e) => /closed|detached|destroyed/i.test(e.message)

await withStudio(async (page, refind) => {
  // The settings panel covers the prompt box on narrow windows.
  const close = page.getByRole('button', { name: 'Close run settings panel' })
  if (await close.isVisible().catch(() => false)) await close.click()

  const turnCount = await page.locator('ms-chat-turn').count()

  // A failed run can leave an attachment in the box; it would go out too.
  await runReady(page, false)
  const leftover = page.getByRole('button', { name: 'Remove media' })
  while (await leftover.count()) await leftover.first().click()
  if (attach.length) {
    await page.locator('ms-add-media-button input.file-input').setInputFiles(attach)
    await page.locator('ms-prompt-image img.loaded-image').nth(attach.length - 1).waitFor({ timeout: 30_000 })
    console.log('attached', attach.join(', '))
  }
  const box = page.getByRole('textbox', { name: 'Enter a prompt' })
  await box.fill(prompt)
  // Run stays disabled while an attachment is still being read, and then
  // Ctrl+Enter does nothing. Click it once it's ready; the box empties when
  // the message has gone.
  await runReady(page)
  // Clicked in the page: AI Studio starts a navigation on Run, and a
  // Playwright click would wait for it, sometimes for good.
  await page
    .locator('button.ctrl-enter-submits')
    .evaluate((b) => b.click())
    .catch(async (e) => {
      if (!swapped(e)) throw e
      page = await refind()
    })
  const sent = await page
    .waitForFunction(
      () => !document.querySelector('ms-prompt-image') && !document.querySelector('textarea[aria-label="Enter a prompt"]')?.value,
      null,
      { timeout: 60_000 },
    )
    .then(() => true, () => false)
  console.log(sent ? 'submitted' : 'the prompt box has not emptied; waiting anyway', promptFiles.join(' + '))

  // Done when the chat has grown, its last turn is a generated image and the
  // one before is this prompt. Image URLs all change if the page is swapped
  // out, so which images are new can't tell. Quota and billing problems
  // arrive as an error in the model's turn.
  const asked = prompt.replace(/\s+/g, ' ')
  const answer = () =>
    page.evaluate(
      ([skip, asked]) => {
        const turns = [...document.querySelectorAll('ms-chat-turn')]
        const error = turns.slice(skip).map((t) => t.innerText).join('\n').match(/error\s*\n?\s*([^\n]+)/i)?.[1].trim()
        const running = document.querySelector('button.ctrl-enter-submits')?.innerText.includes('Stop')
        if (turns.length < skip + 2) return { error, running }
        const [question, last] = turns.slice(-2)
        last.scrollIntoView()
        const img = last.querySelector('ms-image-chunk img')
        const ours = question.innerText.replace(/\s+/g, ' ').includes(asked)
        const refused = ours && !running && /No image generated/i.test(last.innerText) ? 'No image generated' : null
        const done = ours && img && /^blob:/.test(img.src)
        return { error: error ?? refused, running, src: done && img.complete && img.naturalWidth > 256 ? img.src : null }
      },
      [turnCount, asked],
    )

  const started = Date.now()
  let src = null
  let idleSince = null
  while (!src && Date.now() - started < TIMEOUT) {
    await page.waitForTimeout(3000).catch(() => {})
    let state
    try {
      state = await answer()
    } catch (e) {
      if (!swapped(e)) throw e
      console.log('the page was swapped out; finding it again')
      page = await refind()
      continue
    }
    if (state.error) throw new Error(`AI Studio: ${state.error}`)
    src = state.src ?? null
    // A swapped-out page can drop the run: nothing running, no answer.
    idleSince = state.running || src ? null : (idleSince ?? Date.now())
    if (idleSince && Date.now() - idleSince > 30_000 && Date.now() - started > 45_000)
      throw new Error('The run stopped without an image (the page may have reloaded); delete the turn and rerun')
  }
  if (!src) throw new Error(`No image appeared within ${TIMEOUT / 60_000} minutes`)
  // Let the run finish: clicking Run while it's still going stops it.
  await runReady(page, false).catch(() => console.log('the run still shows Stop'))
  await page.waitForTimeout(1500)

  const { type, data } = await fetchImage(page, src)
  if (!type.startsWith('image/')) throw new Error(`Got ${type}, not an image — try save-last.mjs`)
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, Buffer.from(data, 'base64'))
  const kb = Math.round((data.length * 0.75) / 1024)
  console.log('saved', out, type, `${kb} KB`, `${Math.round((Date.now() - started) / 1000)}s`)
})
