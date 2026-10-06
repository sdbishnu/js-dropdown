// sample the panel position every frame after opening: any back-and-forth = a visible "jump"
// node <browser-automation>/browser.mjs http://localhost:8765/demo-grid.html --script test/qa-jump.mjs
export default async function run(page) {
  const out = {};
  await page.setViewportSize({ width: 1280, height: 820 });
  async function sample(sel) {
    await page.evaluate((s) => {
      window.__trace = [];
      const t0 = performance.now();
      const tick = () => {
        const p = document.querySelector(s + ' .bselect-panel');
        const r = p ? p.getBoundingClientRect() : null;
        window.__trace.push(r ? [Math.round(performance.now() - t0), +r.top.toFixed(1), +r.height.toFixed(1), +r.left.toFixed(1), +r.width.toFixed(1), Math.round(window.scrollY)] : [Math.round(performance.now() - t0), null]);
        if (performance.now() - t0 < 700) requestAnimationFrame(tick);
        else document.documentElement.dataset.trace = JSON.stringify(window.__trace);
      };
      requestAnimationFrame(tick);
    }, sel);
    await page.click(sel + ' .bselect-trigger');
    await page.waitForTimeout(900);
    const trace = JSON.parse(await page.evaluate(() => document.documentElement.dataset.trace));
    const rows = trace.filter((r) => r[1] !== null);
    const tops = rows.map((r) => r[1]);
    const heights = rows.map((r) => r[2]);
    const lefts = rows.map((r) => r[3]);
    const widths = rows.map((r) => r[4]);
    const changes = (a) => a.reduce((n, v, i) => (i && Math.abs(v - a[i - 1]) > 0.5 ? n + 1 : n), 0);
    const reversals = (a) => { let n = 0, dir = 0; for (let i = 1; i < a.length; i++) { const d = a[i] - a[i - 1]; if (Math.abs(d) < 0.5) continue; const s = d > 0 ? 1 : -1; if (dir && s !== dir) n++; dir = s; } return n; };
    out[sel] = { frames: rows.length, topChanges: changes(tops), topReversals: reversals(tops), heightChanges: changes(heights), leftChanges: changes(lefts), widthChanges: changes(widths), topRange: [Math.min(...tops), Math.max(...tops)], firstFrames: rows.slice(0, 8) };
    await page.mouse.click(2, 2);
    await page.waitForTimeout(300);
  }
  await sample('#g1');   // local, 12 rows
  await sample('#g2');   // server, lazy
  await sample('#g3');   // multiple (drawer)
  return out;
}
