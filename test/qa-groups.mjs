// groups: fold + count + select group; A-Z rail
export default async function run(page) {
  await page.setViewportSize({ width: 600, height: 700 });
  const o = {};
  await page.click('.bselect-trigger >> nth=0'); await page.waitForTimeout(300);
  o.heads = await page.locator('.bselect-group-head').count();
  o.counts = await page.locator('.bselect-group-count').allTextContents();
  o.rowsBefore = await page.locator('.bselect-panel .bselect-item').count();
  await page.locator('.bselect-group-name').first().click(); await page.waitForTimeout(150);
  o.rowsFolded = await page.locator('.bselect-panel .bselect-item').count();
  o.closed = await page.locator('.bselect-group-closed').count();
  await page.locator('.bselect-group-name').first().click(); await page.waitForTimeout(150);
  await page.locator('.bselect-group-pick').first().click(); await page.waitForTimeout(200);
  o.pickedTab = await page.locator('.bselect-viewtab').nth(1).textContent();
  o.pickLabel = await page.locator('.bselect-group-pick').first().textContent();
  await page.locator('.bselect-group-pick').first().click(); await page.waitForTimeout(200);
  o.afterUnpick = await page.locator('.bselect-viewtab').nth(1).textContent();
  await page.mouse.click(2, 2); await page.waitForTimeout(150);
  // rail
  await page.click('.bselect-trigger >> nth=1'); await page.waitForTimeout(300);
  o.letters = await page.locator('.bselect-rail-letter').count();
  await page.locator('.bselect-rail-letter[data-l="M"]').click(); await page.waitForTimeout(250);
  o.firstVisible = await page.evaluate(() => { const w = document.querySelector('.bselect-list-wrap'); const r = w.getBoundingClientRect(); const li = [...document.querySelectorAll('.bselect-panel .bselect-item')].find((e) => e.getBoundingClientRect().top >= r.top - 1); return li && li.textContent.trim(); });
  if (o.heads !== 3 || o.counts.join() !== '10,10,10') throw new Error('groups ' + JSON.stringify(o));
  if (o.rowsFolded !== o.rowsBefore - 10 || o.closed !== 1) throw new Error('fold ' + JSON.stringify(o));
  if (!/\(10\)/.test(o.pickedTab) || !/Unselect/.test(o.pickLabel) || /\(/.test(o.afterUnpick)) throw new Error('select group ' + JSON.stringify(o));
  if (o.letters !== 26 || !/^M/.test(o.firstVisible || '')) throw new Error('rail ' + JSON.stringify(o));
  return o;
}
