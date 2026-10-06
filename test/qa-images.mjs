// per-option images: imageMap, broken-image fallback, editor in settings (emoji, text), export
// node <browser-automation>/browser.mjs http://localhost:8765/test/design.html --script test/qa-images.mjs
export default async function run(page) {
  const o = {};
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.click('#i .bselect-trigger');
  await page.waitForTimeout(500);
  o.kinds = await page.locator('#i .bselect-list .bselect-item-pic').evaluateAll((els) => els.map((e) => [...e.classList].find((c) => c.startsWith('bselect-pic-') && c !== 'bselect-pic') + ':' + e.textContent));
  // editor
  await page.click('#i .bselect-settings-action');
  await page.click('#i .bselect-tab[title="Images"]');
  o.editorRows = await page.locator('#i .bselect-imgrow').count();
  // type an emoji for row 2 (Plain Name)
  await page.fill('#i .bselect-imgrow >> nth=1 >> input.bselect-text-input', '\u{1F680}');
  await page.press('#i .bselect-imgrow >> nth=1 >> input.bselect-text-input', 'Tab');
  await page.waitForTimeout(150);
  o.afterTyped = await page.locator('#i .bselect-list .bselect-item-pic').evaluateAll((els) => els.map((e) => e.textContent));
  // emoji picker for row 3 (Mapped One -> change)
  await page.click('#i .bselect-imgrow >> nth=2 >> button[title="Pick an emoji"]');
  o.emojiBar = await page.locator('#i .bselect-emoji-bar').isVisible();
  await page.click('#i .bselect-emoji-bar button >> nth=5');
  await page.waitForTimeout(150);
  o.afterPicker = await page.locator('#i .bselect-list .bselect-item-pic').evaluateAll((els) => els.map((e) => e.textContent));
  // clear row 2
  await page.click('#i .bselect-imgrow >> nth=1 >> button[title="Remove the custom picture"]');
  await page.waitForTimeout(150);
  o.afterClear = await page.locator('#i .bselect-list .bselect-item-pic').evaluateAll((els) => els.map((e) => e.textContent));
  // export contains imageMap
  await page.click('#i .bselect-tab[title="Export"]');
  await page.click('#i .bselect-pane-active .bselect-seg button:has-text("JSON")');
  o.exportHasMap = (await page.inputValue('#i .bselect-pane-active .bselect-code')).includes('imageMap');
  return o;
}
