// sub text: field, per-option map, on/off, place; settings button on/off
export default async function run(page) {
  await page.setViewportSize({ width: 900, height: 700 });
  const o = {};
  await page.click('.bselect-trigger'); await page.waitForTimeout(300);
  o.subs = await page.locator('.bselect-panel .bselect-item-sub').count();
  await page.click('.bselect-settings-action'); await page.waitForTimeout(400);
  await page.click('.bselect-settings .bselect-tab[title="Dropdown"]'); await page.waitForTimeout(400);
  const pane = '.bselect-settings .bselect-pane-active';
  // per option text
  const rowInput = page.locator(pane + ' .bselect-subrows input').first();
  await rowInput.scrollIntoViewIfNeeded(); await rowInput.fill('Custom note'); await rowInput.press('Tab'); await page.waitForTimeout(250);
  o.first = await page.locator('.bselect-panel .bselect-item .bselect-item-sub').first().textContent();
  // place beside
  await page.click(pane + ' .bselect-seg button:text-is("Beside")'); await page.waitForTimeout(250);
  o.beside = await page.locator('.bselect-panel .bselect-sub-beside').count();
  // sub text off
  await page.click(pane + ' .bselect-pill:has-text("Sub text")'); await page.waitForTimeout(250);
  o.off = await page.locator('.bselect-panel .bselect-item-sub').count();
  await page.click(pane + ' .bselect-pill:has-text("Sub text")'); await page.waitForTimeout(250);
  o.on = await page.locator('.bselect-panel .bselect-item-sub').count();
  // settings button off
  await page.click(pane + ' .bselect-pill:has-text("Settings button")'); await page.waitForTimeout(400);
  o.gearAfterOff = await page.locator('.bselect-panel .bselect-settings-action').count();
  if (o.subs < 5 || o.first !== 'Custom note' || o.beside < 1 || o.off !== 0 || o.on < 5 || o.gearAfterOff !== 0) throw new Error(JSON.stringify(o));
  return o;
}
