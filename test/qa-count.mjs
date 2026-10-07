// count line: top / bottom, left / centre / right - from options and live from the settings gear
export default async function run(page) {
  await page.setViewportSize({ width: 1000, height: 760 });
  const o = {};
  const info = () => page.evaluate(() => {
    const p = document.querySelector('.bselect-panel'); const el = p.querySelector('.bselect-infobar'); if (!el) return null;
    const kids = [...p.children]; const wrap = p.querySelector('.bselect-list-wrap');
    return { text: el.textContent, align: getComputedStyle(el).textAlign, below: kids.indexOf(el) > kids.indexOf(wrap) };
  });
  // a: defaults -> top, right
  await page.click('.bselect-trigger >> nth=0'); await page.waitForTimeout(300);
  o.a = await info();
  // compact: the count sits right under the search box (small gap, no separator line between them)
  o.gap = await page.evaluate(() => { const p = document.querySelector('.bselect-panel'); const s = p.querySelector('.bselect-search input').getBoundingClientRect(); const i = p.querySelector('.bselect-infobar').getBoundingClientRect(); return { gap: Math.round(i.top - s.bottom), height: Math.round(i.height) }; });
  if (o.gap.gap > 6 || o.gap.height > 24) throw new Error('count line not compact ' + JSON.stringify(o.gap));
  // change live from the gear
  await page.click('.bselect-settings-action'); await page.waitForTimeout(500);
  const S = '.bselect-settings';
  await page.click(S + ' .bselect-tab[title="List"]'); await page.waitForTimeout(350);
  await page.click(S + ' .bselect-pane-active .bselect-seg button:text-is("Bottom")'); await page.waitForTimeout(350);
  o.aBottom = await info();
  await page.click(S + ' .bselect-pane-active .bselect-seg button:text-is("Centre")'); await page.waitForTimeout(250);
  o.aCentre = await info();
  await page.click(S + ' .bselect-pane-active .bselect-seg button:text-is("Left")'); await page.waitForTimeout(250);
  o.aLeft = await info();
  await page.click(S + ' .bselect-pane-active .bselect-seg button:text-is("Top")'); await page.waitForTimeout(350);
  o.aTop = await info();
  // count switch off in Behavior
  await page.click(S + ' .bselect-tab[title="Behavior"]'); await page.waitForTimeout(300);
  await page.click(S + ' .bselect-pane-active .bselect-pill:has-text("Count")'); await page.waitForTimeout(300);
  o.aOff = await info();
  await page.mouse.click(2, 2); await page.waitForTimeout(200);
  // b: from options
  await page.click('.bselect-trigger >> nth=1'); await page.waitForTimeout(300);
  o.b = await info();
  await page.mouse.click(2, 2); await page.waitForTimeout(200);
  // c: no count
  await page.click('.bselect-trigger >> nth=2'); await page.waitForTimeout(300);
  o.c = await info();
  if (!o.a || o.a.below || o.a.align !== 'right' || !/1.20 of 100/.test(o.a.text)) throw new Error('default ' + JSON.stringify(o));
  if (!o.aBottom || !o.aBottom.below) throw new Error('gear bottom ' + JSON.stringify(o));
  if (o.aCentre.align !== 'center' || o.aLeft.align !== 'left' || o.aTop.below) throw new Error('gear align / top ' + JSON.stringify(o));
  if (o.aOff !== null) throw new Error('count switch ' + JSON.stringify(o));
  if (!o.b || !o.b.below || o.b.align !== 'left') throw new Error('options ' + JSON.stringify(o));
  if (o.c !== null) throw new Error('c should have none ' + JSON.stringify(o));
  return o;
}
