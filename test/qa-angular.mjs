// AngularJS wrapper: new attributes + the old bselect.bind / config / object-model API
// node <browser-automation>/browser.mjs http://localhost:8765/demo-angular.html --script test/qa-angular.mjs
export default async function run(page) {
  const o = {};
  const model = async () => JSON.parse(await page.locator('#out').innerText());
  const pick = async (sel, n) => { await page.click(sel + ' .bselect-trigger'); await page.waitForSelector(sel + ' .bselect-item'); await page.click(sel + ' .bselect-list > .bselect-item:nth-child(' + n + ')'); await page.waitForTimeout(250); };
  o.initial = await model();
  o.frmInvalidAtStart = o.initial.invalid;

  // 1 new API
  await pick('#ward', 2);
  o.afterPick = (await model()).ward;
  o.onChange = await page.evaluate(() => document.documentElement.dataset.last);

  // 2 multiple + chips + per-dropdown defaults (lg = 42px)
  await page.click('[name="f.users"] .bselect-trigger');
  await page.click('[name="f.users"] .bselect-list > .bselect-item:nth-child(1)');
  await page.click('[name="f.users"] .bselect-list > .bselect-item:nth-child(3)');
  await page.mouse.click(2, 2);
  o.users = (await model()).users;
  o.usersHeight = Math.round((await page.locator('[name="f.users"] .bselect-trigger').boundingBox()).height);

  // 3 cascade
  o.wardDisabledAtStart = await page.locator('#ward2 .bselect-trigger').isDisabled();
  await pick('#dept', 1);
  o.afterDept = { dept: (await model()).dept, wardEnabled: !(await page.locator('#ward2 .bselect-trigger').isDisabled()) };
  await page.click('#ward2 .bselect-trigger');
  await page.waitForSelector('#ward2 .bselect-item');
  o.wards1 = await page.locator('#ward2 .bselect-list .bselect-item-label').allInnerTexts();
  await page.click('#ward2 .bselect-list > .bselect-item:nth-child(1)');
  await pick('#dept', 2);
  o.afterDeptChange = { ward2: (await model()).ward2 };

  // 4 old API (server handler, then object model)
  await pick('#old1', 3);
  o.oldSingle = (await model()).old;
  o.oldGear = await page.locator('#old1 .bselect-trigger').count();
  await page.click('#old2 .bselect-trigger');
  await page.waitForSelector('#old2 .bselect-item');
  await page.click('#old2 .bselect-list > .bselect-item:nth-child(2)');
  await page.waitForTimeout(250);
  o.oldObject = (await model()).obj;

  // 5 required validity + controller -> dropdown
  o.invalidBeforePick = (await model()).invalid;
  await pick('#req', 1);
  o.invalidAfterPick = (await model()).invalid;
  await page.click('#set');
  await page.waitForTimeout(500);
  o.afterSet = await model();
  o.labels = {
    ward: await page.locator('#ward .bselect-trigger-label').innerText(),
    obj: await page.locator('#old2 .bselect-trigger-label').innerText(),
    users: await page.locator('[name="f.users"] .bselect-chip-text').allInnerTexts(),
  };
  return o;
}
