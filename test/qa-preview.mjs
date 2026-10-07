// hover preview: 5 styles, delay, max rows, sample preview from the gear, colours follow the field (light / dark)
export default async function run(page) {
  await page.setViewportSize({ width: 1000, height: 800 });
  const o = {};
  const T = (i) => page.locator('.bselect-trigger >> nth=' + i);
  const pv = () => page.locator('.bselect-pv');
  const show = async (i) => { await page.mouse.move(2, 2); await page.waitForTimeout(250); await T(i).hover(); await page.waitForSelector('.bselect-pv', { timeout: 4000 }); await page.waitForTimeout(150); };
  // multiple, default look = card
  await show(0);
  o.defaultClass = await pv().getAttribute('class');
  o.rows = await pv().locator('.bselect-pv-row').count();
  o.more = await pv().locator('.bselect-pv-more').textContent();
  o.sub = await pv().locator('.bselect-pv-text small').first().textContent();
  o.pics = await pv().locator('.bselect-pv-pic').count();
  o.count = await pv().locator('.bselect-pv-count').textContent();
  // single value = one big card
  await show(1);
  o.singleBig = await pv().locator('.bselect-pv-row-big').count();
  // dark field = dark preview
  await show(2);
  o.darkBg = await pv().evaluate((e) => getComputedStyle(e).backgroundColor);
  await page.mouse.move(2, 2); await page.waitForTimeout(300);
  o.hidden = await pv().count();
  // the gear: change the style, it shows by itself
  await T(0).click(); await page.waitForTimeout(300);
  await page.click('.bselect-settings-action'); await page.waitForTimeout(500);
  const S = '.bselect-settings';
  await page.click(S + ' .bselect-tab[title="Button"]'); await page.waitForTimeout(400);
  o.styles = {};
  for (const [label, cls] of [['Chips', 'chips'], ['List', 'list'], ['Tip', 'tooltip'], ['Details', 'details'], ['Card', 'card']]) {
    await page.click(S + ' .bselect-pane-active [data-key="previewStyle"] .bselect-seg button:text-is("' + label + '")'); await page.waitForTimeout(350);
    o.styles[cls] = { cls: await pv().count() ? (await pv().getAttribute('class')).includes('bselect-pv-' + cls) : false, items: await pv().locator('.bselect-pv-chip, .bselect-pv-ol li, .bselect-pv-tr, .bselect-pv-row').count(), text: ((await pv().innerText()) || '').slice(0, 60) };
  }
  // max rows
  const num = page.locator(S + ' .bselect-pane-active [data-key="previewMax"] input'); await num.fill('3'); await num.dispatchEvent('input');
  await page.click(S + ' .bselect-pane-active .bselect-test-btn'); await page.waitForTimeout(300);
  o.max3 = await pv().locator('.bselect-pv-row').count();
  o.max3more = await pv().locator('.bselect-pv-more').textContent();
  const tip = styles => styles;
  if (!/bselect-pv-card/.test(o.defaultClass) || o.rows !== 8 || !/\+ 4 more/.test(o.more) || !/EMP-/.test(o.sub) || o.pics < 1 || o.count !== '12') throw new Error('card ' + JSON.stringify(o));
  if (o.singleBig !== 1) throw new Error('single big ' + JSON.stringify(o));
  if (/255, 255, 255/.test(o.darkBg) || o.hidden !== 0) throw new Error('dark / hide ' + JSON.stringify(o));
  for (const k of ['chips', 'list', 'tooltip', 'details', 'card']) if (!o.styles[k].cls) throw new Error('style ' + k + ' ' + JSON.stringify(o.styles));
  if (o.styles.chips.items < 8 || o.styles.list.items < 8 || o.styles.details.items < 8) throw new Error('style items ' + JSON.stringify(o.styles));
  if (o.max3 !== 3 || !/\+ 9 more/.test(o.max3more)) throw new Error('max rows ' + JSON.stringify(o));
  return o;
}
