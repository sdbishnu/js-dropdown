// every Look choice has a Custom button with its own inputs
// node <browser-automation>/browser.mjs http://localhost:8765/test/layers.html --script test/qa-custom-choices.mjs
import os from 'node:os';
export default async function run(page) {
  const o = {};
  const css = (sel, prop) => page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s))[p], [sel, prop]);
  const h = async (sel) => Math.round((await page.locator(sel).first().boundingBox()).height);
  await page.setViewportSize({ width: 1000, height: 760 });
  await page.click('#g .bselect-trigger');
  await page.click('#g .bselect-settings-action');
  await page.click('#g .bselect-tab[title="Button"]');
  const row = (name) => '#g .bselect-pane-active .bselect-rowc:has(.bselect-rowc-label:text-is("' + name + '"))';
  o.customButtons = await page.locator('#g .bselect-pane-active .bselect-seg button:text-is("Custom")').count();
  o.baseline = { field: await h('#g .bselect-trigger'), radius: await css('#g .bselect-trigger', 'borderTopLeftRadius') };

  // Size -> Custom: height + font
  await page.click(row('Size') + ' button:text-is("Custom")');
  const sizeInline = '#g .bselect-pane-active .bselect-custom-inline:visible';
  await page.fill(sizeInline + ' >> nth=0 >> label:has-text("Height") input', '52');
  await page.fill(sizeInline + ' >> nth=0 >> label:has-text("Font") input', '16');
  await page.waitForTimeout(150);
  o.size = { field: await h('#g .bselect-trigger'), font: await css('#g .bselect-trigger-text', 'fontSize') };
  await page.click(row('Size') + ' button:text-is("M")');
  await page.waitForTimeout(150);
  o.sizeAfterPreset = { field: await h('#g .bselect-trigger'), inlineVisible: await page.locator(sizeInline).count() };

  // Shape -> Custom radius
  await page.click(row('Shape') + ' button:text-is("Custom")');
  await page.fill('#g .bselect-pane-active .bselect-custom-inline:visible label:has-text("Radius") input', '20');
  await page.waitForTimeout(150);
  o.radius = await css('#g .bselect-trigger', 'borderTopLeftRadius');

  // Rows -> Custom row height (Dropdown tab)
  await page.click('#g .bselect-tab[title="Dropdown"]');
  await page.click(row('Rows') + ' button:text-is("Custom")');
  await page.fill('#g .bselect-pane-active .bselect-custom-inline:visible label:has-text("Height") input', '46');
  await page.waitForTimeout(150);
  o.rowHeight = await h('#g .bselect-list > .bselect-item');

  // Field -> Custom border (Button tab)
  await page.click('#g .bselect-tab[title="Button"]');
  await page.click(row('Border') + ' button:text-is("Custom")');
  await page.fill('#g .bselect-pane-active .bselect-custom-inline:visible label:has-text("Border") input', '4');
  await page.waitForTimeout(150);
  o.border = await css('#g .bselect-trigger', 'borderTopWidth');

  // Values -> Custom max chips
  await page.click(row('Values') + ' button:text-is("Chips")');
  await page.click(row('Values') + ' button:text-is("Custom")');
  await page.fill('#g .bselect-pane-active .bselect-custom-inline:visible label:has-text("Max chips") input', '1');
  o.maxChipsSet = await page.evaluate(() => 'ok');

  // export lists the custom values
  await page.click('#g .bselect-tab[title="Export"]');
  o.export = (await page.inputValue('#g .bselect-pane-active .bselect-code')).split('\n').filter((l) => /radius|rowHeight|borderWidth|maxChips|fieldHeight/.test(l)).map((l) => l.trim());
  await page.click('#g .bselect-tab[title="Button"]');
  await page.screenshot({ path: os.tmpdir() + '/custom-choices.png', clip: { x: 0, y: 0, width: 1000, height: 560 } });
  return o;
}
