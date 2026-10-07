// Builds SETTINGS_TABS.md (tab-by-tab list of the settings gear controls, with their test result) from the output of test/qa-controls.mjs
//   node C:/Users/OSPL/.claude/skills/browser-automation/browser.mjs http://localhost:8765/test/controls.html --script test/qa-controls.mjs > .ctl.txt
//   node test/make-controls-doc.js .ctl.txt
const fs = require('fs');
const path = require('path');

const text = fs.readFileSync(process.argv[2] || '.ctl.txt', 'utf8');
const from = text.indexOf('script ');
const to = text.indexOf('\n\nconsole');
const data = JSON.parse(text.slice(from + 7, to));
const TABS = ['Behavior', 'Look', 'Button', 'Dropdown', 'List', 'Data', 'Images'];
const KIND = { switch: 'Off / On', choice: 'choice buttons', text: 'text box', number: 'number box', colour: 'colour' };
let md = '# BSelect – settings gear, tab by tab\n\n';

md += 'Generated from `test/qa-controls.mjs` (every control is changed and put back, in single and multiple mode). **' + data.total + ' control checks, all with a result below.**\n\n';
md += 'Work through one tab at a time: keep it, fix it or remove it, then re-run the check (see the end of this file).\n\n';

TABS.forEach((tab) => {
    const rows = {};

    data.report.filter((r) => r.tab === tab).forEach((r) => {
        const row = rows[r.key] || (rows[r.key] = { label: r.label, key: r.key, kind: r.kind, modes: [], results: [] });

        row.modes.push(r.mode);
        row.results.push(r.result);
    });

    md += '## ' + tab + '\n\n| Control | Option | Type | Shown for | Test |\n|---|---|---|---|---|\n';
    Object.keys(rows).forEach((key) => {
        const r = rows[key];
        const shown = r.modes.length === 2 ? 'single + multiple' : r.modes[0] + ' only';
        const ok = r.results.every((x) => x === 'ok') ? 'ok' : r.results.join(' / ');

        md += '| ' + r.label + ' | `' + r.key + '` | ' + (KIND[r.kind] || r.kind) + ' | ' + shown + ' | ' + ok + ' |\n';
    });
    md += '\n';
});

md += `## Not covered by the one-by-one check (no single option key)
* **Look** tab: mode / palette / background / accent swatches, **Button** and **Dropdown** colour pickers with their own custom inputs.
* **Per-option editors** (Images tab, Dropdown tab → Sub text): for trying things out only; the real values come from your data.
* **Advanced** tab (font, raw CSS variables) and **Export** tab (copy settings as code).

## Add, remove or fix one control
1. **Add:** build it in \`src/62-settings-ui.js\` inside the tab with the helpers \`pills\`, \`segmented\`, \`numberField\`, \`colourField\`, \`fieldText\` (they set \`data-key\` for you); add the key to \`PREF_KEYS\` in \`src/60-settings.js\` so it is saved and exported; if it needs more than a re-render when it changes, handle it in \`_setting()\` there.
2. **Remove:** delete the helper call (and the option, its CSS and docs when the feature goes too).
3. **Fix:** change the code, then run the check below.
4. **Test:** \`npm test\` (the check is \`qa-controls\`), or run just this check and regenerate this page:
\`\`\`
npm run serve
node <browser-automation>/browser.mjs http://localhost:8765/test/controls.html --script test/qa-controls.mjs > .ctl.txt
node test/make-controls-doc.js .ctl.txt
\`\`\`
A control passes when changing it changes the dropdown's config **and** putting it back gives exactly the starting config.
`;
fs.writeFileSync(path.join(__dirname, '..', 'SETTINGS_TABS.md'), md);
console.log('SETTINGS_TABS.md written');
