// all 10 dropdowns side by side in one row; panels stay on screen
// node <browser-automation>/browser.mjs http://localhost:8765/demo-grid.html --script test/qa-oneline.mjs
import os from 'node:os';
export default async function run(page) {
  const o = {};
  await page.setViewportSize({ width: 1280, height: 780 });
  await page.waitForTimeout(500);
  const boxes = [];
  for (let i = 1; i <= 10; i++) boxes.push(await page.locator('#g' + i + ' .bselect-trigger').boundingBox());
  o.sameLine = new Set(boxes.map((b) => Math.round(b.y))).size === 1;
  o.widths = boxes.map((b) => Math.round(b.width));
  o.noOverlap = boxes.every((b, i) => i === 0 || b.x >= boxes[i - 1].x + boxes[i - 1].width - 1);
  o.firstX = Math.round(boxes[0].x); o.lastRight = Math.round(boxes[9].x + boxes[9].width);
  o.pageScrolls = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  // the last (right-most) and a middle dropdown: panel must stay inside the window
  for (const id of ['g10', 'g5', 'g1']) {
    await page.click('#' + id + ' .bselect-trigger');
    await page.waitForTimeout(350);
    const p = await page.locator('#' + id + ' .bselect-panel').boundingBox();
    o['panel_' + id] = { x: Math.round(p.x), right: Math.round(p.x + p.width), inside: p.x >= 0 && p.x + p.width <= 1280 };
    if (id === 'g10') await page.screenshot({ path: os.tmpdir() + '/oneline-open.png', clip: { x: 0, y: 100, width: 1280, height: 560 } });
    await page.mouse.click(2, 2);
  }
  await page.screenshot({ path: os.tmpdir() + '/oneline.png', clip: { x: 0, y: 0, width: 1280, height: 260 } });
  return o;
}
