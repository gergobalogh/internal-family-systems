// node scripts/studio/new-chat.mjs — starts a fresh chat (no earlier images
// in context). Run settings reset with it, so run settings.mjs next.
import { withStudio } from './connect.mjs'

await withStudio(async (page) => {
  await page.getByRole('button', { name: 'New chat' }).click()
  await page.waitForURL(/new_chat/, { timeout: 15_000 })
  await page.waitForTimeout(1500)
  console.log(page.url())
})
