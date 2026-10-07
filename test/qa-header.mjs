// search / sort / gear share one shape and height, follow shape + size changes made in the gear, and keep working after every change
export default async function run(page) {
  await page.setViewportSize({ width: 1000, height: 760 });
  const o = {};
  const geo = () => page.evaluate(() => {
    const p = document.querySelector('.bselect-panel'); const q = (s) => p.querySelector(s);
    const r = (e) => e ? getComputedStyle(e).borderTopLeftRadius + '|' + Math.round(e.getBoundingClientRect().height) : null;
    return { search: r(q('.bselect-search input')), sort: r(q('.bselect-action:not(.bselect-settings-action)')), gear: r(q('.bselect-settings-action')), panel: getComputedStyle(p).borderTopLeftRadius, first: (q('.bselect-item') || {}).textContent };
  });
  const same = (g) => g.sort && g.search === g.sort && g.search === g.gear;
  await page.click('.bselect-trigger >> nth=0'); await page.waitForTimeout(300);
  o.square = await geo();
  // sort works
  await page.click('.bselect-action:not(.bselect-settings-action)'); await page.waitForTimeout(250);
  o.sortedDesc = (await geo()).first;
  // change the shape in the gear (Dropdown tab -> Shape -> Pill)
  await page.click('.bselect-settings-action'); await page.waitForTimeout(500);
  const S = '.bselect-settings';
  await page.click(S + ' .bselect-tab[title="Dropdown"]'); await page.waitForTimeout(350);
  await page.click(S + ' .bselect-pane-active .bselect-rowc:has(.bselect-rowc-label:text-is("Shape")) button:text-is("Pill")'); await page.waitForTimeout(450);
  o.pill = await geo();
  o.popupRadius = await page.locator(S).evaluate((e) => getComputedStyle(e).borderTopLeftRadius);
  o.popupOpen = await page.locator(S).count();
  // sort still works after the rebuild
  await page.click('.bselect-action:not(.bselect-settings-action)'); await page.waitForTimeout(250);
  o.sortedAsc = (await geo()).first;
  // size L in the Button tab
  await page.click(S + ' .bselect-tab[title="Button"]'); await page.waitForTimeout(350);
  await page.click(S + ' .bselect-pane-active .bselect-seg button:text-is("L")'); await page.waitForTimeout(450);
  o.large = await geo();
  // sort off / on in Behavior
  await page.click(S + ' .bselect-tab[title="Behavior"]'); await page.waitForTimeout(350);
  await page.click(S + ' .bselect-pane-active .bselect-pill:has-text("Sort")'); await page.waitForTimeout(400);
  o.sortOff = (await geo()).sort;
  await page.click(S + ' .bselect-pane-active .bselect-pill:has-text("Sort")'); await page.waitForTimeout(400);
  o.sortOn = await geo();
  await page.click('.bselect-action:not(.bselect-settings-action)'); await page.waitForTimeout(250);
  o.sortAfterToggle = (await geo()).first;
  // search off / on
  await page.click(S + ' .bselect-pane-active .bselect-pill:has-text("Search")'); await page.waitForTimeout(400);
  o.searchOff = await page.locator('.bselect-panel .bselect-search input').count();
  await page.click(S + ' .bselect-pane-active .bselect-pill:has-text("Search")'); await page.waitForTimeout(400);
  o.searchOn = await geo();
  if (!same(o.square) || o.square.search.split('|')[0] !== '2.1px') throw new Error('square ' + JSON.stringify(o.square));
  if (o.sortedDesc !== 'Item 30') throw new Error('sort desc ' + o.sortedDesc);
  if (!same(o.pill) || parseFloat(o.pill.search) < 8 || o.popupOpen !== 1) throw new Error('pill ' + JSON.stringify(o));
  if (o.sortedAsc !== 'Item 1') throw new Error('sort asc after rebuild ' + o.sortedAsc);
  if (!same(o.large) || !/\|36$/.test(o.large.search)) throw new Error('large ' + JSON.stringify(o.large));
  if (o.sortOff !== null || !same(o.sortOn) || o.sortAfterToggle !== 'Item 30') throw new Error('sort toggle ' + JSON.stringify(o));
  if (o.searchOff !== 0 || !same(o.searchOn)) throw new Error('search toggle ' + JSON.stringify(o));
  return o;
}
