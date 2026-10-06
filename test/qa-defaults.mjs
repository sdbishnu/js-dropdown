// the default look is LIGHT (also when the operating system is dark); only mode:'auto' / 'dark' go dark
// node <browser-automation>/browser.mjs http://localhost:8765/test/mode-check.html --script test/qa-defaults.mjs
export default async function run(page) {
  const o = {};
  const lum = (rgb) => { const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(rgb); return m ? Math.round((0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 2.55) : null; };
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.reload();
    await page.waitForTimeout(350);
    const r = {};
    for (const id of ['def', 'auto', 'dark', 'pdark']) {
      const root = '#' + id + ' .bselect';
      const hasDark = await page.locator(root).evaluate((e) => e.classList.contains('bselect-dark'));
      const custom = await page.locator(root).evaluate((e) => e.classList.contains('bselect-custom-bg'));
      await page.click('#' + id + ' .bselect-trigger');
      await page.waitForTimeout(250);
      const panelBg = await page.locator('#' + id + ' .bselect-panel').evaluate((e) => getComputedStyle(e).backgroundColor);
      const triggerBg = await page.locator('#' + id + ' .bselect-trigger').evaluate((e) => getComputedStyle(e).backgroundImage + ' ' + getComputedStyle(e).backgroundColor);
      await page.mouse.click(2, 2);
      r[id] = { dark: hasDark, customBg: custom, panelLuma: lum(panelBg) };
    }
    o[scheme + ' OS'] = r;
    // expectations
    const ok = scheme === 'light'
      ? !r.def.dark && !r.def.customBg && r.def.panelLuma > 90 && !r.auto.dark && r.dark.dark && !r.pdark.dark && r.pdark.panelLuma < 30
      : !r.def.dark && !r.def.customBg && r.def.panelLuma > 90 && r.auto.dark && r.dark.dark && !r.pdark.dark && r.pdark.panelLuma < 30;
    o[scheme + ' OS ok'] = ok;
    if (!ok) throw new Error('default look is wrong with a ' + scheme + ' OS: ' + JSON.stringify(r));
  }
  return o;
}
