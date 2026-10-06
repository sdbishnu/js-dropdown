// screenshots of the new look: node <browser-automation>/browser.mjs http://localhost:8765/test/design.html --script test/look-shots.mjs
import os from 'node:os';
export default async function run(page) {
  const out = os.tmpdir() + '/look-';
  await page.setViewportSize({ width: 1040, height: 720 });
  await page.waitForTimeout(300);
  await page.click('#a .bselect-trigger');
  await page.waitForTimeout(350);
  await page.screenshot({ path: out + '1-light.png', clip: { x: 0, y: 0, width: 360, height: 420 } });
  await page.mouse.click(2, 2);
  await page.click('#c .bselect-trigger');
  await page.waitForTimeout(350);
  await page.screenshot({ path: out + '2-dark.png', clip: { x: 640, y: 0, width: 400, height: 420 } });
  return 'done';
}
