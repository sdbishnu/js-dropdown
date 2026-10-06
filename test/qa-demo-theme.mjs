// light/dark switch on the demo pages: node <browser-automation>/browser.mjs http://localhost:8765/demo.html --script test/qa-demo-theme.mjs
import os from 'node:os';
export default async function run(page) {
  const o = {};
  const state = () => page.evaluate(() => ({
    page: document.documentElement.getAttribute('data-demo-theme'),
    dark: [...document.querySelectorAll('.bselect')].map((e) => e.classList.contains('bselect-dark')),
    bodyBg: getComputedStyle(document.body).backgroundColor,
  }));
  await page.setViewportSize({ width: 900, height: 620 });
  await page.click('.demo-theme-switch button:has-text("Light")');
  o.light = await state();
  await page.click('.demo-theme-switch button:has-text("Dark")');
  await page.waitForTimeout(300);
  o.dark = await state();
  await page.click('#b .bselect-trigger');
  await page.waitForTimeout(300);
  await page.screenshot({ path: os.tmpdir() + '/demo-dark.png' });
  await page.mouse.click(2, 2);
  await page.reload();
  await page.waitForTimeout(500);
  o.afterReload = await state();
  await page.click('.demo-theme-switch button:has-text("Light")');
  await page.waitForTimeout(200);
  await page.click('#b .bselect-trigger');
  await page.waitForTimeout(300);
  await page.screenshot({ path: os.tmpdir() + '/demo-light.png' });
  o.lightAgain = await state();
  return o;
}
