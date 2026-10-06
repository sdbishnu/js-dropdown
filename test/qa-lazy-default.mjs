// default lazy load: node <browser-automation>/browser.mjs http://localhost:8765/test/lazy-default.html --script test/qa-lazy-default.mjs
export default async function run(page) {
  const o = {};
  await page.setViewportSize({ width: 900, height: 760 });
  const rows = (id) => page.locator('#' + id + ' [role=listbox] > .bselect-item').count();
  const toEnd = async (id, times = 12) => { for (let i = 0; i < times; i++) { await page.evaluate((s) => { const w = document.querySelector(s + ' .bselect-list-wrap'); if (w) w.scrollTop = w.scrollHeight; }, '#' + id); await page.waitForTimeout(220); } };
  for (const id of ['loc', 'nopage', 'page', 'all']) {
    await page.click('#' + id + ' .bselect-trigger');
    await page.waitForSelector('#' + id + ' .bselect-item');
    const first = await rows(id);
    const hint = await page.locator('#' + id + ' .bselect-lazy-hint').isVisible().catch(() => false);
    await toEnd(id);
    const last = await rows(id);
    const labels = await page.locator('#' + id + ' [role=listbox] .bselect-item-label').allInnerTexts();
    o[id] = { first, hint, afterScroll: last, duplicates: labels.length - new Set(labels).size, endMarker: await page.locator('#' + id + ' .bselect-pagination-end').isVisible().catch(() => false) };
    await page.mouse.click(2, 2);
  }
  // search while only the first page is loaded (local): finds rows beyond the drawn ones
  await page.click('#loc .bselect-trigger');
  await page.fill('#loc .bselect-search input', 'Option 9');
  await page.waitForTimeout(300);
  o.searchLocal = (await page.locator('#loc [role=listbox] .bselect-item-label').allInnerTexts()).slice(0, 3);
  await page.fill('#loc .bselect-search input', '');
  // keyboard End jumps past the drawn rows
  await page.focus('#loc .bselect-search input');
  await page.keyboard.press('ArrowDown');
  await page.focus('#loc .bselect-trigger');
  await page.keyboard.press('End');
  await page.waitForTimeout(250);
  o.keyboardEnd = await page.locator('#loc .bselect-focused .bselect-item-label').innerText().catch(() => 'none');
  return o;
}
