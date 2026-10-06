// the panel arrow must stay visible while opening, closing, re-opening and switching between dropdowns
// node <browser-automation>/browser.mjs http://localhost:8765/demo-grid.html --script test/qa-arrow.mjs
export default async function run(page) {
  const o = {};
  await page.setViewportSize({ width: 1280, height: 780 });
  await page.waitForTimeout(400);
  const sample = async (label, ms = 1000) => {
    await page.evaluate((m) => {
      const out = [];
      const t0 = performance.now();
      (function tick() {
        const a = document.querySelector('.bselect-open .bselect-panel-anchor');
        const cs = a ? getComputedStyle(a) : null;
        const r = a ? a.getBoundingClientRect() : null;
        out.push(a ? [Math.round(performance.now() - t0), +cs.opacity, Math.round(r.width), cs.display === 'none' ? 0 : 1] : [Math.round(performance.now() - t0), null]);
        if (performance.now() - t0 < m) requestAnimationFrame(tick); else document.documentElement.dataset.arrow = JSON.stringify(out);
      })();
    }, ms);
    await page.waitForTimeout(ms + 100);
    const s = JSON.parse(await page.evaluate(() => document.documentElement.dataset.arrow));
    const hidden = s.filter((r) => r[1] === null || r[1] < 0.99 || r[3] === 0);
    o[label] = { frames: s.length, hiddenFrames: hidden.length, minOpacity: Math.min(...s.map((r) => (r[1] === null ? 0 : r[1]))) };
  };
  // 1) plain open
  await page.click('#g1 .bselect-trigger');
  await sample('open');
  // 2) switch to another dropdown while one is open
  await page.evaluate(() => {});
  await page.click('#g5 .bselect-trigger');
  await sample('switch');
  // 3) close and re-open the same one several times
  for (let i = 0; i < 3; i++) { await page.mouse.click(2, 2); await page.waitForTimeout(150); await page.click('#g5 .bselect-trigger'); }
  await sample('reopen');
  // 4) switch back and forth quickly
  for (const id of ['g6', 'g2', 'g9', 'g1']) { await page.click('#' + id + ' .bselect-trigger'); await page.waitForTimeout(120); }
  await sample('rapid');
  o.arrowCount = await page.locator('.bselect-open .bselect-panel-anchor').count();
  return o;
}
