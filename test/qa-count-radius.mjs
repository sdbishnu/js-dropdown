// count line at the bottom closes the panel with the panel radius; the list above is square
export default async function run(page) {
  await page.setViewportSize({ width: 1000, height: 760 });
  await page.click('.bselect-trigger >> nth=1'); await page.waitForTimeout(300);
  const o = await page.evaluate(() => {
    const p = document.querySelector('.bselect-panel'); const info = p.querySelector('.bselect-infobar'); const wrap = p.querySelector('.bselect-list-wrap');
    return { panel: getComputedStyle(p).borderBottomLeftRadius, info: getComputedStyle(info).borderBottomLeftRadius + '/' + getComputedStyle(info).borderBottomRightRadius, wrap: getComputedStyle(wrap).borderBottomLeftRadius };
  });
  await page.screenshot({ path: process.env.TEMP + '/c-radius.png', clip: { x: 0, y: 150, width: 460, height: 460 } });
  if (o.wrap !== '0px' || o.info.split('/')[0] === '0px' || o.info.split('/')[0] !== o.info.split('/')[1]) throw new Error(JSON.stringify(o));
  return o;
}
