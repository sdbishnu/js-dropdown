// node <browser-automation>/browser.mjs http://localhost:8765/test/appearance.html --script test/qa-appearance.mjs
export default async function run(page) {
  const o = {};
  const css = (sel, prop) => page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s))[p], [sel, prop]);
  const h = async (id) => Math.round((await page.locator(id + ' .bselect-trigger').boundingBox()).height);
  const rows = (id) => page.locator(id + ' .bselect-list > .bselect-item').count();
  o.heights = { sm: await h('#sm'), md: await h('#sq'), lg: await h('#lg') };
  o.radius = { sq: await css('#sq .bselect-trigger', 'borderTopLeftRadius'), pill: await css('#pill .bselect-trigger', 'borderTopLeftRadius') };
  o.underlineBorder = await css('#under .bselect-trigger', 'borderTopWidth');
  o.iconLabel = {
    text: (await page.locator('#icon .bselect-trigger-text').innerText()).replace(/\n/g, ' | '),
    label: await page.locator('#icon .bselect-label').innerText(),
    hasIconEl: await page.locator('#icon .bselect-lead i.fa-user').count(),
  };
  o.chips = await page.locator('#chips .bselect-chip').allInnerTexts();
  await page.click('#chips .bselect-chip-x >> nth=0');
  o.chipsAfterRemove = await page.locator('#chips .bselect-chip').allInnerTexts();
  o.leadImg = await page.locator('#img .bselect-lead-img').count();
  await page.click('#img .bselect-trigger');
  o.itemPics = await page.locator('#img .bselect-item-pic').count();
  o.sub = await page.locator('#img .bselect-item-sub').allInnerTexts();
  await page.mouse.click(2, 2);
  await page.click('#tick .bselect-trigger');
  o.tick = { control: await page.locator('#tick .bselect-list > .bselect-item > .bselect-control').first().isVisible(), mark: await page.locator('#tick .bselect-selected-mark').count() };
  await page.mouse.click(2, 2);
  o.theme = { radius: await css('#theme .bselect-trigger', 'borderTopLeftRadius'), h: await h('#theme') };
  o.darkClass = await page.locator('.bselect-dark').count();
  o.darkBg = await css('#darkone .bselect-trigger', 'backgroundColor');
  // load modes on a local list of 60
  await page.click('#ls .bselect-trigger');
  o.scroll1 = await rows('#ls');
  await page.evaluate(() => { const w = document.querySelector('#ls .bselect-list-wrap'); w.scrollTop = w.scrollHeight; });
  await page.waitForTimeout(300);
  o.scroll2 = await rows('#ls');
  await page.mouse.click(2, 2);
  await page.click('#lb .bselect-trigger');
  o.btn1 = await rows('#lb');
  o.btnVisible = await page.locator('#lb .bselect-load-more button').isVisible();
  await page.click('#lb .bselect-load-more button');
  o.btn2 = await rows('#lb');
  await page.mouse.click(2, 2);
  await page.click('#la .bselect-trigger');
  o.all = await rows('#la');
  await page.mouse.click(2, 2);
  // clean option names + settings gear changing appearance at runtime
  const nat = '#nat + .bselect';
  await page.click(nat + ' .bselect-trigger');
  o.clean = { search: await page.locator(nat + ' .bselect-search').count(), gear: await page.locator(nat + ' .bselect-settings-action').count() };
  await page.click(nat + ' .bselect-settings-action');
  await page.click(nat + ' .bselect-tab[title="Button"]');
  o.settingFields = await page.locator(nat + ' .bselect-pane-active .bselect-rowc-label').allInnerTexts();
  await page.click(nat + ' .bselect-pane-active .bselect-seg button:text-is("L")');
  await page.click(nat + ' .bselect-tab[title="Look"]');
  await page.click(nat + ' .bselect-pane-active .bselect-seg button:has-text("Dark")');
  await page.waitForTimeout(150);
  o.runtime = { h: await h(nat), dark: await page.locator(nat + '.bselect-dark').count() };
  return o;
}
