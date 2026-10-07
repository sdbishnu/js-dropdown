// every kept option has a control in the settings gear; Export writes them as code; with the gear off nothing of it is rendered
export default async function run(page) {
  await page.setViewportSize({ width: 1000, height: 760 });
  const o = {};
  // gear off dropdown: no gear, no settings DOM, no editors
  await page.click('.bselect-trigger >> nth=1'); await page.waitForTimeout(300);
  o.offGear = await page.locator('.bselect-panel .bselect-settings-action').count();
  o.offSettingsDom = await page.locator('.bselect-settings, .bselect-settings-wrap, .bselect-imgrow, .bselect-subrow').count();
  await page.mouse.click(2, 2); await page.waitForTimeout(200);
  // gear on
  await page.click('.bselect-trigger >> nth=0'); await page.waitForTimeout(300);
  await page.click('.bselect-settings-action'); await page.waitForTimeout(500);
  const S = '.bselect-settings';
  o.tabs = await page.locator(S + ' .bselect-tab').count();
  o.lazyBefore = await page.locator(S + ' .bselect-imgrow, ' + S + ' .bselect-subrow').count();
  const tab = async (t) => { await page.click(S + ' .bselect-tab[title="' + t + '"]'); await page.waitForTimeout(350); };
  const text = async (label, value) => { const input = page.locator(S + ' .bselect-pane-active .bselect-rowc:has(.bselect-rowc-label:text-is("' + label + '")) input'); await input.fill(value); await input.press('Tab'); await page.waitForTimeout(250); };
  await tab('List');
  await text('Group by', 'dept');
  o.heads = await page.locator('.bselect-panel .bselect-group').count();
  // tabs off in behavior
  await tab('Behavior');
  await page.click(S + ' .bselect-pane-active .bselect-pill:has-text("All / Selected")'); await page.waitForTimeout(300);
  o.tabsOff = await page.locator('.bselect-panel .bselect-viewtab').count();
  // data tab has controls
  await tab('Data');
  o.dataControls = await page.locator(S + ' .bselect-pane-active .bselect-pill, ' + S + ' .bselect-pane-active .bselect-num').count();
  // images tab builds the per-option editor lazily
  await tab('Images');
  o.lazyAfter = await page.locator(S + ' .bselect-imgrow').count();
  // export contains the changed settings
  await tab('Export');
  await page.click(S + ' .bselect-pane-active button:text-is("All")'); await page.waitForTimeout(300);
  const code = await page.locator(S + ' .bselect-pane-active .bselect-code').first().inputValue();
  o.exportMissing = ['groupField', 'viewTabs'].filter((k) => !code.includes(k));
  if (o.offGear !== 0 || o.offSettingsDom !== 0) throw new Error('gear off still renders ' + JSON.stringify(o));
  if (o.tabs !== 9 || o.lazyBefore !== 0 || o.lazyAfter < 1) throw new Error('tabs / lazy ' + JSON.stringify(o));
  if (o.heads < 3 || o.tabsOff !== 0 || o.dataControls < 3) throw new Error('settings effects ' + JSON.stringify(o));
  if (o.exportMissing.length) throw new Error('export misses ' + o.exportMissing.join());
  return o;
}
