export default async function run(page) {
  await page.setViewportSize({ width: 820, height: 640 });
  await page.click('.bselect-trigger'); await page.waitForTimeout(300);
  await page.click('.bselect-settings-action'); await page.waitForTimeout(500);
  const tabs = page.locator('.bselect-settings .bselect-tabs button, .bselect-settings [role=tab]');
  const out = [];
  const n = await tabs.count();
  const measure = () => page.evaluate(() => {
    const r = [];
    document.querySelectorAll('.bselect-settings .bselect-seg:not(.bselect-seg-mini), .bselect-settings .bselect-tabs').forEach((seg) => {
      if (!seg.offsetParent) return;
      const cs = getComputedStyle(seg, '::before');
      const on = seg.querySelector('.bselect-seg-on, .bselect-tab-on, [aria-selected=true], .active');
      r.push({ cls: seg.className.slice(0, 30), before: cs.width, tx: cs.transform, on: on ? Math.round(on.getBoundingClientRect().width) + '/' + Math.round(on.getBoundingClientRect().left - seg.getBoundingClientRect().left) : null, n: seg.style.getPropertyValue('--n'), i: seg.style.getPropertyValue('--i') });
    });
    return r;
  });
  for (let i = 0; i < n; i++) { await tabs.nth(i).click(); await page.waitForTimeout(450); out.push(await measure()); }
  return out;
}
