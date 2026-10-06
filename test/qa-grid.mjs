// Bootstrap grid page: one line, col-md-2/3/4/3; outside toggles; settings design; arrow
// node <browser-automation>/browser.mjs http://localhost:8765/demo-grid.html --script test/qa-grid.mjs
import os from 'node:os';
export default async function run(page) {
  const o = {};
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.waitForTimeout(500);
  const box = (id) => page.locator(id + ' .bselect-trigger').boundingBox();
  const row1 = await Promise.all(['#g1', '#g2', '#g3', '#g4'].map(box));
  o.row1 = { sameLine: new Set(row1.map((b) => Math.round(b.y))).size === 1, widths: row1.map((b) => Math.round(b.width)) };
  const row2 = await Promise.all(['#g5', '#g6', '#g7', '#g8', '#g9', '#g10'].map(box));
  o.row2 = { sameLine: new Set(row2.map((b) => Math.round(b.y))).size === 1, widths: row2.map((b) => Math.round(b.width)) };

  // arrow + gear present by default
  await page.click('#g1 .bselect-trigger');
  await page.waitForTimeout(350);
  o.defaults = { arrow: await page.locator('#g1 .bselect-panel-anchor').count(), gear: await page.locator('#g1 .bselect-settings-action').count() };
  const panel = await page.locator('#g1 .bselect-panel').boundingBox();
  o.panelInsideViewport = panel.x >= 0 && panel.x + panel.width <= 1280;
  await page.screenshot({ path: os.tmpdir() + '/grid-open.png', clip: { x: 0, y: 130, width: 560, height: 420 } });
  await page.mouse.click(2, 2);

  // outside toggles
  await page.click('input[data-opt="settings"]');
  await page.click('#g1 .bselect-trigger');
  o.afterGearOff = await page.locator('#g1 .bselect-settings-action').count();
  await page.mouse.click(2, 2);
  await page.click('input[data-opt="settings"]');
  await page.click('input[data-opt="arrow"]');
  await page.click('#g1 .bselect-trigger');
  o.afterArrowOff = await page.locator('#g1 .bselect-panel-anchor').count();
  await page.mouse.click(2, 2);
  await page.click('input[data-opt="arrow"]');
  await page.click('.seg[data-seg="size"] button[data-v="lg"]');
  o.sizeLg = Math.round((await box('#g4')).height);
  await page.click('.seg[data-seg="size"] button[data-v="md"]');
  await page.click('input[data-opt="chips"]');
  await page.click('#g3 .bselect-trigger');
  await page.click('#g3 .bselect-list > .bselect-item:nth-child(1)');
  await page.click('#g3 .bselect-list > .bselect-item:nth-child(2)');
  o.chips = await page.locator('#g3 .bselect-chip').count();
  await page.mouse.click(2, 2);

  // settings popup design (light + dark)
  await page.click('#g4 .bselect-trigger');
  await page.click('#g4 .bselect-settings-action');
  await page.waitForTimeout(400);
  o.popup = { h: Math.round((await page.locator('#g4 .bselect-settings').boundingBox()).height), tabs: await page.locator('#g4 .bselect-tab').count(), tabIcons: await page.locator('#g4 .bselect-tab-ico svg').count(), arrow: await page.locator('#g4 .bselect-settings-connector').count() };
  await page.screenshot({ path: os.tmpdir() + '/grid-settings-light.png', clip: { x: 600, y: 130, width: 680, height: 460 } });
  await page.click('#g4 .bselect-tab >> nth=1');
  await page.waitForTimeout(250);
  await page.screenshot({ path: os.tmpdir() + '/grid-settings-look.png', clip: { x: 600, y: 130, width: 680, height: 460 } });
  await page.mouse.click(2, 2);
  await page.click('.demo-theme-switch button:has-text("Dark")');
  await page.waitForTimeout(300);
  await page.click('#g4 .bselect-trigger');
  await page.click('#g4 .bselect-settings-action');
  await page.waitForTimeout(400);
  await page.screenshot({ path: os.tmpdir() + '/grid-settings-dark.png', clip: { x: 600, y: 130, width: 680, height: 460 } });
  await page.mouse.click(2, 2);
  await page.click('#g3 .bselect-trigger');
  await page.waitForTimeout(350);
  await page.screenshot({ path: os.tmpdir() + '/grid-dark-open.png', clip: { x: 300, y: 130, width: 700, height: 420 } });
  return o;
}
