// result info (top), Apply / Cancel commit mode, texts
export default async function run(page) {
  const o = {};
  const ev = () => page.evaluate(() => (document.documentElement.dataset.ev || '').split(',').filter(Boolean));
  await page.click('.bselect-trigger'); await page.waitForTimeout(250);
  o.info = await page.locator('.bselect-infobar').textContent();
  o.apply = await page.locator('.bselect-footer-apply').textContent();
  const items = page.locator('.bselect-panel .bselect-item');
  await items.nth(0).click(); await items.nth(1).click(); await page.waitForTimeout(100);
  o.pending = await ev();
  await page.locator('.bselect-footer-cancel').click(); await page.waitForTimeout(150);
  o.afterCancel = await ev();
  await page.click('.bselect-trigger'); await page.waitForTimeout(250);
  await page.locator('.bselect-panel .bselect-item').nth(2).click();
  await page.locator('.bselect-footer-apply').click(); await page.waitForTimeout(150);
  o.afterApply = await ev();
  if (await page.locator('.bselect-viewtab').count()) throw new Error('tabs should be gone');
  if (!/1.20 of 100/.test(o.info)) throw new Error('info ' + o.info);
  if (!/Übernehmen/.test(o.apply)) throw new Error('texts not applied');
  if (o.pending.some((e) => e.startsWith('change'))) throw new Error('change fired before Apply: ' + o.pending);
  if (!o.afterCancel.includes('cancel') || o.afterCancel.some((e) => e.startsWith('change'))) throw new Error('cancel wrong ' + o.afterCancel);
  if (!o.afterApply.includes('apply') || !o.afterApply.includes('change:3')) throw new Error('apply wrong ' + o.afterApply);
  return o;
}
