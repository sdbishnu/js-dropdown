// settings animation checks: tab highlight glides, panes slide, custom inputs expand/collapse, field flashes, reduced motion
// node <browser-automation>/browser.mjs http://localhost:8765/test/layers.html --script test/qa-anim.mjs
import os from 'node:os';
export default async function run(page) {
  const o = {};
  await page.setViewportSize({ width: 1000, height: 760 });
  await page.click('#g .bselect-trigger');
  await page.click('#g .bselect-settings-action');
  await page.waitForTimeout(500);
  // popup pop-in
  o.tabs = await page.locator('#g .bselect-tab').count();
  // tab indicator: sample its left while switching tabs
  await page.evaluate(() => {
    const ind = document.querySelector('#g .bselect-tab-ind');
    window.__ind = [];
    const t0 = performance.now();
    (function tick() { window.__ind.push(Math.round(parseFloat(ind.style.left || '0'))); if (performance.now() - t0 < 450) requestAnimationFrame(tick); else document.documentElement.dataset.ind = JSON.stringify(window.__ind); })();
  });
  await page.click('#g .bselect-tab[title="Dropdown"]');
  await page.waitForTimeout(650);
  const ind = JSON.parse(await page.evaluate(() => document.documentElement.dataset.ind));
  o.indicator = { samples: ind.length, from: ind[0], to: ind[ind.length - 1], distinctSteps: new Set(ind).size };
  o.activeTab = await page.locator('#g .bselect-tab-active').getAttribute('title');
  // pane slide direction var + row stagger vars
  o.paneDir = await page.locator('#g .bselect-pane-active').evaluate((e) => e.style.getPropertyValue('--dir'));
  o.rowStagger = await page.locator('#g .bselect-pane-active .bselect-rowc').evaluateAll((els) => els.slice(0, 4).map((e) => e.style.getPropertyValue('--r')));
  await page.click('#g .bselect-tab[title="Look"]');
  o.paneDirBack = await page.locator('#g .bselect-pane-active').evaluate((e) => e.style.getPropertyValue('--dir'));
  // custom inputs expand / collapse
  await page.click('#g .bselect-tab[title="Button"]');
  const row = '#g .bselect-pane-active .bselect-rowc:has(.bselect-rowc-label:text-is("Size"))';
  const inline = '#g .bselect-pane-active .bselect-custom-inline';
  o.inlineClosedHeight = await page.locator(inline).first().evaluate((e) => Math.round(e.getBoundingClientRect().height));
  await page.click(row + ' button:text-is("Custom")');
  await page.waitForTimeout(350);
  o.inlineOpenHeight = await page.locator(inline).first().evaluate((e) => Math.round(e.getBoundingClientRect().height));
  await page.click(row + ' button:text-is("M")');
  await page.waitForTimeout(350);
  o.inlineClosedAgain = await page.locator(inline).first().evaluate((e) => Math.round(e.getBoundingClientRect().height));
  // flash on apply
  await page.click('#g .bselect-pane-active .bselect-rowc:has(.bselect-rowc-label:text-is("Shape")) button:text-is("Pill")');
  o.flash = await page.evaluate(() => document.querySelector('#g .bselect').classList.contains('bselect-flash'));
  await page.waitForTimeout(800);
  o.flashGone = await page.evaluate(() => !document.querySelector('#g .bselect').classList.contains('bselect-flash'));
  await page.screenshot({ path: os.tmpdir() + '/anim-final.png', clip: { x: 0, y: 150, width: 1000, height: 560 } });
  // reduced motion switches the animations off
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.click('#g .bselect-tab[title="Look"]');
  o.reduced = await page.locator('#g .bselect-pane-active').evaluate((e) => getComputedStyle(e).animationName);
  return o;
}
