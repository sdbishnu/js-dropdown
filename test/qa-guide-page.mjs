// the guide page: navigation, a section for every settings tab, search, theme switch, live demo
export default async function run(page) {
  await page.setViewportSize({ width: 1200, height: 800 });
  const o = {};
  await page.waitForTimeout(600);
  o.navLinks = await page.locator('#nav a').count();
  o.sections = await page.locator('main section').count();
  o.tabAnchors = await page.evaluate(() => ['behavior', 'look', 'button', 'dropdown', 'list', 'data', 'images', 'advanced'].filter((t) => !document.getElementById('tab-' + t)));
  o.demo = await page.locator('.bselect-trigger').count();
  await page.fill('#q', 'preload'); await page.waitForTimeout(250);
  o.searchShown = await page.locator('main section:not(.hide)').count();
  o.marks = await page.locator('main mark').count();
  await page.fill('#q', 'zzzznothing'); await page.waitForTimeout(250);
  o.none = await page.locator('#none:not(.hide)').count();
  await page.fill('#q', ''); await page.waitForTimeout(250);
  o.restored = await page.locator('main section:not(.hide)').count();
  const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.click('#theme'); await page.waitForTimeout(200);
  const after = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  o.themeChanged = before !== after;
  if (o.navLinks < 20 || o.sections < 8 || o.tabAnchors.length) throw new Error('structure ' + JSON.stringify(o));
  if (o.demo < 1) throw new Error('live demo missing');
  if (o.searchShown < 1 || o.searchShown >= o.sections || o.marks < 1 || o.none !== 1 || o.restored !== o.sections) throw new Error('search ' + JSON.stringify(o));
  if (!o.themeChanged) throw new Error('theme did not change');
  return o;
}
