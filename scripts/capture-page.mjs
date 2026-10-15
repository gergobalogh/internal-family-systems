#!/usr/bin/env node
// Watch a page in headless Chrome: screenshots at given times, plus where an
// element was on every animation frame, sampled inside the page.
//
//   node scripts/capture-page.mjs "http://localhost:5173/?parachute" 1440x900 /tmp/shots 3500 7000 12000
//   node scripts/capture-page.mjs URL 390x844 OUT_DIR 5000 --track=.spike-entrance__traveler --reduced-motion
//
// Times are milliseconds after load. A screenshot stalls software rendering
// for a while, so the times only order the shots; use the samples (taken by a
// requestAnimationFrame loop in the page) for anything about timing.
// Rive draws image meshes through WebGL, which headless Chrome only has with
// SwiftShader; without these flags the figure silently does not draw.
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')))
const [url, size, out, ...times] = args.filter((a) => !a.startsWith('--'))
if (!url || !size || !out) {
  console.error('usage: node scripts/capture-page.mjs <url> <W>x<H> <out dir> [ms...] [--track=<selector>] [--reduced-motion]')
  process.exit(1)
}
const [width, height] = size.split('x').map(Number)
await mkdir(out, { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? '/usr/bin/google-chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
try {
  const page = await browser.newPage({
    viewport: { width, height },
    reducedMotion: 'reduced-motion' in flags ? 'reduce' : 'no-preference',
  })
  const logs = []
  page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`))
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`))
  await page.addInitScript((selector) => {
    window.__samples = []
    const tick = () => {
      const el = selector && document.querySelector(selector)
      if (el) {
        const r = el.getBoundingClientRect()
        window.__samples.push({ t: Math.round(performance.now()), x: r.left, y: r.top, w: r.width, h: r.height })
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, flags.track ?? null)

  await page.goto(url)
  const start = Date.now()
  for (const t of times.map(Number)) {
    const wait = t - (Date.now() - start)
    if (wait > 0) await page.waitForTimeout(wait)
    const path = `${out}/shot-${String(t).padStart(5, '0')}.png`
    await page.screenshot({ path })
    console.log('saved', path)
  }
  const samples = await page.evaluate(() => window.__samples)
  console.log(JSON.stringify({ logs, samples }, null, 1))
} finally {
  await browser.close()
}
