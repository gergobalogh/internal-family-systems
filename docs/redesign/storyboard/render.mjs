#!/usr/bin/env node
// Renders storyboard frames to JPEG beside this file (frames/<id>.jpg).
//   node docs/redesign/storyboard/render.mjs          # every frame
//   node docs/redesign/storyboard/render.mjs A08 A09  # some
import { mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium } from 'playwright-core'

const here = path.dirname(fileURLToPath(import.meta.url))
const FRAMES = new Function(`${await readFile(`${here}/frames.js`, 'utf8')}; return FRAMES`)()
const want = process.argv.slice(2)
await mkdir(`${here}/frames`, { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? '/usr/bin/google-chrome',
  args: ['--allow-file-access-from-files'],
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 })
page.on('pageerror', (e) => console.error('pageerror', e.message))
for (const f of FRAMES.filter((x) => !want.length || want.includes(x.id))) {
  await page.goto(`file://${here}/frame.html?f=${f.id}`)
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0))
  // Background images load outside document.images: wait for each one too.
  await page.evaluate(() =>
    Promise.all(
      [...document.querySelectorAll('.world')].map(
        (w) => new Promise((r) => Object.assign(new Image(), { onload: r, onerror: r, src: getComputedStyle(w).backgroundImage.slice(5, -2) })),
      ),
    ),
  )
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${here}/frames/${f.id}.jpg`, type: 'jpeg', quality: 84 })
  console.log(f.id)
}
await browser.close()
