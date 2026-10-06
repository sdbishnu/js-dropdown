// multi-word search + highlight, screen reader live region, aria, request cache
// node <browser-automation>/browser.mjs http://localhost:8765/test/search-a11y.html --script test/qa-search-a11y.mjs
export default async function run(page) {
  const o = {};
  await page.setViewportSize({ width: 800, height: 700 });
  const rows = (id) => page.locator('#' + id + ' [role=listbox] > .bselect-item');
  await page.click('#s1 .bselect-trigger');
  await page.waitForSelector('#s1 .bselect-item');
  o.all = await rows('s1').count();
  // multi word: both words must match (label + sub text)
  await page.fill('#s1 .bselect-search input', 'john card');
  await page.waitForTimeout(300);
  o.multiWord = await page.locator('#s1 [role=listbox] .bselect-item-label').allInnerTexts();
  o.marks = await page.locator('#s1 [role=listbox] .bselect-mark').allInnerTexts();
  // sub text search
  await page.fill('#s1 .bselect-search input', 'neuro');
  await page.waitForTimeout(300);
  o.subSearch = await page.locator('#s1 [role=listbox] .bselect-item-label').allInnerTexts();
  o.subMark = await page.locator('#s1 [role=listbox] .bselect-item-sub .bselect-mark').allInnerTexts();
  // regex characters in the query must not break anything
  await page.fill('#s1 .bselect-search input', '(smith) [icu]');
  await page.waitForTimeout(300);
  o.special = await page.locator('#s1 [role=listbox] .bselect-item-label').allInnerTexts();
  o.specialMarks = await page.locator('#s1 [role=listbox] .bselect-mark').allInnerTexts();
  // screen reader live region
  await page.waitForTimeout(400);
  o.liveAfterSearch = await page.locator('#s1 .bselect-sr').innerText();
  await page.fill('#s1 .bselect-search input', 'zzzz');
  await page.waitForTimeout(500);
  o.liveNoResults = await page.locator('#s1 .bselect-sr').innerText();
  await page.fill('#s1 .bselect-search input', '');
  await page.waitForTimeout(400);
  o.liveCount = await page.locator('#s1 .bselect-sr').innerText();
  o.ariaRow = await page.locator('#s1 [role=listbox] .bselect-item').first().evaluate((e) => ({ setsize: e.getAttribute('aria-setsize'), pos: e.getAttribute('aria-posinset'), id: !!e.id }));
  await page.click('#s1 [role=listbox] .bselect-item:nth-child(3)');
  await page.waitForTimeout(450);
  o.liveSelected = await page.locator('#s1 .bselect-sr').innerText();
  o.focusBack = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('bselect-trigger'));
  o.triggerName = await page.locator('#s1 .bselect-trigger').getAttribute('aria-label');
  // request cache: log counts for /api/items
  const count = async () => (await (await page.request.get('http://localhost:8765/api/log')).json()).filter((r) => r.path === '/api/items' && r.params.total === '30').length;
  const before = await count();
  await page.click('#c1 .bselect-trigger'); await page.waitForSelector('#c1 .bselect-item'); await page.mouse.click(2, 2);
  await page.click('#c2 .bselect-trigger'); await page.waitForSelector('#c2 .bselect-item'); await page.mouse.click(2, 2);
  const afterAB = await count();
  await page.click('#c3 .bselect-trigger'); await page.waitForSelector('#c3 .bselect-item'); await page.mouse.click(2, 2);
  const afterC = await count();
  // reopen A: no new request
  await page.click('#c1 .bselect-trigger'); await page.waitForTimeout(300); await page.mouse.click(2, 2);
  const afterReopen = await count();
  o.requests = { sharedAB: afterAB - before, uncachedC: afterC - afterAB, reopen: afterReopen - afterC };
  return o;
}
