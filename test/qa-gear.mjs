// gear is always there (even with an old saved settings:false); no panel arrow by default
// node <browser-automation>/browser.mjs http://localhost:8765/demo.html --script test/qa-gear.mjs
import os from 'node:os';
export default async function run(page) {
  const o = {};
  await page.evaluate(() => localStorage.setItem('bselect:demo-b', JSON.stringify({ settings: false, size: 'md' })));
  await page.reload();
  await page.waitForTimeout(400);
  await page.setViewportSize({ width: 900, height: 600 });
  await page.click('#a .bselect-trigger, #a + .bselect .bselect-trigger');
  o.plainGear = await page.locator('.bselect-open .bselect-settings-action').count();
  o.arrow = await page.locator('.bselect-open .bselect-panel-anchor').count();
  await page.screenshot({ path: os.tmpdir() + '/clean-edge.png', clip: { x: 0, y: 40, width: 460, height: 260 } });
  await page.mouse.click(2, 2);
  await page.click('#b .bselect-trigger');
  o.persistedGear = await page.locator('#b .bselect-settings-action').count();
  await page.click('#b .bselect-settings-action');
  o.gearPill = await page.locator('#b .bselect-pill:has-text("Gear")').count();
  o.settingsArrow = await page.locator('#b .bselect-settings-connector').count();
  return o;
}
