// Tailwind-style settings drawer screenshots: node <browser-automation>/browser.mjs http://localhost:8765/demo-grid.html --script test/drawer-shots.mjs
import os from 'node:os';
export default async function run(page) {
  const out = os.tmpdir() + '/drawer-';
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.click('.demo-theme-switch button:has-text("Light")');
  await page.click('#g4 .bselect-trigger');
  await page.click('#g4 .bselect-settings-action');
  await page.waitForTimeout(600);
  await page.screenshot({ path: out + 'light-behavior.png' });
  for (const [i, n] of ['look', 'images', 'custom', 'export'].entries()) {
    await page.click('.bselect-drawer .bselect-tab >> nth=' + (i + 1));
    await page.waitForTimeout(250);
    await page.screenshot({ path: out + 'light-' + n + '.png', clip: { x: 840, y: 0, width: 440, height: 820 } });
  }
  await page.click('.bselect-drawer .bselect-settings-close');
  await page.mouse.click(2, 2);
  await page.click('.demo-theme-switch button:has-text("Dark")');
  await page.waitForTimeout(300);
  await page.click('#g4 .bselect-trigger');
  await page.click('#g4 .bselect-settings-action');
  await page.waitForTimeout(600);
  await page.screenshot({ path: out + 'dark-behavior.png' });
  await page.click('.bselect-drawer .bselect-tab >> nth=1');
  await page.waitForTimeout(250);
  await page.screenshot({ path: out + 'dark-look.png', clip: { x: 840, y: 0, width: 440, height: 820 } });
  return 'done';
}
