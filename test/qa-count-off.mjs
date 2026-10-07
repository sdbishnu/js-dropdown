// the Count switch really switches the count line off (and on again) in every layout: top, bottom, merged with Apply / Cancel
export default async function run(page) {
  await page.setViewportSize({ width: 1000, height: 800 });
  const o = {};
  const state = () => page.evaluate(() => { const p = document.querySelector('.bselect-panel'); return { infobars: p.querySelectorAll('.bselect-infobar').length, footer: !!p.querySelector('.bselect-footer'), merged: !!p.querySelector('.bselect-footer-merged'), text: [...p.querySelectorAll('.bselect-infobar')].map((e) => e.textContent).join('') }; });
  const fails = [];
  for (const [i, name] of [[0, 'single-top'], [1, 'single-bottom'], [2, 'merged'], [3, 'top+commit']]) {
    await page.mouse.click(2, 2); await page.waitForTimeout(200);
    await page.click('.bselect-trigger >> nth=' + i); await page.waitForTimeout(300);
    const before = await state();
    await page.click('.bselect-settings-action'); await page.waitForTimeout(450);
    await page.click('.bselect-settings .bselect-tab[title="Behavior"]'); await page.waitForTimeout(300);
    const sw = '.bselect-settings .bselect-pane-active [data-key="info"]';
    await page.click(sw); await page.waitForTimeout(450);
    const off = await state();
    await page.click(sw); await page.waitForTimeout(450);
    const on = await state();
    o[name] = { before: before.infobars, off: off.infobars, on: on.infobars, mergedOff: off.merged, mergedOn: on.merged, footerOff: off.footer };
    if (before.infobars !== 1 || off.infobars !== 0 || on.infobars !== 1 || !/1.20 of 100/.test(on.text)) fails.push(name);
  }
  if (o.merged.mergedOff || !o.merged.footerOff || !o.merged.mergedOn) fails.push('merged footer');
  if (fails.length) throw new Error('count switch ' + fails.join() + ' ' + JSON.stringify(o));
  return o;
}
