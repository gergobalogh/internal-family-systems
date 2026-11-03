#!/usr/bin/env node
// Plays one whole session of the app the way a person would, AI on:
// free-write → parts → who came → Go on → Act 2 (tap one, its words, thanks)
// → Act 3 (step back, a move, the dusk "what if", Keep it) → the ending (the
// picture, kept) → Get to know it → a move (noticing) → What if… experiment. Records a video, a still of every card,
// and a timeline of what each card said and when.
//
//   node scripts/record-session.mjs http://localhost:5173/ 390x844 docs/redesign/today/phone
//
// Every answer goes to the real AI routes, so a run costs a few model calls.
// Screenshots stall software rendering, so take timing from timeline.json's
// card-to-card gaps, not from the video.
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const [url, size, out] = process.argv.slice(2)
if (!url || !size || !out) {
  console.error('usage: node scripts/record-session.mjs <url> <W>x<H> <out dir>')
  process.exit(1)
}
const [width, height] = size.split('x').map(Number)
await mkdir(out, { recursive: true })

const FREE_WRITE =
  'Work has been relentless and I keep lying awake replaying everything I said in meetings. ' +
  "Part of me says I'm not good enough and should push harder, and part of me just wants to " +
  'hide under the covers and not deal with any of it.'

const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? '/usr/bin/google-chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const context = await browser.newContext({
  viewport: { width, height },
  recordVideo: { dir: out, size: { width, height } },
  acceptDownloads: true,
})
const page = await context.newPage()
const logs = []
page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`))
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`))

const t0 = Date.now()
const timeline = []
let n = 0
const log = (what, extra = {}) => {
  const row = { t: +((Date.now() - t0) / 1000).toFixed(1), what, ...extra }
  timeline.push(row)
  console.log(JSON.stringify(row))
}
const shot = async (name) => {
  const file = `${String(++n).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: `${out}/${file}` })
  return file
}

/** Waits for a card the person can act on; returns its lines, buttons and choices. */
async function card(timeout = 90000) {
  await page.waitForFunction(
    () => {
      const c = document.querySelector('.card')
      if (!c || c.classList.contains('is-waiting') || c.classList.contains('is-away')) return false
      return [...c.querySelectorAll('button')].some((b) => !b.disabled && b.textContent.trim() !== 'One moment…')
    },
    null,
    { timeout },
  )
  await page.waitForTimeout(900)
  return page.evaluate(() => {
    const c = document.querySelector('.card')
    return {
      lines: [...c.querySelectorAll('.card__line')].map((l) => l.textContent.trim()),
      buttons: [...c.querySelectorAll('button, a.card__button')].map((b) => b.textContent.trim()).filter(Boolean),
      choices: [...c.querySelectorAll('.card__choice')].map((b) => b.textContent.trim()),
    }
  })
}
async function answer(text) {
  await page.fill('textarea.card__field', text)
  await page.click('.card button[type=submit]')
}
const press = (label) => page.click(`.card button:has-text("${label}")`)
async function record(name) {
  const c = await card()
  log(name, { ...c, file: await shot(name) })
  return c
}
/** Drags a part's figure by (dx, dy); force, because neighbours' handles can overlap it. */
async function drag(nth, dx, dy) {
  const box = await page.locator('.part__body').nth(nth).boundingBox()
  const x = box.x + box.width / 2
  const y = box.y + box.height * 0.6
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 20 })
  await page.mouse.up()
}

try {
  await page.goto(url)

  // ── Entry conversation ────────────────────────────────────────────
  await record('turn0-freewrite')
  await answer(FREE_WRITE)
  let c = await record('turn1-loudest')
  if (c.choices.length) await page.click('.card__choice >> nth=0')
  else if (/Would you call it/.test(c.lines.join(' '))) await answer('yes')
  else await answer('not feeling good enough')

  for (let guard = 0; guard < 8; guard++) {
    c = await record('entry')
    const text = c.lines.join(' ')
    if (/who came/.test(text)) break
    if (/feel toward/.test(text)) await answer('honestly, frustrated with it')
    else if (/another feeling|What would you call it\?/.test(text)) await answer('the one who wants to hide')
    else if (/also mentioned|quieter feeling/.test(text)) {
      if (c.choices.length) await page.click('.card__choice >> nth=0')
      else await answer('the tired one')
    } else await answer('yes')
  }

  // ── Act 1's close: who came → Go on ───────────────────────────────
  await press('Go on')

  // ── Act 2: tap one, its words, what it's trying to do, thanks ─────
  await page.waitForTimeout(1500)
  if (await page.locator('.part.is-offered').count()) {
    await record('act2-choose')
    await page.locator('.part.is-offered .part__body').first().click({ force: true })
    await record('act2-voice')
    await answer("you can't stop now or everything falls apart")
    await record('act2-intent')
    await answer('keep me from being let go, I think')
    await record('act2-thanks')
    await press('Thank it')
    await page.waitForTimeout(1200)
    log('act2 glow', { file: await shot('act2-glow') })
  } else {
    log('act2 skipped: nobody offered')
  }

  // ── Act 3: step back, a move, That's how it is, the dusk "what if" ─
  await record('act3-step-back')
  await drag(0, -width * 0.08, -10)
  await page.waitForTimeout(800)
  await record('act3-moved')
  await press("That's how it is")
  await record('act3-dusk')
  const marked = page.locator('.part.is-marked .part__body')
  await ((await marked.count()) ? marked.first() : page.locator('.part__body').first()).focus()
  await page.keyboard.press('+')
  await page.keyboard.press('+')
  await page.waitForTimeout(800)
  log('act3 tried', { file: await shot('act3-tried') })
  await press('Keep it')

  // ── The ending: the picture to keep, then Done ───────────────────
  await record('ending')
  await page.waitForSelector('.postcard__image', { timeout: 15000 })
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }).catch(() => null),
    press('Keep this picture'),
  ])
  if (download) await download.saveAs(`${out}/${download.suggestedFilename()}`)
  log('picture kept', { file: download ? download.suggestedFilename() : null })
  await press('Done')
  await page.waitForTimeout(2500)
  log('map handed over', { file: await shot('map-handed-over') })

  // ── Select a part → its box → Get to know it ──────────────────────
  await page.locator('.part__body').first().click({ force: true })
  await page.waitForTimeout(800)
  log('part selected', {
    file: await shot('part-box'),
    box: await page.evaluate(() => [...document.querySelectorAll('.part.is-selected button')].map((b) => b.textContent.trim()).filter(Boolean)),
  })
  await page.click('.part.is-selected button:has-text("Get to know it")')
  await record('know-voice')
  await answer("you can't stop now or everything falls apart")
  await record('know-intent')
  await answer('keep me from being let go, I think')
  await record('know-thanks')
  await press('Not yet')
  await page.waitForTimeout(1500)

  // ── A move in How it is → noticing ───────────────────────────────
  await drag(0, width * 0.25, -20)
  log('dragged part 1')
  try {
    await record('noticing')
    await answer('it feels a bit quieter over there')
    await record('noticing-reflection')
    await press('Close')
  } catch {
    log('no noticing card', { file: await shot('no-noticing') })
  }
  await page.waitForTimeout(1500)

  // ── What if… experiment (Act 3 was its invitation: start it from the bar) ─
  await page.click('.mode-switch button:has-text("What if")')
  try {
    await page.waitForTimeout(1500)
    await page.click('button:has-text("Try an experiment")')
    await page.waitForTimeout(1500)
    log('trying bar', { file: await shot('whatif-trying') })
    await drag(1, -width * 0.15, 10)
    await page.waitForTimeout(800)
    await press("I've tried it")
    c = await record('whatif-after')
    if (c.buttons.includes('Finish without changes')) log('the drag did not count as a move')
    else {
      await answer('lighter, like there was more room to breathe')
      await record('whatif-reflection')
      await press('Close')
    }
  } catch (e) {
    log('experiment step failed', { error: String(e).slice(0, 200), file: await shot('whatif-failed') })
  }
  await page.waitForTimeout(1500)
  log('end what-if', { file: await shot('end-whatif') })
  await page.click('.mode-switch button:has-text("How it is")')
  await page.waitForTimeout(1500)
  log('end how-it-is', {
    file: await shot('end-howitis'),
    note: await page.evaluate(() => document.querySelector('.map-note__text')?.textContent.trim()),
  })
} catch (e) {
  log('FAILED', { error: String(e).slice(0, 400), file: await shot('failed') })
} finally {
  await writeFile(`${out}/timeline.json`, JSON.stringify({ url, size, timeline, logs }, null, 2))
  await context.close()
  await browser.close()
}
