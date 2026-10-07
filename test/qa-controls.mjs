// every control of the settings gear (tab by tab): change it -> the dropdown's config changes, put it back -> the config is the same again
export default async function run(page) {
  await page.setViewportSize({ width: 1100, height: 800 });
  const report = [];
  const TABS = ['Behavior', 'Look', 'Button', 'Dropdown', 'List', 'Data', 'Images'];
  const S = '.bselect-settings';
  for (const [t, mode] of [[0, 'single'], [1, 'multiple']]) {
    await page.evaluate((t) => { document.documentElement.dataset.t = t ? 'b' : 'a'; }, t);
    const cfg = () => page.evaluate(() => { document.dispatchEvent(new CustomEvent('dumpcfg')); return document.documentElement.dataset.cfg; });
    await page.click('.bselect-trigger >> nth=' + t); await page.waitForTimeout(300);
    await page.click('.bselect-settings-action'); await page.waitForTimeout(500);
    for (const tab of TABS) {
      await page.click(S + ' .bselect-tab[title="' + tab + '"]'); await page.waitForTimeout(400);
      const keys = await page.evaluate(() => [...document.querySelectorAll('.bselect-settings .bselect-pane-active [data-key]')].map((e) => e.getAttribute('data-key')));
      for (const key of [...new Set(keys)]) {
        const ensure = async () => { if (!(await page.locator(S + ' .bselect-pane-active[data-tab="' + tab.toLowerCase() + '"]').count())) { await page.click(S + ' .bselect-tab[title="' + tab + '"]'); await page.waitForTimeout(400); } };
        const row = () => page.locator(S + ' .bselect-pane-active [data-key="' + key + '"]').first();
        await ensure();
        if (!(await row().count())) { report.push({ mode, tab, key, result: 'missing' }); continue; }
        const label = ((await row().innerText()).split(/\r?\n/)[0] || key).trim();
        const before = await cfg();
        let kind = '', undo = async () => {};
        const cls = await row().getAttribute('class');
        if (/bselect-pill/.test(cls || '')) {
          kind = 'switch'; await row().click(); undo = async () => { await ensure(); await row().click(); };
        } else if (await row().locator('.bselect-seg button').count()) {
          kind = 'choice';
          const btns = row().locator('.bselect-seg button');
          const n = await btns.count(); let cur = -1, pick = -1;
          for (let i = 0; i < n; i++) { const c = await btns.nth(i).getAttribute('class'); if (/bselect-seg-on/.test(c || '')) cur = i; }
          for (let i = 0; i < n; i++) { const txt = await btns.nth(i).textContent(); if (i !== cur && txt.trim() !== 'Custom') { pick = i; break; } }
          if (pick < 0) { report.push({ mode, tab, key, kind, result: 'no alternative' }); continue; }
          await btns.nth(pick).click(); undo = async () => { await ensure(); await row().locator('.bselect-seg button').nth(Math.max(cur, 0)).click(); };
        } else if (await row().locator('input.bselect-text-input').count()) {
          kind = 'text'; const i = row().locator('input.bselect-text-input'); await i.fill('zz'); await i.press('Tab');
          undo = async () => { await ensure(); const j = row().locator('input.bselect-text-input'); await j.fill(''); await j.press('Tab'); };
        } else if (await row().locator('input.bselect-num').count()) {
          kind = 'number'; const i = row().locator('input.bselect-num'); await i.fill('7'); await i.dispatchEvent('input');
          undo = async () => { await ensure(); await row().locator('.bselect-field-clear').click(); };
        } else if (await row().locator('input.bselect-colour').count()) {
          kind = 'colour'; await row().locator('input.bselect-colour').fill('#aa5500');
          undo = async () => { await ensure(); await row().locator('.bselect-field-clear').click(); };
        } else { report.push({ mode, tab, key, result: 'unknown control' }); continue; }
        await page.waitForTimeout(250);
        const changed = (await cfg()) !== before;
        await undo(); await page.waitForTimeout(250);
        const restored = (await cfg()) === before;
        report.push({ mode, tab, key, label, kind, result: changed && restored ? 'ok' : (!changed ? 'NO EFFECT' : 'NOT RESTORED') });
      }
    }
    await page.mouse.click(2, 2); await page.waitForTimeout(250);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  }
  const bad = report.filter((r) => r.result !== 'ok');
  if (bad.length) throw new Error('controls not ok: ' + JSON.stringify(bad));
  return { total: report.length, report };
}
