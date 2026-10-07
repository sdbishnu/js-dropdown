// Guide button in the settings gear: next to Find, opens the guide in a new tab at the section of the open tab
export default async function run(page) {
  await page.setViewportSize({ width: 1000, height: 700 });
  const o = {};
  await page.click('.bselect-trigger >> nth=0'); await page.waitForTimeout(300);
  await page.click('.bselect-settings-action'); await page.waitForTimeout(500);
  const S = '.bselect-settings';
  const g = page.locator(S + ' .bselect-settings-guide');
  o.count = await g.count();
  o.target = await g.getAttribute('target');
  o.href = await g.getAttribute('href');
  o.near = await page.evaluate(() => { const a = document.querySelector('.bselect-settings-guide').getBoundingClientRect(); const f = document.querySelector('.bselect-settings-find').getBoundingClientRect(); return { gap: Math.round(f.left - a.right), sameRow: Math.abs((a.top + a.height / 2) - (f.top + f.height / 2)) < 3 }; });
  await page.click(S + ' .bselect-tab[title="Dropdown"]'); await page.waitForTimeout(350);
  o.hrefDropdown = await g.getAttribute('href');
  await page.click(S + ' .bselect-tab[title="Export"]'); await page.waitForTimeout(350);
  o.hrefExport = await g.getAttribute('href');
  const url = new URL(o.href, page.url()).toString().split('#')[0];
  o.guideStatus = (await page.request.get(url)).status();
  if (o.count !== 1 || o.target !== '_blank' || !/guide\.html(#tab-behavior)?$/.test(o.href)) throw new Error('guide link ' + JSON.stringify(o));
  if (!o.near.sameRow || o.near.gap > 12) throw new Error('not next to Find ' + JSON.stringify(o.near));
  if (!/guide\.html#tab-dropdown$/.test(o.hrefDropdown) || !/guide\.html#tab-advanced$/.test(o.hrefExport)) throw new Error('deep links ' + JSON.stringify(o));
  if (o.guideStatus !== 200) throw new Error('guide not found ' + url);
  return o;
}
