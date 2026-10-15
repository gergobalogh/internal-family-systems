// node scripts/studio/settings.mjs <aspect> <resolution> [screenshot.png]
//   e.g. 16:9 2K, or 1:1 1K. Also sets "Images only" and turns grounding off.
// Prints the options AI Studio offers, so an unknown value is easy to fix.
import { withStudio } from './connect.mjs'

const [aspect, resolution, shot] = process.argv.slice(2)

await withStudio(async (page) => {
  if (!(await page.getByText('Aspect ratio', { exact: true }).isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Toggle run settings panel' }).click()
    await page.waitForTimeout(800)
  }
  await page.getByText('Images only', { exact: true }).click()

  async function choose(labelText, wanted) {
    const section = page
      .getByText(labelText, { exact: true })
      .locator('xpath=ancestor::*[.//*[@role="combobox"] or .//mat-select][1]')
    await section.locator('[role="combobox"], mat-select').first().click()
    await page.waitForTimeout(500)
    const options = await page.locator('[role="option"]').allInnerTexts()
    console.log(labelText, 'options:', options.map((o) => o.trim().replace(/\s+/g, ' ')).join(', '))
    const match = page.locator('[role="option"]').filter({ hasText: wanted }).first()
    if (wanted && (await match.count())) await match.click()
    else {
      console.log(`  "${wanted}" not offered — left unchanged`)
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(400)
  }
  await choose('Aspect ratio', aspect)
  await choose('Resolution', resolution)

  const switches = page.locator('[role="switch"]')
  for (let i = 0; i < (await switches.count()); i++) {
    const s = switches.nth(i)
    const label = await s.evaluate(
      (el) => el.closest('div,section')?.innerText?.slice(0, 60) || el.getAttribute('aria-label') || '',
    )
    if (/Grounding/i.test(label) && (await s.getAttribute('aria-checked')) === 'true') await s.click()
  }
  await page.waitForTimeout(500)
  if (shot) await page.screenshot({ path: shot })
})
