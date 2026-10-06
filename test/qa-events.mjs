// event / delegation audit: listeners must not leak, clicks inside settings must not close the dropdown,
// settings changes must not fire "change", typing must not lose focus.
// node <browser-automation>/browser.mjs http://localhost:8765/test/events.html --script test/qa-events.mjs
export default async function run(page) {
  const o = {};
  const ls = async () => JSON.parse(await page.evaluate(() => document.documentElement.dataset.ls || '{}'));
  const ev = async () => JSON.parse(await page.evaluate(() => document.documentElement.dataset.ev || '{"changes":0,"opens":0,"closes":0}'));
  const total = (m) => Object.values(m).reduce((a, b) => a + b, 0);
  await page.setViewportSize({ width: 1000, height: 760 });
  o.baseline = await ls();

  const gear = '#d2 .bselect-settings-action';
  const stillOpen = async () => ({ panel: await page.locator('#d2 .bselect-panel').count(), popup: await page.locator('#d2 .bselect-settings').count() });
  const bad = [];
  async function check(label) {
    const s = await stillOpen();
    if (!s.panel || !s.popup) bad.push(label + ' -> ' + JSON.stringify(s));
  }

  // 1) settings changes: dropdown + popup must stay open, no "change" events
  await page.click('#d2 .bselect-trigger');
  await page.click(gear);
  const changesBefore = (await ev()).changes;
  await page.click('#d2 .bselect-pane-active .bselect-pill:has-text("Search")'); await check('pill Search off');
  await page.click('#d2 .bselect-pane-active .bselect-pill:has-text("Search")'); await check('pill Search on');
  await page.click('#d2 .bselect-pane-active .bselect-pill:has-text("Sort")'); await check('pill Sort on');
  await page.click('#d2 .bselect-pane-active .bselect-pill:has-text("Sort")'); await check('pill Sort off');
  await page.click('#d2 .bselect-pane-active .bselect-seg button:text-is("Scroll")'); await check('loading scroll');
  await page.click('#d2 .bselect-pane-active .bselect-seg button:text-is("All")'); await check('loading all');
  await page.click('#d2 .bselect-tab[title="Look"]'); await check('tab look');
  await page.click('#d2 .bselect-pane-active .bselect-seg button:text-is("Dark")'); await check('mode dark');
  await page.click('#d2 .bselect-pane-active .bselect-seg button:text-is("Light")'); await check('mode light');
  await page.click('#d2 .bselect-pane-active .bselect-swatch >> nth=3'); await check('background swatch');
  await page.click('#d2 .bselect-pane-active .bselect-swatch >> nth=0'); await check('background default');
  await page.click('#d2 .bselect-tab[title="Button"]'); await check('tab button');
  await page.click('#d2 .bselect-pane-active .bselect-rowc:has(.bselect-rowc-label:text-is("Shape")) button:text-is("Pill")'); await check('shape pill');
  await page.click('#d2 .bselect-pane-active .bselect-rowc:has(.bselect-rowc-label:text-is("Size")) button:text-is("Custom")'); await check('size custom');
  await page.click('#d2 .bselect-tab[title="Images"]'); await check('tab images');
  await page.click('#d2 .bselect-pane-active .bselect-pill:has-text("Show images")'); await check('show images on');
  await page.click('#d2 .bselect-pane-active .bselect-pill:has-text("Show images")'); await check('show images off');
  await page.click('#d2 .bselect-settings-footer button:has-text("Reset")'); await check('reset');
  o.settingsKeptOpen = bad.length === 0 ? 'ok' : bad;
  o.changeEventsFromSettings = (await ev()).changes - changesBefore;

  // 2) typing keeps focus and builds the whole number
  await page.click('#d2 .bselect-tab[title="Button"]');
  await page.click('#d2 .bselect-pane-active .bselect-rowc:has(.bselect-rowc-label:text-is("Shape")) button:text-is("Custom")');
  const radius = '#d2 .bselect-pane-active .bselect-custom-inline:visible label:has-text("Radius") input';
  await page.focus(radius);
  await page.keyboard.type('18', { delay: 60 });
  o.typing = { value: await page.locator(radius).inputValue(), focused: await page.locator(radius).evaluate((e) => e === document.activeElement) };
  await page.focus('#d2 .bselect-settings-find');
  await page.keyboard.type('border', { delay: 40 });
  o.findFocus = { value: await page.locator('#d2 .bselect-settings-find').inputValue(), focused: await page.locator('#d2 .bselect-settings-find').evaluate((e) => e === document.activeElement) };
  await page.fill('#d2 .bselect-settings-find', '');

  // 2b) Enter inside popup inputs must not submit the surrounding form
  await page.focus(radius);
  await page.keyboard.press('Enter');
  await page.focus('#d2 .bselect-settings-find');
  await page.keyboard.press('Enter');
  o.formSubmitted = await page.evaluate(() => !!document.documentElement.dataset.submitted);

  // 2c) a panel rebuild keeps the same popup element (no flicker, tab kept)
  await page.evaluate(() => { document.querySelector('#d2 .bselect-settings').setAttribute('data-keep', 'yes'); });
  await page.click('#d2 .bselect-tab[title="Behavior"]');
  await page.click('#d2 .bselect-pane-active .bselect-pill:has-text("Search")');
  o.popupKept = await page.evaluate(() => ({ same: document.querySelector('#d2 .bselect-settings').getAttribute('data-keep') === 'yes', activeTab: document.querySelector('#d2 .bselect-tab-active').title }));
  await page.click('#d2 .bselect-pane-active .bselect-pill:has-text("Search")');
  // single <-> multiple rebuilds the popup rows ("Values" only exists for multiple)
  await page.click('#d2 .bselect-tab[title="Look"]');
  o.valuesRowBefore = await page.locator('#d2 .bselect-rowc-label:text-is("Values")').count();

  // 3) selecting inside the list while settings are open does not close anything
  await page.click('#d2 .bselect-list > .bselect-item:nth-child(2)');
  o.afterPick = await stillOpen();

  // 4) many open/close + settings cycles: listener counts must come back to the baseline
  await page.mouse.click(2, 2);
  for (let i = 0; i < 25; i++) {
    await page.click('#d2 .bselect-trigger');
    await page.click(gear);
    await page.click('#d2 .bselect-tab >> nth=' + (i % 5));
    await page.keyboard.press('Escape');
    await page.mouse.click(2, 2);
  }
  o.afterCycles = await ls();
  o.leak = total(o.afterCycles) - total(o.baseline);

  // 5) destroy everything: bselect must remove all its document/window listeners
  await page.click('#destroyAll');
  o.afterDestroy = await ls();
  o.afterDestroyTotal = total(o.afterDestroy);

  // 6) recreate: counts return, no duplicates
  await page.click('#recreate');
  o.afterRecreate = await ls();
  return o;
}
