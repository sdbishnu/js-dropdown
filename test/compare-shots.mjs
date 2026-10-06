// Takes the same screenshots of the old (compare-old.html) and new (compare-new.html) page.
// node <browser-automation>/browser.mjs http://localhost:8765/test/compare-new.html --script test/compare-shots.mjs
import os from 'node:os';
export default async function run(page) {
  const isOld = page.url().includes('compare-old');
  const P = isOld ? 'o' : 'n';
  const out = os.tmpdir() + '/cmp-' + (isOld ? 'old' : 'new') + '-';
  const clip = { x: 0, y: 0, width: 420, height: 640 };
  const t = (n) => '#' + P + n + ' .bselect-trigger';
  const shot = (name) => page.screenshot({ path: out + name + '.png', clip });
  await page.setViewportSize({ width: 460, height: 700 });
  await page.waitForTimeout(500);
  await shot('0-closed');
  await page.click(t(1));
  await page.waitForTimeout(500);
  await shot('1-single-open');
  await page.click('#' + P + '1 .bselect-list > .bselect-item:nth-child(3)');
  await page.click(t(2));
  await page.waitForTimeout(300);
  await page.click('#' + P + '2 .bselect-list > .bselect-item:nth-child(2)');
  await page.click('#' + P + '2 .bselect-list > .bselect-item:nth-child(4)');
  await page.waitForTimeout(300);
  await shot('2-multi-open');
  await page.click('#' + P + '2 .bselect-selected-toggle');
  await page.waitForTimeout(400);
  await shot('3-multi-drawer');
  await page.click('#' + P + '2 .bselect-selected-toggle');
  await page.fill('#' + P + '2 .bselect-search input', 'zzz');
  await page.waitForTimeout(500);
  await shot('4-no-match');
  await page.fill('#' + P + '2 .bselect-search input', 'Ward number 1');
  await page.waitForTimeout(500);
  await shot('5-search-results');
  return 'done';
}
