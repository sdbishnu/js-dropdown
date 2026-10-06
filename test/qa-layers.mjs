// precedence (default -> global -> per dropdown -> own), data-attributes, compact settings popup, custom values, export
// node <browser-automation>/browser.mjs http://localhost:8765/test/layers.html --script test/qa-layers.mjs
export default async function run(page) {
  const o = {};
  const css = (sel, prop) => page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s))[p], [sel, prop]);
  o.layers = JSON.parse(await page.evaluate(() => document.documentElement.dataset.layers));
  const h = async (sel) => Math.round((await page.locator(sel).first().boundingBox()).height);
  o.heights = { a_lg_pill: await h('#a + .bselect .bselect-trigger'), b_sm: await h('#b .bselect-trigger'), c_md: await h('#c .bselect-trigger'), d_data_lg: await h('#d .bselect-trigger') };
  o.radius = { a: await css('#a + .bselect .bselect-trigger', 'borderTopLeftRadius'), d: await css('#d .bselect-trigger', 'borderTopLeftRadius') };
  o.borderColour = { a: await css('#a + .bselect .bselect-trigger', 'borderTopColor'), b: await css('#b .bselect-trigger', 'borderTopColor') };

  // settings popup: compact + tabs
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.click('#g .bselect-trigger');
  await page.click('#g .bselect-settings-action');
  await page.waitForTimeout(300);
  o.popupHeight = Math.round((await page.locator('#g .bselect-settings').boundingBox()).height);
  o.tabs = await page.locator('#g .bselect-tab').allInnerTexts();
  o.pillsOnBehavior = await page.locator('#g .bselect-pane-active .bselect-pill').count();

  // Button tab: Shape -> Custom radius; Dropdown tab: Rows -> Custom row height; Advanced: css variable
  const rowOf = (name) => '#g .bselect-pane-active .bselect-rowc:has(.bselect-rowc-label:text-is("' + name + '"))';
  await page.click('#g .bselect-tab[title="Button"]');
  await page.click(rowOf('Shape') + ' button:text-is("Custom")');
  await page.fill('#g .bselect-pane-active .bselect-custom-inline:visible label:has-text("Radius") input', '18');
  await page.click('#g .bselect-tab[title="Dropdown"]');
  await page.click(rowOf('Rows') + ' button:text-is("Custom")');
  await page.fill('#g .bselect-pane-active .bselect-custom-inline:visible label:has-text("Height") input', '44');
  await page.click('#g .bselect-tab[title="Advanced"]');
  await page.fill('#g .bselect-code-small', '--bselect-hover: #fde68a');
  await page.waitForTimeout(200);
  o.custom = {
    radius: await css('#g .bselect-trigger', 'borderTopLeftRadius'),
    rowHeight: await h('#g .bselect-list > .bselect-item'),
    hoverVar: await page.evaluate(() => document.querySelector('#g .bselect').style.getPropertyValue('--bselect-hover')),
  };
  await page.click('#g .bselect-tab[title="Button"]');
  await page.click(rowOf('Shape') + ' button:text-is("Round")');
  o.radiusCleared = await css('#g .bselect-trigger', 'borderTopLeftRadius');

  // export tab
  await page.click('#g .bselect-tab[title="Button"]');
  await page.click(rowOf('Shape') + ' button:text-is("Custom")');
  await page.fill('#g .bselect-pane-active .bselect-custom-inline:visible label:has-text("Radius") input', '12');
  await page.click('#g .bselect-tab[title="Export"]');
  o.exportGlobal = await page.inputValue('#g .bselect-pane-active .bselect-code');
  await page.click('#g .bselect-seg button:has-text("This one")');
  o.exportThis = (await page.inputValue('#g .bselect-pane-active .bselect-code')).split('\n')[1];
  await page.click('#g .bselect-seg button:has-text("HTML")');
  o.exportHtml = (await page.inputValue('#g .bselect-pane-active .bselect-code')).split('\n');
  await page.click('#g .bselect-seg button:has-text("JSON")');
  o.exportJson = await page.inputValue('#g .bselect-pane-active .bselect-code');
  await page.click('#g .bselect-pane-active .bselect-seg button:has-text("All")');
  o.exportAllKeys = Object.keys(JSON.parse(await page.inputValue('#g .bselect-pane-active .bselect-code'))).length;
  o.copyButton = await page.locator('#g .bselect-settings-footer button:has-text("Copy")').count();
  return o;
}
