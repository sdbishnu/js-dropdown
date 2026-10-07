// Count at the bottom + Apply / Cancel = one bar: count on the left, buttons on the right; separate again when either is off
export default async function run(page) {
  await page.setViewportSize({ width: 1000, height: 760 });
  const o = {};
  const geo = () => page.evaluate(() => {
    const p = document.querySelector('.bselect-panel'); const f = p.querySelector('.bselect-footer'); const info = p.querySelector('.bselect-infobar');
    if (!f) return { footer: false };
    const a = p.querySelector('.bselect-footer-apply').getBoundingClientRect(); const c = info ? info.getBoundingClientRect() : null;
    return { footer: true, merged: f.classList.contains('bselect-footer-merged'), infoInFooter: !!(info && f.contains(info)), infoText: info ? info.textContent : null, infoLeftOfButtons: c ? c.right <= a.left : null, sameRow: c ? Math.abs((c.top + c.height / 2) - (a.top + a.height / 2)) < 4 : null, infoOutside: [...p.querySelectorAll('.bselect-infobar')].filter((e) => !f.contains(e)).length, dot: !!p.querySelector('.bselect-footer-dot'), radius: getComputedStyle(f).borderBottomLeftRadius, panelRadius: getComputedStyle(p).borderBottomLeftRadius };
  });
  await page.click('.bselect-trigger >> nth=0'); await page.waitForTimeout(300);
  o.merged = await geo();
  await page.locator('.bselect-panel .bselect-item').first().click(); await page.waitForTimeout(150);
  o.afterPick = await geo();
  await page.click('.bselect-footer-apply'); await page.waitForTimeout(250);
  // second dropdown: count at the top + commit -> not merged
  await page.click('.bselect-trigger >> nth=1'); await page.waitForTimeout(300);
  o.topCount = await geo();
  await page.click('.bselect-settings-action'); await page.waitForTimeout(500);
  const S = '.bselect-settings';
  await page.click(S + ' .bselect-tab[title="List"]'); await page.waitForTimeout(350);
  await page.click(S + ' .bselect-pane-active [data-key="infoPlace"] .bselect-seg button:text-is("Bottom")'); await page.waitForTimeout(450);
  o.gearBottom = await geo();
  await page.click(S + ' .bselect-tab[title="Behavior"]'); await page.waitForTimeout(350);
  await page.click(S + ' .bselect-pane-active [data-key="commit"]'); await page.waitForTimeout(450);   // commit off -> separate bottom count again
  o.commitOff = await page.evaluate(() => { const p = document.querySelector('.bselect-panel'); const i = p.querySelector('.bselect-infobar'); return { footer: !!p.querySelector('.bselect-footer'), infoBottom: !!i && i.classList.contains('bselect-info-bottom') }; });
  if (!o.merged.merged || !o.merged.infoInFooter || !o.merged.infoLeftOfButtons || !o.merged.sameRow || o.merged.infoOutside !== 0 || !/1.20 of 100/.test(o.merged.infoText)) throw new Error('merged ' + JSON.stringify(o.merged));
  if (o.merged.radius !== o.merged.panelRadius) throw new Error('bar radius ' + JSON.stringify(o.merged));
  if (o.merged.dot || !o.afterPick.dot) throw new Error('pending dot ' + JSON.stringify(o));
  if (o.topCount.merged || o.topCount.infoInFooter) throw new Error('top count must not merge ' + JSON.stringify(o.topCount));
  if (!o.gearBottom.merged || !o.gearBottom.infoInFooter) throw new Error('gear bottom should merge ' + JSON.stringify(o.gearBottom));
  if (o.commitOff.footer || !o.commitOff.infoBottom) throw new Error('commit off ' + JSON.stringify(o.commitOff));
  return o;
}
