// forms with dropdowns built in a loop (plain JS + AngularJS ng-repeat)
// node <browser-automation>/browser.mjs http://localhost:8765/test/form-loop.html --script test/qa-loop.mjs
export default async function run(page) {
  const o = {};
  const isAngular = page.url().includes('angular');
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.waitForTimeout(isAngular ? 1200 : 300);
  o.metrics = JSON.parse(await page.evaluate(() => document.documentElement.dataset.metrics || '{}'));
  o.dropdowns = await page.locator('.bselect').count();
  o.tabs = await page.evaluate(() => document.getElementsByTagName('*').length);
  const pick = async (id, n) => { await page.click('#' + id + ' .bselect-trigger, #' + id + ' + .bselect .bselect-trigger'); await page.waitForSelector('.bselect-open .bselect-item'); await page.click('.bselect-open .bselect-list > .bselect-item:nth-child(' + n + ')'); await page.waitForTimeout(150); };
  const label = (id) => page.locator('#' + id + ' .bselect-trigger-label, #' + id + ' + .bselect .bselect-trigger-label').first().innerText();
  o.initialLabels = [await label('empid0'), await label('empid3')];
  await pick('empid3', 5);
  await pick('empid42', 8);
  o.afterPick = [await label('empid3'), await label('empid42'), await label('empid4')];
  if (isAngular) {
    o.model = JSON.parse(await page.locator('#out').innerText());
    await page.click('#fill');
    await page.waitForTimeout(600);
    o.afterFill = [await label('empid0'), await label('empid10'), await label('empid89')];
    o.formValid = JSON.parse(await page.locator('#out').innerText()).invalid;
  } else {
    await page.click('#send');
    const form = JSON.parse(await page.evaluate(() => document.documentElement.dataset.form));
    o.formKeys = Object.keys(form).length;
    o.formSample = { 'emp[3]': form['emp[3]'], 'emp[42]': form['emp[42]'], 'emp[4]': form['emp[4]'] };
  }
  // open many panels in a row: only one panel exists in the DOM at a time
  const before = await page.evaluate(() => document.querySelectorAll('.bselect-panel').length);
  for (let i = 0; i < 12; i++) { await page.click('#empid' + i + ' .bselect-trigger, #empid' + i + ' + .bselect .bselect-trigger'); }
  o.panelsInDom = await page.evaluate(() => document.querySelectorAll('.bselect-panel').length);
  return o;
}
