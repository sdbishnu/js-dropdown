// virtual scrolling: node <browser-automation>/browser.mjs http://localhost:8765/test/virtual.html --script test/qa-virtual.mjs
export default async function run(page) {
  const o = {};
  await page.setViewportSize({ width: 900, height: 800 });
  const drawn = (id) => page.locator('#' + id + ' [role=listbox] > .bselect-item').count();
  const labels = (id, n = 3) => page.locator('#' + id + ' [role=listbox] > .bselect-item .bselect-item-label').evaluateAll((els, k) => els.slice(0, k).map((e) => e.textContent), n);
  const scrollTo = async (id, y) => { await page.evaluate(([s, v]) => { document.querySelector(s + ' .bselect-list-wrap').scrollTop = v; }, ['#' + id, y]); await page.waitForTimeout(160); };
  const dom = () => page.evaluate(() => document.getElementsByTagName('*').length);

  await page.click('#v1 .bselect-trigger');
  await page.waitForSelector('#v1 .bselect-item');
  o.v1 = { drawnAtOpen: await drawn('v1'), first: await labels('v1', 1), totalHeight: await page.locator('#v1 [role=listbox]').evaluate((e) => Math.round(e.getBoundingClientRect().height)), domNodes: await dom() };
  await scrollTo('v1', 50000);
  o.v1mid = { drawn: await drawn('v1'), first: await labels('v1', 1) };
  await scrollTo('v1', 150000);
  o.v1end = { drawn: await drawn('v1'), last: await page.locator('#v1 [role=listbox] > .bselect-item .bselect-item-label').last().innerText() };
  // click a row far down
  await scrollTo('v1', 90000);
  const target = page.locator('#v1 [role=listbox] > .bselect-item').nth(4);
  const targetText = await target.locator('.bselect-item-label').innerText();
  await target.click();
  await page.waitForTimeout(200);
  o.v1pick = { picked: targetText, label: await page.locator('#v1 .bselect-trigger-label').innerText() };
  // reopen: selected row is not lost, list starts at the top again
  await page.click('#v1 .bselect-trigger');
  await page.waitForSelector('#v1 .bselect-item');
  o.v1reopen = { drawn: await drawn('v1'), first: await labels('v1', 1) };
  // keyboard End / Home / PageDown
  await page.focus('#v1 .bselect-search input');
  await page.keyboard.press('ArrowDown');
  await page.focus('#v1 .bselect-trigger');
  await page.keyboard.press('End');
  await page.waitForTimeout(300);
  o.keyEnd = await page.locator('#v1 .bselect-focused .bselect-item-label').innerText();
  await page.keyboard.press('Home');
  await page.waitForTimeout(300);
  o.keyHome = await page.locator('#v1 .bselect-focused .bselect-item-label').innerText();
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(300);
  o.keyPageDown = await page.locator('#v1 .bselect-focused .bselect-item-label').innerText();
  // search (still virtual or small result)
  await page.fill('#v1 .bselect-search input', 'employee 49');
  await page.waitForTimeout(350);
  o.search = { drawn: await drawn('v1'), first: await labels('v1', 2), live: await page.locator('#v1 .bselect-sr').innerText() };
  await page.fill('#v1 .bselect-search input', '');
  await page.mouse.click(2, 2);

  // multiple: select a few rows at different scroll positions, all stay selected
  await page.click('#v2 .bselect-trigger');
  await page.waitForSelector('#v2 .bselect-item');
  await page.click('#v2 [role=listbox] > .bselect-item:nth-child(3)');
  await scrollTo('v2', 40000);
  await page.locator('#v2 [role=listbox] > .bselect-item').nth(6).click();
  await scrollTo('v2', 0);
  o.v2 = { selected: await page.locator('#v2 .bselect-viewtab >> nth=1').innerText(), checkedAtTop: await page.locator('#v2 [role=listbox] > .bselect-item .bselect-checked').count() };
  await page.mouse.click(2, 2);

  // virtual:false draws the slice, not everything
  await page.click('#v3 .bselect-trigger');
  await page.waitForSelector('#v3 .bselect-item');
  o.v3 = { drawnAtOpen: await drawn('v3') };
  await page.mouse.click(2, 2);

  // server list: paged, becomes virtual once it holds more than 150 rows
  await page.click('#v4 .bselect-trigger');
  await page.waitForSelector('#v4 .bselect-item');
  for (let i = 0; i < 16; i++) { await page.evaluate(() => { const w = document.querySelector('#v4 .bselect-list-wrap'); w.scrollTop = w.scrollHeight; }); await page.waitForTimeout(260); }
  o.v4 = { drawn: await drawn('v4'), loaded: await page.locator('#v4 [role=listbox]').evaluate((e) => Math.round(e.getBoundingClientRect().height / 31)), endMarker: await page.locator('#v4 .bselect-pagination-end').isVisible().catch(() => false) };
  return o;
}
