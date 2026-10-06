// separate button / dropdown design: node <browser-automation>/browser.mjs http://localhost:8765/test/separate.html --script test/qa-separate.mjs
import os from 'node:os';
export default async function run(page) {
  const o = {};
  const css = (sel, prop) => page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s))[p], [sel, prop]);
  const h = async (sel) => Math.round((await page.locator(sel).first().boundingBox()).height);
  await page.setViewportSize({ width: 900, height: 700 });
  // closed buttons
  o.button = {
    a: { h: await h('#a .bselect-trigger'), radius: await css('#a .bselect-trigger', 'borderTopLeftRadius'), bg: await css('#a .bselect-trigger', 'backgroundColor'), border: await css('#a .bselect-trigger', 'borderTopColor') },
    b: { h: await h('#b .bselect-trigger'), radius: await css('#b .bselect-trigger', 'borderTopLeftRadius') },
    d: { h: await h('#d .bselect-trigger'), radius: await css('#d .bselect-trigger', 'borderTopLeftRadius') },
  };
  const panelInfo = async (id) => {
    await page.click(id + ' .bselect-trigger');
    await page.waitForTimeout(350);
    const info = await page.evaluate((s) => { const p = document.querySelector(s + ' .bselect-panel'); const cs = getComputedStyle(p); const trig = getComputedStyle(document.querySelector(s + ' .bselect-trigger')); return { classes: p.className, bg: cs.backgroundColor, radius: cs.borderTopLeftRadius, color: getComputedStyle(p.querySelector('.bselect-item')).color, triggerBg: trig.backgroundColor, rows: p.classList.contains('x') }; }, id);
    await page.screenshot({ path: os.tmpdir() + '/sep-' + id.slice(1) + '.png', clip: { x: 0, y: 0, width: 900, height: 420 } });
    await page.mouse.click(2, 2);
    await page.waitForTimeout(200);
    return info;
  };
  o.panelA = await panelInfo('#a');
  o.panelB = await panelInfo('#b');
  o.panelC = await panelInfo('#c');
  o.panelD = await panelInfo('#d');
  return o;
}
