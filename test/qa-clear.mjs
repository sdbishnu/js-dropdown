// clear icons (button and search box) are drawn centred, line up with the field, and still work
export default async function run(page) {
  await page.setViewportSize({ width: 900, height: 600 });
  const o = {};
  const t = '.bselect-trigger >> nth=2';
  await page.click(t); await page.waitForTimeout(300);
  await page.locator('.bselect-panel .bselect-item').nth(2).click(); await page.waitForTimeout(250);
  o.btn = await page.evaluate(() => {
    const trig = document.querySelectorAll('.bselect-trigger')[2]; const c = trig.querySelector('.bselect-clear'); const s = c.querySelector('svg');
    const r = (e) => e.getBoundingClientRect(); const cx = (e) => r(e).left + r(e).width / 2, cy = (e) => r(e).top + r(e).height / 2;
    return { iconDx: +(cx(s) - cx(c)).toFixed(2), iconDy: +(cy(s) - cy(c)).toFixed(2), rowDy: +(cy(c) - cy(trig)).toFixed(2), size: Math.round(r(c).width) + 'x' + Math.round(r(c).height), shown: getComputedStyle(c).display };
  });
  // search clear
  await page.click(t); await page.waitForTimeout(300);
  await page.fill('.bselect-panel input', 'it'); await page.waitForTimeout(200);
  o.search = await page.evaluate(() => {
    const box = document.querySelector('.bselect-panel .bselect-search input'); const c = document.querySelector('.bselect-panel .bselect-search-clear'); const s = c.querySelector('svg');
    const r = (e) => e.getBoundingClientRect(); const cx = (e) => r(e).left + r(e).width / 2, cy = (e) => r(e).top + r(e).height / 2;
    return { iconDx: +(cx(s) - cx(c)).toFixed(2), iconDy: +(cy(s) - cy(c)).toFixed(2), rowDy: +(cy(c) - cy(box)).toFixed(2) };
  });
  await page.click('.bselect-panel .bselect-search-clear'); await page.waitForTimeout(150);
  o.searchCleared = await page.locator('.bselect-panel input').inputValue();
  await page.mouse.click(2, 2); await page.waitForTimeout(200);
  // clearing the value with the button
  await page.locator('.bselect-clear').nth(2).click(); await page.waitForTimeout(250);
  o.valueAfter = await page.locator('.bselect-trigger').nth(2).innerText();
  const ok = (b) => Math.abs(b.iconDx) <= 0.6 && Math.abs(b.iconDy) <= 0.6 && Math.abs(b.rowDy) <= 1;
  if (!ok(o.btn)) throw new Error('button clear off-centre ' + JSON.stringify(o.btn));
  if (!ok(o.search) || o.searchCleared !== '') throw new Error('search clear ' + JSON.stringify(o));
  if (!/Select/.test(o.valueAfter)) throw new Error('clear did not clear ' + JSON.stringify(o));
  return o;
}
