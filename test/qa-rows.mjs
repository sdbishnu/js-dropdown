// richer rows + multi-field, accent-insensitive search
export default async function run(page) {
  await page.click('.bselect-trigger'); await page.waitForTimeout(250);
  const o = {};
  o.dots = await page.locator('.bselect-status-dot').count();
  o.badges = await page.locator('.bselect-badge').allTextContents();
  o.meta = await page.locator('.bselect-item-meta').count();
  o.reason = await page.locator('.bselect-item-reason').textContent();
  const rows = page.locator('.bselect-panel .bselect-item');
  await page.fill('.bselect-search input, .bselect-panel input', 'jose'); await page.waitForTimeout(250);
  o.accent = await rows.count();
  o.mark = await page.locator('.bselect-mark').first().textContent();
  await page.fill('.bselect-search input, .bselect-panel input', 'xyz'); await page.waitForTimeout(250);
  o.byCode = await rows.allTextContents();
  await page.screenshot({ path: process.env.TEMP + '/rows.png' });
  if (o.dots !== 4 || o.badges.length !== 2 || o.meta !== 2 || o.reason !== 'Needs approval') throw new Error('rows ' + JSON.stringify(o));
  if (o.accent !== 1 || o.mark !== 'José') throw new Error('accent search ' + JSON.stringify(o));
  if (o.byCode.length !== 1 || !/Zoë/.test(o.byCode[0])) throw new Error('code search ' + JSON.stringify(o));
  return o;
}
