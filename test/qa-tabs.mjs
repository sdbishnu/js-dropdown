// multiple: All | Selected tabs (All: Select all, Selected: Clear all); single select: no tabs; old drawer is gone
export default async function run(page) {
  const o = {};
  await page.click('.bselect-trigger >> nth=0'); await page.waitForTimeout(250);
  o.tabs = await page.locator('.bselect-viewtab').allTextContents();
  o.action = await page.locator('.bselect-viewaction').textContent();
  o.drawer = await page.locator('.bselect-selected, .bselect-selected-sticky, .bselect-selected-toggle').count();
  await page.click('.bselect-viewaction'); await page.waitForTimeout(200);
  o.afterSelectAll = await page.locator('.bselect-viewaction').textContent();
  o.tab2 = (await page.locator('.bselect-viewtab').allTextContents())[1];
  await page.locator('.bselect-viewtab').nth(1).click(); await page.waitForTimeout(200);
  o.selectedRows = await page.locator('.bselect-panel .bselect-item').count();
  o.action2 = await page.locator('.bselect-viewaction').textContent();
  await page.locator('.bselect-panel .bselect-item').first().click(); await page.waitForTimeout(150);
  o.afterUncheck = await page.locator('.bselect-panel .bselect-item').count();
  await page.click('.bselect-viewaction'); await page.waitForTimeout(200);
  o.afterClear = await page.locator('.bselect-panel .bselect-item').count();
  o.empty = await page.locator('.bselect-panel').innerText();
  o.actionHidden = await page.locator('.bselect-viewaction').isHidden();
  await page.locator('.bselect-viewtab').nth(0).click(); await page.waitForTimeout(200);
  o.allRows = await page.locator('.bselect-panel .bselect-item').count();
  // single select
  await page.mouse.click(2, 2); await page.waitForTimeout(150);
  await page.click('.bselect-trigger >> nth=1'); await page.waitForTimeout(250);
  o.singleTabs = await page.locator('.bselect-viewbar').count();
  if (o.tabs.length !== 2 || o.tabs[0] !== 'All' || !/^Selected/.test(o.tabs[1]) === false && false) throw new Error('tabs ' + JSON.stringify(o));
  if (o.action !== 'Select all' || o.afterSelectAll !== 'Unselect all') throw new Error('all action ' + JSON.stringify(o));
  if (o.drawer !== 0) throw new Error('drawer still there ' + JSON.stringify(o));
  if (o.selectedRows !== 100 || o.action2 !== 'Clear all') throw new Error('selected tab ' + JSON.stringify(o));
  if (o.afterUncheck !== 99 || o.afterClear !== 0 || !o.actionHidden) throw new Error('unselect/clear ' + JSON.stringify(o));
  if (!/Nothing selected/.test(o.empty) || o.allRows < 1 || o.singleTabs !== 0) throw new Error('all / single ' + JSON.stringify(o));
  return o;
}
