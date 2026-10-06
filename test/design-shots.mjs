// screenshots for the design audit (light + dark): node <browser-automation>/browser.mjs http://localhost:8765/test/design.html --script test/design-shots.mjs
import os from 'node:os';
export default async function run(page) {
  const out = os.tmpdir() + '/design-';
  await page.setViewportSize({ width: 1040, height: 760 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: out + '0-closed.png' });
  // dark multi chips open
  await page.click('#b .bselect-trigger');
  await page.waitForTimeout(350);
  await page.screenshot({ path: out + '1-dark-multi-open.png' });
  await page.click('#b .bselect-selected-toggle');
  await page.waitForTimeout(350);
  await page.screenshot({ path: out + '2-dark-drawer.png' });
  await page.mouse.click(2, 2);
  // dark single with images + sub
  await page.click('#c .bselect-trigger');
  await page.waitForTimeout(350);
  await page.screenshot({ path: out + '3-dark-images.png' });
  await page.mouse.click(2, 2);
  // dark settings
  await page.click('#f .bselect-trigger');
  await page.click('#f .bselect-settings-action');
  await page.waitForTimeout(400);
  await page.screenshot({ path: out + '4-dark-settings-behavior.png' });
  await page.click('#f .bselect-tab >> nth=1');
  await page.waitForTimeout(250);
  await page.screenshot({ path: out + '5-dark-settings-look.png' });
  await page.click('#f .bselect-tab >> nth=2');
  await page.waitForTimeout(250);
  await page.screenshot({ path: out + '6-dark-settings-images.png' });
  await page.mouse.click(2, 2);
  // light settings look tab
  await page.click('#g .bselect-trigger');
  await page.click('#g .bselect-settings-action');
  await page.click('#g .bselect-tab >> nth=1');
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + '7-light-settings-look.png' });
  await page.mouse.click(2, 2);
  // dark server list: skeleton + loaded + hint
  await page.click('#h .bselect-trigger');
  await page.waitForTimeout(700);
  await page.screenshot({ path: out + '8-dark-server.png' });
  await page.fill('#h .bselect-search input', 'zzz');
  await page.waitForTimeout(800);
  await page.screenshot({ path: out + '9-dark-nomatch.png' });
  return 'done';
}
