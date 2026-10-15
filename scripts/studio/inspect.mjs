// node scripts/studio/inspect.mjs — prints what the scripts rely on in the
// AI Studio page (prompt box, buttons, chat turns, generated images). Run it
// first when a script breaks after an AI Studio redesign.
import { withStudio } from './connect.mjs'

await withStudio(async (page) => {
  const info = await page.evaluate(() => ({
    url: location.href,
    visibility: document.visibilityState,
    promptBoxes: [...document.querySelectorAll('textarea, [contenteditable="true"]')].map(
      (el) => el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.tagName,
    ),
    buttons: [...document.querySelectorAll('button')]
      .map((b) => b.getAttribute('aria-label') || b.innerText.trim().slice(0, 40))
      .filter(Boolean),
    turns: [...document.querySelectorAll('ms-chat-turn')].map((t) => t.innerText.slice(0, 100).replace(/\s+/g, ' ')),
    images: [...document.querySelectorAll('ms-image-chunk img')].map((img) => ({
      src: img.src.slice(0, 40),
      size: `${img.naturalWidth}x${img.naturalHeight}`,
    })),
  }))
  console.log(JSON.stringify(info, null, 1))
})
