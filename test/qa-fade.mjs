// the list fades out at the top / bottom edge only where there is more to scroll (light and dark), and can be switched off / resized from the gear
export default async function run(page) {
  await page.setViewportSize({ width: 900, height: 700 });
  const o = {};
  const fade = (i) => page.evaluate((i) => { const w = document.querySelectorAll('.bselect-list-wrap')[0]; const cs = getComputedStyle(w); return { top: w.style.getPropertyValue('--bselect-fade-t'), bottom: w.style.getPropertyValue('--bselect-fade-b'), mask: (cs.maskImage || cs.webkitMaskImage || '') !== 'none' && (cs.maskImage || cs.webkitMaskImage || '') !== '' }; }, i);
  for (const [i, name] of [[0, 'light'], [1, 'dark']]) {
    await page.click('.bselect-trigger >> nth=' + i); await page.waitForTimeout(300);
    o[name + 'Start'] = await fade();                       // at the top: no top fade, bottom fade on
    await page.locator('.bselect-list-wrap').evaluate((w) => { w.scrollTop = 150; }); await page.waitForTimeout(150);
    o[name + 'Middle'] = await fade();                      // both
    await page.locator('.bselect-list-wrap').evaluate((w) => { w.scrollTop = w.scrollHeight; }); await page.waitForTimeout(150);
    o[name + 'End'] = await fade();                         // top only
    await page.mouse.click(2, 2); await page.waitForTimeout(200);
  }
  // gear: switch the fade off, then set the size
  await page.click('.bselect-trigger >> nth=0'); await page.waitForTimeout(300);
  await page.click('.bselect-settings-action'); await page.waitForTimeout(500);
  const S = '.bselect-settings';
  await page.click(S + ' .bselect-tab[title="Dropdown"]'); await page.waitForTimeout(400);
  await page.locator('.bselect-list-wrap').evaluate((w) => { w.scrollTop = 150; });
  await page.click(S + ' .bselect-pane-active [data-key="scrollFade"]'); await page.waitForTimeout(300);
  o.off = await fade();
  await page.click(S + ' .bselect-pane-active [data-key="scrollFade"]'); await page.waitForTimeout(300);
  const num = page.locator(S + ' .bselect-pane-active [data-key="fadeSize"] input'); await num.fill('30'); await num.dispatchEvent('input'); await page.waitForTimeout(300);
  await page.locator('.bselect-list-wrap').evaluate((w) => { w.scrollTop = 150; }); await page.waitForTimeout(200);
  o.size30 = await fade();
  const z = (v) => v === '0px';
  for (const n of ['light', 'dark']) {
    if (!z(o[n + 'Start'].top) || z(o[n + 'Start'].bottom) || !o[n + 'Start'].mask) throw new Error(n + ' start ' + JSON.stringify(o[n + 'Start']));
    if (z(o[n + 'Middle'].top) || z(o[n + 'Middle'].bottom)) throw new Error(n + ' middle ' + JSON.stringify(o[n + 'Middle']));
    if (z(o[n + 'End'].top) || !z(o[n + 'End'].bottom)) throw new Error(n + ' end ' + JSON.stringify(o[n + 'End']));
  }
  if (!z(o.off.top) || !z(o.off.bottom) || o.off.mask) throw new Error('off ' + JSON.stringify(o.off));
  if (o.size30.top !== '30px') throw new Error('size ' + JSON.stringify(o.size30));
  return o;
}
