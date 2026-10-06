// Shift+click range, Shift+arrows, Ctrl+A, paste a list of ids / names
export default async function run(page) {
  const o = {};
  await page.click('.bselect-trigger >> nth=0'); await page.waitForTimeout(300);
  const rows = page.locator('.bselect-panel .bselect-item');
  const count = () => page.locator('.bselect-panel .bselect-checked').count();
  await rows.nth(1).click();
  await rows.nth(5).click({ modifiers: ['Shift'] }); await page.waitForTimeout(150);
  o.shiftClick = await count();            // rows 2..6 = 5
  // clear, then keyboard range
  await page.locator('.bselect-viewtab').nth(1).click(); await page.click('.bselect-viewaction'); await page.waitForTimeout(150);
  await page.locator('.bselect-viewtab').nth(0).click(); await page.waitForTimeout(150);
  await rows.nth(0).click();                // anchor = row 1
  await page.locator('.bselect-panel input').first().focus();
  await page.keyboard.press('Shift+ArrowDown'); await page.keyboard.press('Shift+ArrowDown'); await page.keyboard.press('Shift+ArrowDown'); await page.waitForTimeout(150);
  o.shiftArrows = await count();
  // clear, Ctrl+A
  await page.locator('.bselect-viewtab').nth(1).click(); await page.click('.bselect-viewaction'); await page.waitForTimeout(150);
  await page.locator('.bselect-viewtab').nth(0).click(); await page.waitForTimeout(150);
  await page.locator('.bselect-panel input').first().focus();
  await page.keyboard.press('Control+a'); await page.waitForTimeout(200);
  o.ctrlA = (await page.locator('.bselect-viewtab').nth(1).textContent());
  // paste
  await page.locator('.bselect-viewtab').nth(1).click(); await page.click('.bselect-viewaction'); await page.waitForTimeout(150);
  await page.locator('.bselect-viewtab').nth(0).click(); await page.waitForTimeout(150);
  await page.locator('.bselect-panel input').first().evaluate((input) => {
    const dt = new DataTransfer(); dt.setData('text', '3, 4\nItem 10; nope\n999');
    input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(250);
  o.paste = await page.locator('.bselect-viewtab').nth(1).textContent();
  o.note = await page.locator('.bselect-note').textContent();
  if (o.shiftClick !== 5) throw new Error('shift click ' + JSON.stringify(o));
  if (o.shiftArrows !== 3) throw new Error('shift arrows ' + JSON.stringify(o));
  if (!/100/.test(o.ctrlA)) throw new Error('ctrl+a ' + JSON.stringify(o));
  if (!/\(3\)/.test(o.paste) || !/3 selected/.test(o.note) || !/2 not found: nope, 999/.test(o.note)) throw new Error('paste ' + JSON.stringify(o));
  return o;
}
