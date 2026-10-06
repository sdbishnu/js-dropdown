// automatic retry, keep the last rows + Retry note, stale requests aborted
export default async function run(page) {
  const o = {};
  const api = (path) => page.request.get('http://localhost:8765' + path);
  const log = async () => (await (await api('/api/log')).json());
  // 1) two failures then success: retried automatically, list shows
  await api('/api/failnext?n=2');
  await page.click('.bselect-trigger >> nth=0'); await page.waitForSelector('.bselect-panel .bselect-item', { timeout: 8000 });
  o.afterRetry = await page.locator('.bselect-panel .bselect-item').count();
  await page.mouse.click(2, 2); await page.waitForTimeout(150);
  // 2) dropdown b has retry:0 - load more fails -> rows stay, note with Retry
  await page.click('.bselect-trigger >> nth=1'); await page.waitForSelector('.bselect-panel .bselect-item');
  await api('/api/failnext?n=1');
  await page.locator('.bselect-panel .bselect-list-wrap').evaluate((w) => { w.scrollTop = w.scrollHeight; });
  await page.waitForSelector('.bselect-note-action', { timeout: 8000 });
  o.rowsKept = await page.locator('.bselect-panel .bselect-item').count();
  o.note = await page.locator('.bselect-note').textContent();
  await page.click('.bselect-note-action');
  await page.waitForFunction(() => document.querySelectorAll('.bselect-panel .bselect-item').length > 20, null, { timeout: 8000 });
  o.afterRetryClick = await page.locator('.bselect-panel .bselect-item').count();
  // 3) typing fast: older requests are cancelled, only the newest answer is shown
  await page.fill('.bselect-panel input', 'Item 1'); await page.fill('.bselect-panel input', 'Item 12'); await page.waitForTimeout(900);
  o.rowsFiltered = await page.locator('.bselect-panel .bselect-item').count();
  if (o.afterRetry < 1) throw new Error('auto retry ' + JSON.stringify(o));
  if (o.rowsKept < 20 || !/Could not load more/.test(o.note) || o.afterRetryClick <= 20) throw new Error('keep rows ' + JSON.stringify(o));
  if (o.rowsFiltered < 1) throw new Error('search ' + JSON.stringify(o));
  return o;
}
