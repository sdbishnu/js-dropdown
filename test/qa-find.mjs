// settings: find box + keyboard   node <browser-automation>/browser.mjs http://localhost:8765/test/layers.html --script test/qa-find.mjs
export default async function run(page) {
  const o = {};
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.click('#g .bselect-trigger');
  await page.click('#g .bselect-settings-action');
  await page.fill('#g .bselect-settings-find', 'radius');
  o.visibleRows = await page.locator('#g .bselect-settings-body .bselect-field:not(.bselect-hide), #g .bselect-settings-body .bselect-rowc:not(.bselect-hide)').allInnerTexts();
  o.tabsHidden = !(await page.locator('#g .bselect-tabs').isVisible());
  await page.fill('#g .bselect-settings-find', 'zzzz');
  o.noneMessage = await page.locator('#g .bselect-find-none').isVisible();
  await page.fill('#g .bselect-settings-find', '');
  o.tabsBack = await page.locator('#g .bselect-tabs').isVisible();
  // arrows between tabs
  await page.focus('#g .bselect-tab-active');
  await page.keyboard.press('ArrowRight');
  o.afterArrow = await page.locator('#g .bselect-tab-active').innerText();
  // Esc closes popup but keeps dropdown open
  await page.keyboard.press('Escape');
  o.popupGone = (await page.locator('#g .bselect-settings').count()) === 0;
  o.panelStillOpen = (await page.locator('#g .bselect-panel').count()) === 1;
  return o;
}
