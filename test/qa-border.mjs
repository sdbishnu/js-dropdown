// button border size choices
export default async function run(page) {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.click('.bselect-trigger'); await page.waitForTimeout(300);
  await page.click('.bselect-settings-action'); await page.waitForTimeout(400);
  await page.click('.bselect-settings .bselect-tab[title="Button"]'); await page.waitForTimeout(400);
  const w = () => page.locator('.bselect-trigger').evaluate((e) => getComputedStyle(e).borderTopWidth);
  const o = { auto: await w() };
  const pick = async (t) => { await page.click('.bselect-settings .bselect-pane-active .bselect-seg button:text-is("' + t + '")'); await page.waitForTimeout(250); return w(); };
  o.none = await pick('None'); o.px3 = await pick('3px'); o.px2 = await pick('2px');
  o.auto2 = await pick('Auto');
  if (o.none !== '0px' || o.px3 !== '3px' || o.px2 !== '2px' || o.auto2 !== o.auto) throw new Error(JSON.stringify(o));
  return o;
}
