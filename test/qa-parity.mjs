// Parity checks against the original bselect behaviour: states, pagination UI, settings popup, keyboard, aria
// node <browser-automation>/browser.mjs http://localhost:8765/test/parity.html --script test/qa-parity.mjs
export default async function run(page) {
  const o = {};
  const cnt = (s) => page.locator(s).count();
  const vis = (s) => page.locator(s).first().isVisible().catch(() => false);

  // 1. server list: skeleton while loading (slow endpoint), then rows
  await page.click('#srv .bselect-trigger');
  o.skeleton = await vis('#srv .bselect-skeleton');
  await page.waitForSelector('#srv .bselect-item');
  o.rows1 = await cnt('#srv .bselect-list > .bselect-item');
  o.hintVisible = await vis('#srv .bselect-lazy-hint');
  o.aria = {
    expanded: await page.getAttribute('#srv .bselect-trigger', 'aria-expanded'),
    controls: await page.getAttribute('#srv .bselect-trigger', 'aria-controls'),
    listbox: await cnt('#srv [role=listbox]'),
  };
  // scroll down: hint hides, rows grow; scroll up: hint returns
  await page.evaluate(() => { const w = document.querySelector('#srv .bselect-list-wrap'); w.scrollTop = 200; });
  await page.waitForTimeout(150);
  o.hintAfterDown = await vis('#srv .bselect-lazy-hint');
  await page.evaluate(() => { const w = document.querySelector('#srv .bselect-list-wrap'); w.scrollTop = w.scrollHeight; });
  await page.waitForTimeout(600);
  o.rowsAfterScroll = await cnt('#srv .bselect-list > .bselect-item');
  // scroll to the very end repeatedly -> end message
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => { const w = document.querySelector('#srv .bselect-list-wrap'); w.scrollTop = w.scrollHeight; });
    await page.waitForTimeout(400);
  }
  o.rowsEnd = await cnt('#srv .bselect-list > .bselect-item');
  o.endMessage = await vis('#srv .bselect-pagination-end');
  // search with results header and total
  await page.fill('#srv .bselect-search input', 'Item 9');
  await page.waitForTimeout(800);
  o.resultsHeader = (await page.locator('#srv .bselect-results-header').innerText()).replace(/\n/g, ' ');
  o.searchClear = await vis('#srv .bselect-search-clear');
  await page.click('#srv .bselect-search-clear');
  await page.waitForTimeout(800);
  o.afterClear = await cnt('#srv .bselect-list > .bselect-item');
  // PageDown / Home movement
  await page.focus('#srv .bselect-search input');
  await page.keyboard.press('PageDown');
  o.pageDownActive = await page.locator('#srv .bselect-focused').getAttribute('data-i');
  o.activeDescendant = await page.getAttribute('#srv .bselect-search input', 'aria-activedescendant');
  await page.mouse.click(2, 2);

  // 2. min search characters
  await page.click('#min .bselect-trigger');
  await page.fill('#min .bselect-search input', 'I');
  await page.waitForTimeout(500);
  o.minMessage = await page.locator('#min .bselect-empty').first().innerText();
  await page.mouse.click(2, 2);

  // 3. error + retry
  await page.click('#bad .bselect-trigger');
  await page.waitForSelector('#bad .bselect-error button');
  o.errorText = await page.locator('#bad .bselect-error span').innerText();
  o.retryButton = await cnt('#bad .bselect-error button');
  await page.mouse.click(2, 2);

  // 4. load on click (button) shows the original pagination button
  await page.click('#btn .bselect-trigger');
  await page.waitForSelector('#btn .bselect-item');
  o.btnLabel = (await page.locator('#btn .bselect-load-more button').innerText()).replace(/\n/g, ' | ');
  await page.click('#btn .bselect-load-more button');
  await page.waitForTimeout(600);
  o.btnRows = await cnt('#btn .bselect-list > .bselect-item');
  await page.mouse.click(2, 2);

  // 5. settings popup structure (two sections like the original)
  await page.click('#set .bselect-trigger');
  await page.click('#set .bselect-settings-action');
  o.tabs = await page.locator('#set .bselect-tab').allInnerTexts();
  o.autosave = await cnt('#set .bselect-autosave-dot');
  o.pills = await cnt('#set .bselect-pane-active .bselect-pill');
  o.segmented = await cnt('#set .bselect-pane-active .bselect-seg');
  await page.click('#set .bselect-tab >> nth=1');
  o.lookSwatches = await cnt('#set .bselect-pane-active .bselect-pillatch');
  await page.mouse.click(2, 2); // closes the drawer
  await page.mouse.click(2, 2); // closes the dropdown

  // 6. disabled rows via isOptionDisabled
  await page.click('#dis .bselect-trigger');
  o.disabledRows = await cnt('#dis .bselect-disabled-item');
  o.placeholderNoun = await page.locator('#dis .bselect-search-placeholder').innerText();
  return o;
}
