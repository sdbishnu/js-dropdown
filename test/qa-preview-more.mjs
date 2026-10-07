// "+ N more" in the hover preview opens every value in a scrollable list; "Show less" goes back (all styles)
export default async function run(page) {
  await page.setViewportSize({ width: 1000, height: 800 });
  const o = {};
  const T = (i) => page.locator('.bselect-trigger >> nth=' + i);
  const pv = () => page.locator('.bselect-pv');
  const items = () => pv().locator('.bselect-pv-row, .bselect-pv-chip:not(.bselect-pv-chip-more), .bselect-pv-ol li, .bselect-pv-tr').count();
  // card
  await T(0).hover(); await page.waitForSelector('.bselect-pv', { timeout: 4000 });
  o.before = await items();
  await pv().hover(); await pv().locator('.bselect-pv-more').first().click(); await page.waitForTimeout(250);
  o.after = await items();
  o.stillOpen = await pv().count();
  o.scroll = await pv().locator('.bselect-pv-body').evaluate((b) => { const can = b.scrollHeight > b.clientHeight + 4; b.scrollTop = b.scrollHeight; return { can, atEnd: Math.abs(b.scrollTop + b.clientHeight - b.scrollHeight) < 3 }; });
  o.lastVisible = await pv().locator('.bselect-pv-row').last().innerText();
  o.less = await pv().locator('.bselect-pv-less').count();
  await pv().locator('.bselect-pv-less').click(); await page.waitForTimeout(250);
  o.backTo = await items();
  // the other styles through the gear (the demo preview stays interactive on its "+ N more")
  await page.mouse.move(2, 2); await page.waitForTimeout(250);
  await T(0).click(); await page.waitForTimeout(300);
  await page.click('.bselect-settings-action'); await page.waitForTimeout(500);
  await page.click('.bselect-settings .bselect-tab[title="Button"]'); await page.waitForTimeout(400);
  o.styles = {};
  for (const [label, key] of [['Chips', 'chips'], ['List', 'list'], ['Details', 'details'], ['Tip', 'tooltip']]) {
    await page.click('.bselect-settings .bselect-pane-active [data-key="previewStyle"] .bselect-seg button:text-is("' + label + '")'); await page.waitForTimeout(350);
    const b = key === 'tooltip' ? pv().locator('.bselect-pv-more') : pv().locator('.bselect-pv-more, .bselect-pv-chip-more');
    const n0 = key === 'tooltip' ? ((await pv().innerText()).split('·').length) : await items();
    await b.first().click(); await page.waitForTimeout(250);
    const n1 = key === 'tooltip' ? ((await pv().innerText()).split('·').length) : await items();
    o.styles[key] = { n0, n1 };
  }
  await page.waitForTimeout(4200);   // longer than the demo time: an opened list must stay
  o.stays = await pv().count();
  if (o.before !== 8 || o.after !== 12 || o.stillOpen !== 1) throw new Error('card expand ' + JSON.stringify(o));
  if (!o.scroll.can || !o.scroll.atEnd || !/12/.test(o.lastVisible) || o.less !== 1 || o.backTo !== 8) throw new Error('scroll / less ' + JSON.stringify(o));
  for (const k of ['chips', 'list', 'details', 'tooltip']) if (!(o.styles[k].n1 > o.styles[k].n0)) throw new Error(k + ' ' + JSON.stringify(o.styles));
  if (o.stays !== 1) throw new Error('opened list closed by the demo timer ' + JSON.stringify(o));
  return o;
}
