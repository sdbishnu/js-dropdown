export default async function run(page) {
  await page.click('.bselect-trigger'); await page.waitForTimeout(300);
  await page.locator('.bselect-panel .bselect-item').nth(1).click(); await page.waitForTimeout(200);
  await page.click('.bselect-trigger'); await page.waitForTimeout(300);
  await page.screenshot({ path: process.env.TEMP + '/rows.png', clip: { x: 0, y: 0, width: 460, height: 300 } });
}
