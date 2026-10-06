// compact settings popup screenshots (light + dark): node <browser-automation>/browser.mjs http://localhost:8765/demo-grid.html --script test/popup-shots.mjs
import os from 'node:os';
export default async function run(page) {
  const out = os.tmpdir() + '/popup-';
  const o = {};
  await page.setViewportSize({ width: 1280, height: 820 });
  for (const mode of ['Light', 'Dark']) {
    await page.click('.demo-theme-switch button:has-text("' + mode + '")');
    await page.waitForTimeout(250);
    await page.click('#g4 .bselect-trigger');
    await page.click('#g4 .bselect-settings-action');
    await page.waitForTimeout(450);
    for (const [i, n] of ['behavior', 'look', 'button', 'dropdown', 'images', 'custom', 'export'].entries()) {
      await page.click('#g4 .bselect-tab >> nth=' + i);
      await page.waitForTimeout(200);
      const box = await page.locator('#g4 .bselect-settings').boundingBox();
      o[mode + '-' + n] = Math.round(box.height);
      await page.screenshot({ path: out + mode.toLowerCase() + '-' + n + '.png', clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 } });
    }
    await page.mouse.click(2, 2);
  }
  return o;
}
