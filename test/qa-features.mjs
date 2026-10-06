export default async function run(page) {
  const o = {};
  const items = (s) => page.locator(s + ' .bselect-list > .bselect-item').count();
  // 1 server lazy
  await page.click('#srv .bselect-trigger');
  await page.waitForSelector('#srv .bselect-item');
  o.srvFirst = await items('#srv');
  o.groups = await page.locator('#srv .bselect-group').count();
  o.sub = await page.locator('#srv .bselect-item-sub').first().innerText();
  await page.evaluate(() => { const w = document.querySelector('#srv .bselect-list-wrap'); w.scrollTop = w.scrollHeight; });
  await page.waitForTimeout(600);
  o.srvAfterScroll = await items('#srv');
  await page.fill('#srv .bselect-search input', 'Item 9');
  await page.waitForTimeout(700);
  o.srvSearch = await items('#srv');
  await page.fill('#srv .bselect-search input', '');
  await page.waitForTimeout(600);
  await page.click('#srv .bselect-action');   // server sort -> desc
  await page.waitForTimeout(500);
  o.srvSortFirst = (await page.locator('#srv .bselect-list > .bselect-item').first().innerText()).split('\n')[0];
  o.events = await page.evaluate(() => document.documentElement.dataset.events);
  await page.mouse.click(5, 5);
  // 2 resolve
  o.resolved = await page.locator('#res .bselect-trigger-label').innerText();
  // 3 cascade
  o.wardDisabled = await page.locator('#ward + .bselect .bselect-trigger').isDisabled();
  o.wardLabel = await page.locator('#ward + .bselect .bselect-trigger-label').innerText();
  await page.click('#dept + .bselect .bselect-trigger');
  await page.click('#dept + .bselect .bselect-list > .bselect-item:nth-child(1)');
  o.wardEnabled = !(await page.locator('#ward + .bselect .bselect-trigger').isDisabled());
  await page.click('#ward + .bselect .bselect-trigger');
  await page.waitForSelector('#ward + .bselect .bselect-item');
  o.wards1 = await page.locator('#ward + .bselect .bselect-item-label').allInnerTexts();
  await page.click('#ward + .bselect .bselect-list > .bselect-item:nth-child(1)');
  await page.click('#dept + .bselect .bselect-trigger');
  await page.click('#dept + .bselect .bselect-list > .bselect-item:nth-child(2)');
  o.wardAfterParentChange = await page.locator('#ward + .bselect .bselect-trigger-label').innerText();
  o.wardValue = await page.evaluate(() => document.querySelector('#ward').value);
  await page.click('#ward + .bselect .bselect-trigger');
  await page.waitForSelector('#ward + .bselect .bselect-item');
  o.wards2 = await page.locator('#ward + .bselect .bselect-item-label').allInnerTexts();
  await page.mouse.click(5, 5);
  // 4 validation + min/max + submit block
  await page.click('#submit');
  o.submittedEmpty = await page.evaluate(() => !!document.documentElement.dataset.submitted);
  o.errorEmpty = await page.locator('#req + .bselect .bselect-error-text, #req .bselect-error-text').first().innerText();
  await page.click('#req .bselect-trigger');
  for (const n of [1, 2, 3, 4]) await page.click('#req .bselect-list > .bselect-item:nth-child(' + n + ')');
  o.reqLabel = await page.locator('#req .bselect-trigger-label').innerText();
  o.maxMsg = await page.locator('#req .bselect-error-text').allInnerTexts();
  await page.mouse.click(5, 5);
  await page.click('#submit');
  o.submittedOk = await page.evaluate(() => !!document.documentElement.dataset.submitted);
  // 5 creatable
  await page.click('#tags .bselect-trigger');
  await page.fill('#tags .bselect-search input', 'blue');
  o.createRow = await page.locator('#tags .bselect-create').count();
  await page.press('#tags .bselect-search input', 'ArrowDown');
  await page.press('#tags .bselect-search input', 'Enter');
  o.tagsLabel = await page.locator('#tags .bselect-trigger-label').innerText();
  await page.mouse.click(5, 5);
  // 6 load more button
  await page.click('#more .bselect-trigger');
  await page.waitForSelector('#more .bselect-item');
  o.more1 = await items('#more');
  o.moreBtn = await page.locator('#more .bselect-load-more button').isVisible();
  await page.click('#more .bselect-load-more button');
  await page.waitForTimeout(500);
  o.more2 = await items('#more');
  await page.mouse.click(5, 5);
  // 7 dark + keyboard
  o.dark = await page.locator('#dark .bselect-dark, #dark.bselect-dark, .bselect-dark').count();
  await page.focus('#srv .bselect-trigger');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  o.endFocused = await page.locator('#srv .bselect-focused').count();
  return o;
}
