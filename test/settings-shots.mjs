// screenshots of every settings tab (dark + light): node <browser-automation>/browser.mjs http://localhost:8765/test/design.html --script test/settings-shots.mjs
import os from 'node:os';
export default async function run(page) {
  const out = os.tmpdir() + '/settings-';
  await page.setViewportSize({ width: 1040, height: 700 });
  const shoot = async (id, name) => {
    const box = await page.locator(id + ' .bselect-settings').boundingBox();
    await page.screenshot({ path: out + name + '.png', clip: { x: box.x - 6, y: box.y - 6, width: box.width + 12, height: box.height + 12 } });
  };
  for (const [id, theme] of [['#f', 'dark'], ['#g', 'light']]) {
    await page.click(id + ' .bselect-trigger');
    await page.click(id + ' .bselect-settings-action');
    await page.waitForTimeout(350);
    for (const [i, tab] of ['behavior', 'look', 'images', 'custom', 'export'].entries()) {
      await page.click(id + ' .bselect-tab >> nth=' + i);
      await page.waitForTimeout(150);
      await shoot(id, theme + '-' + tab);
    }
    await page.mouse.click(2, 2);
  }
  return 'done';
}
