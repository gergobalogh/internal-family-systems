// Shared helper: attach to the Chrome window started with
// --remote-debugging-port (see docs/image-generation.md) and find the AI Studio
// prompt tab. Always disconnects afterwards, or the script never exits.
import { chromium } from 'playwright-core'

const ENDPOINT = process.env.STUDIO_CDP ?? 'http://127.0.0.1:9222'

export async function withStudio(fn) {
  let browser = await chromium.connectOverCDP(ENDPOINT)
  // AI Studio now and then swaps the tab's page out mid-run, which closes the
  // page object we hold and can drop the whole connection. `refind`
  // reconnects if it has to and gets the new page.
  const find = () =>
    browser
      .contexts()[0]
      ?.pages()
      .find((p) => !p.isClosed() && p.url().includes('aistudio.google.com/prompts'))
  const refind = async () => {
    for (let i = 0; i < 30; i++) {
      if (!browser.isConnected() || !browser.contexts().length) {
        await browser.close().catch(() => {})
        browser = await chromium.connectOverCDP(ENDPOINT).catch(() => browser)
      }
      const page = find()
      if (page) return page
      await new Promise((r) => setTimeout(r, 1000))
    }
    throw new Error('The AI Studio tab went away')
  }
  try {
    const page = find()
    if (!page) throw new Error('No AI Studio prompt tab — open aistudio.google.com/prompts/new_chat in that window')
    return await fn(page, refind)
  } finally {
    await browser.close().catch(() => {})
  }
}

/** The newest generated image in the chat, as { type, data (base64) }. */
export function fetchImage(page, src) {
  return page.evaluate(async (url) => {
    const blob = await (await fetch(url)).blob()
    const buf = new Uint8Array(await blob.arrayBuffer())
    let bin = ''
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
    return { type: blob.type, data: btoa(bin) }
  }, src)
}

/** Generated images in the chat. Skips the placeholder shown while one renders.
 *  Generated images are blob: URLs; `uploads` also lets in the data: URLs of
 *  images attached by hand or with generate.mjs --in. */
export function listImages(page, uploads = true) {
  return page.evaluate((uploads) =>
    [...document.querySelectorAll('ms-image-chunk img')]
      .filter((img) => (uploads ? /^(blob|data):/ : /^blob:/).test(img.src) && img.complete && img.naturalWidth > 256)
      .map((img) => img.src),
  uploads)
}
