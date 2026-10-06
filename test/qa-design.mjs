// design checks: pictures (image / emoji / icon class / initials), settings tabs, palettes, custom background, reset
// node <browser-automation>/browser.mjs http://localhost:8765/test/design.html --script test/qa-design.mjs
export default async function run(page) {
  const o = {};
  const cnt = (s) => page.locator(s).count();
  const css = (sel, prop) => page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s))[p], [sel, prop]);

  // 1. picture kinds in list A (image, emoji, icon class, initials, custom colour)
  await page.click('#a .bselect-trigger');
  o.kinds = await page.locator('#a .bselect-list .bselect-item-pic').evaluateAll((els) => els.map((e) => [...e.classList].find((c) => c.startsWith('bselect-pic-'))));
  const bg = await page.locator('#a .bselect-list .bselect-item-pic.bselect-pic-initials').evaluateAll((els) => els.map((e) => e.style.background));
  o.initialsColours = bg.length + ' initials, distinct colours: ' + new Set(bg).size;
  o.customColourUsed = bg.some((c) => c.includes('15, 118, 110') || c.includes('#0f766e'));
  await page.mouse.click(2, 2);
  // stable colour: open again and compare
  await page.click('#a .bselect-trigger');
  const bg2 = await page.locator('#a .bselect-list .bselect-item-pic.bselect-pic-initials').evaluateAll((els) => els.map((e) => e.style.background));
  o.colourStable = JSON.stringify(bg) === JSON.stringify(bg2);
  await page.mouse.click(2, 2);

  // 2. palette + custom background drive dark class and text colour
  o.paperDark = await cnt('#d.bselect-dark, #d .bselect-dark, [id=d] .bselect-custom-bg');
  o.customBg = { dark: await page.evaluate(() => document.querySelector('#e .bselect').classList.contains('bselect-dark')), text: await css('#e .bselect-trigger-text', 'color') };

  // 3. settings: tabs, switch toggles images off/on, palette click, custom background, reset
  await page.click('#g .bselect-trigger');
  await page.click('#g .bselect-settings-action');
  o.tabs = await page.locator('#g .bselect-tab').allInnerTexts();
  await page.click('#g .bselect-tab[title="Images"]');
  o.imagesSwitchOn = await page.locator('#g .bselect-pane-active .bselect-pill-on').count();
  o.picsBefore = await cnt('#g .bselect-list > .bselect-item .bselect-item-pic');
  await page.click('#g .bselect-pane-active .bselect-pill >> nth=0');
  o.picsAfterOff = await cnt('#g .bselect-list > .bselect-item .bselect-item-pic');
  await page.click('#g .bselect-pane-active .bselect-pill >> nth=0');
  o.picsAfterOn = await cnt('#g .bselect-list > .bselect-item .bselect-item-pic');
  await page.click('#g .bselect-tab >> nth=1');
  await page.click('#g .bselect-pane-active .bselect-swatch >> nth=2');   // Midnight (0 = default, 1 = slate)
  o.afterPalette = { dark: await page.evaluate(() => document.querySelector('#g .bselect').classList.contains('bselect-dark')), bg: await css('#g .bselect-panel', 'backgroundColor') };
  await page.click('#g .bselect-pane-active .bselect-swatch >> nth=6');   // Paper
  o.afterPaper = { dark: await page.evaluate(() => document.querySelector('#g .bselect').classList.contains('bselect-dark')), bg: await css('#g .bselect-panel', 'backgroundColor') };
  await page.click('#g .bselect-settings-footer button:has-text("Reset")');
  await page.waitForTimeout(200);
  o.afterReset = { dark: await page.evaluate(() => document.querySelector('#g .bselect').classList.contains('bselect-dark')), custom: await page.evaluate(() => document.querySelector('#g .bselect').classList.contains('bselect-custom-bg')), pics: await cnt('#g .bselect-list > .bselect-item .bselect-item-pic') };
  return o;
}
