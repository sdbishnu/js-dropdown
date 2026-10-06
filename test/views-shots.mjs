export default async function run(page) {
  await page.setViewportSize({ width: 600, height: 640 });
  await page.click('.bselect-trigger'); await page.waitForTimeout(350);
  const it = page.locator('.bselect-panel .bselect-item');
  await it.nth(0).click(); await it.nth(2).click(); await page.waitForTimeout(150);
  await page.screenshot({ path: process.env.TEMP + '/views-light.png' });
}
