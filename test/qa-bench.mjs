// benchmark: node <browser-automation>/browser.mjs "http://localhost:8765/test/bench.html?n=120&size=2000" --script test/qa-bench.mjs
export default async function run(page) {
  const o = {};
  await page.setViewportSize({ width: 1200, height: 800 });
  o.metrics = JSON.parse(await page.evaluate(() => document.documentElement.dataset.metrics));
  // first open of a dropdown with the big list
  const t = async (fn) => { const s = Date.now(); await fn(); return Date.now() - s; };
  o.openFirstMs = await t(async () => { await page.click('#empid0 .bselect-trigger'); await page.waitForSelector('#empid0 .bselect-item'); });
  o.rowsDrawn = await page.locator('#empid0 .bselect-list > .bselect-item').count();
  o.panelDom = await page.evaluate(() => document.querySelector('#empid0 .bselect-panel').getElementsByTagName('*').length);
  // pick + close, then open another
  o.pickMs = await t(async () => { await page.click('#empid0 .bselect-list > .bselect-item:nth-child(3)'); });
  o.afterCloseDom = await page.evaluate(() => document.getElementsByTagName('*').length);
  o.openSecondMs = await t(async () => { await page.click('#empid1 .bselect-trigger'); await page.waitForSelector('#empid1 .bselect-item'); });
  // search inside the big list
  o.searchMs = await t(async () => { await page.fill('#empid1 .bselect-search input', 'number 19'); await page.waitForFunction(() => document.querySelector('#empid1 .bselect-results-count'), null, { timeout: 5000 }).catch(() => {}); });
  o.searchRows = await page.locator('#empid1 .bselect-list > .bselect-item').count();
  await page.mouse.click(2, 2);
  // open/close 30 times: memory / DOM must not grow
  const before = await page.evaluate(() => document.getElementsByTagName('*').length);
  o.cycles30Ms = await t(async () => { for (let i = 0; i < 30; i++) { await page.click('#empid' + (i % 20) + ' .bselect-trigger'); await page.mouse.click(2, 2); } });
  o.domGrowthAfterCycles = (await page.evaluate(() => document.getElementsByTagName('*').length)) - before;
  o.heapMB = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null));
  return o;
}
