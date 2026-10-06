// the sliding highlight of the settings tabs always ends exactly under the active tab (also after quick clicks / a rebuild)
export default async function run(page) {
  await page.setViewportSize({ width: 820, height: 640 });
  await page.click('.bselect-trigger'); await page.waitForTimeout(300);
  await page.click('.bselect-settings-action');
  const gap = () => page.evaluate(() => {
    const t = document.querySelector('.bselect-settings .bselect-tabs');
    const a = t.querySelector('.bselect-tab-active'); const i = t.querySelector('.bselect-tab-ind');
    return Math.round(Math.abs(a.offsetLeft - parseFloat(i.style.left)) + Math.abs(a.offsetWidth - parseFloat(i.style.width)));
  });
  const o = { start: [] };
  await page.waitForTimeout(700); o.first = await gap();
  const tabs = page.locator('.bselect-settings .bselect-tab');
  const n = await tabs.count();
  for (let r = 0; r < 2; r++) for (let i = 0; i < n; i++) { await tabs.nth(i).click(); await page.waitForTimeout(r ? 20 : 60); }
  await page.waitForTimeout(700); o.afterQuick = await gap();
  await tabs.nth(0).click(); await page.waitForTimeout(500);
  await page.click('.bselect-settings .bselect-pill >> nth=0'); await page.waitForTimeout(700);
  o.afterChange = await gap();
  if (o.first > 1 || o.afterQuick > 1 || o.afterChange > 1) throw new Error('indicator off ' + JSON.stringify(o));
  return o;
}
