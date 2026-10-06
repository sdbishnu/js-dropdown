export default async function run(page) {
  await page.setViewportSize({ width: 820, height: 640 });
  await page.click('.bselect-trigger'); await page.waitForTimeout(300);
  await page.click('.bselect-settings-action'); await page.waitForTimeout(500);
  const tabs = page.locator('.bselect-settings [role=tab], .bselect-settings .bselect-tabs button');
  const n = await tabs.count();
  for (let i = 0; i < n; i++) { await tabs.nth(i).click(); await page.waitForTimeout(350); await page.locator('.bselect-settings-wrap').first().screenshot({ path: process.env.TEMP + '/tab' + i + '.png' }); }
  return n;
}
