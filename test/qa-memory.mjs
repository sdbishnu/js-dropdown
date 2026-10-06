// recent picks + favourites: node <browser-automation>/browser.mjs http://localhost:8765/test/memory.html --script test/qa-memory.mjs
export default async function run(page) {
  const o = {};
  await page.setViewportSize({ width: 800, height: 760 });
  await page.evaluate(() => { localStorage.removeItem('bselect:mem:mem-test-1'); localStorage.removeItem('bselect:mem:mem-test-2'); });
  await page.reload();
  await page.waitForTimeout(300);
  const labels = (id, n) => page.locator('#' + id + ' [role=listbox] .bselect-item-label').evaluateAll((els, k) => els.slice(0, k).map((e) => e.textContent), n);
  const groups = (id) => page.locator('#' + id + ' [role=listbox] .bselect-group').allInnerTexts();
  const pickRow = async (id, text) => { await page.click('#' + id + ' .bselect-trigger'); await page.waitForSelector('#' + id + ' .bselect-item'); await page.locator('#' + id + ' [role=listbox] .bselect-item:has(.bselect-item-label:text-is("' + text + '"))').first().click(); await page.waitForTimeout(150); };
  await pickRow('m1', 'Item 7');
  await pickRow('m1', 'Item 12');
  await pickRow('m1', 'Item 3');
  await page.click('#m1 .bselect-trigger');
  await page.waitForSelector('#m1 .bselect-item');
  o.recentOrder = { groups: await groups('m1'), top: await labels('m1', 5) };
  // star Item 20 (hover star) -> Favourites on top, picking is not triggered
  const row20 = page.locator('#m1 [role=listbox] .bselect-item:has(.bselect-item-label:text-is("Item 20"))').first();
  await row20.hover();
  await row20.locator('.bselect-star').click();
  await page.waitForTimeout(150);
  o.afterStar = { groups: await groups('m1'), top: await labels('m1', 5), triggerStill: await page.locator('#m1 .bselect-trigger-label').innerText(), stillOpen: await page.locator('#m1 .bselect-panel').count() };
  o.live = await page.locator('#m1 .bselect-sr').innerText().catch(() => '');
  // search turns the sections off
  await page.fill('#m1 .bselect-search input', 'Item 2');
  await page.waitForTimeout(300);
  o.search = { groups: await groups('m1'), first: await labels('m1', 3) };
  await page.fill('#m1 .bselect-search input', '');
  await page.mouse.click(2, 2);
  // stored in the browser
  o.stored = JSON.parse(await page.evaluate(() => localStorage.getItem('bselect:mem:mem-test-1')));
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#m1 .bselect-trigger');
  await page.waitForSelector('#m1 .bselect-item');
  o.afterReload = { groups: await groups('m1'), top: await labels('m1', 4) };
  // un-star
  const row20b = page.locator('#m1 [role=listbox] .bselect-item:has(.bselect-item-label:text-is("Item 20"))').first();
  await row20b.hover();
  await row20b.locator('.bselect-star').click();
  await page.waitForTimeout(150);
  o.afterUnstar = { groups: await groups('m1') };
  await page.mouse.click(2, 2);
  // multiple dropdown: only recent
  await pickRow('m2', 'Item 9');
  await page.locator('#m2 [role=listbox] .bselect-item:has(.bselect-item-label:text-is("Item 15"))').first().click();
  await page.mouse.click(2, 2);
  await page.click('#m2 .bselect-trigger');
  o.m2 = { groups: await groups('m2'), top: await labels('m2', 3), starButtons: await page.locator('#m2 .bselect-star').count() };
  return o;
}
