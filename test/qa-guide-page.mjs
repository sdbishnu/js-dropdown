// the guide page (docs layout): pages, sidebar, on-this-page, code blocks, search palette, deep links, theme, live demo
export default async function run(page) {
  await page.setViewportSize({ width: 1400, height: 900 });
  const o = {};
  await page.waitForTimeout(700);
  o.pages = await page.locator('article.page').count();
  o.side = await page.locator('#side a').count();
  o.tabAnchors = await page.evaluate(() => ['behavior', 'look', 'button', 'dropdown', 'list', 'data', 'images', 'advanced'].filter((t) => !document.getElementById('tab-' + t)));
  o.firstTitle = await page.locator('article.page.show h1').textContent();
  o.demo = await page.locator('.bselect-trigger').count();
  o.codeBlocks = await page.locator('.code').count();
  o.copyBtn = await page.locator('.code header button').count();
  // sidebar navigation + on this page
  await page.click('#side a[data-page="selecting"]'); await page.waitForTimeout(250);
  o.selectingTitle = await page.locator('article.page.show h1').textContent();
  o.hash = await page.evaluate(() => location.hash);
  o.toc = await page.locator('#toc a').count();
  // search palette
  await page.keyboard.press('Control+k'); await page.waitForTimeout(250);
  o.palOpen = await page.locator('#pal.open').count();
  await page.fill('#palq', 'preload'); await page.waitForTimeout(250);
  o.hits = await page.locator('.palhit').count();
  o.hitMarks = await page.locator('.palhit mark').count();
  await page.keyboard.press('Enter'); await page.waitForTimeout(350);
  o.afterSearchTitle = await page.locator('article.page.show h1').textContent();
  o.palClosed = await page.locator('#pal.open').count();
  await page.keyboard.press('Control+k'); await page.fill('#palq', 'zzzznothing'); await page.waitForTimeout(200);
  o.noResult = await page.locator('.palempty').count();
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  // deep link to a gear tab (what the Guide button in the gear opens)
  await page.evaluate(() => { location.hash = 'tab-dropdown'; }); await page.waitForTimeout(350);
  o.deepTitle = await page.locator('article.page.show h1').textContent();
  o.deepRows = await page.locator('article.page.show table tr').count();
  // pager
  o.pager = await page.locator('article.page.show .pager a').count();
  // theme
  const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.click('#theme'); await page.waitForTimeout(200);
  const after = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  o.themeChanged = before !== after;
  if (o.pages < 15 || o.side < 15 || o.tabAnchors.length) throw new Error('structure ' + JSON.stringify(o));
  if (o.firstTitle !== 'Quick start' || o.demo < 1) throw new Error('first page / demo ' + JSON.stringify(o));
  if (o.codeBlocks < 3 || o.copyBtn < 3) throw new Error('code blocks ' + JSON.stringify(o));
  if (o.selectingTitle !== 'Selecting' || o.hash !== '#selecting' || o.toc < 3) throw new Error('navigation ' + JSON.stringify(o));
  if (o.palOpen !== 1 || o.hits < 1 || o.hitMarks < 1 || o.palClosed !== 0 || !/Data|Preload|Dropdown|Selecting|Data and loading/.test(o.afterSearchTitle)) throw new Error('search ' + JSON.stringify(o));
  if (o.noResult !== 1) throw new Error('no-result state');
  if (o.deepTitle !== 'Dropdown' || o.deepRows < 8 || o.pager < 1) throw new Error('deep link ' + JSON.stringify(o));
  if (!o.themeChanged) throw new Error('theme did not change');
  return o;
}
