// node test/run-all.js  (or: npm test)
// Starts the demo/mock server, runs every browser check one after another, prints PASS / FAIL, stops the server.
// The checks drive a headless browser through the "browser-automation" skill runner (set BROWSER_RUNNER to its browser.mjs).
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const root = path.join(__dirname, '..');
const runner = process.env.BROWSER_RUNNER || 'C:/Users/OSPL/.claude/skills/browser-automation/browser.mjs';
const base = 'http://localhost:8765';

const checks = [
    ['/test/features.html', 'test/qa-features.mjs'],
    ['/test/parity.html', 'test/qa-parity.mjs'],
    ['/test/layers.html', 'test/qa-layers.mjs'],
    ['/test/layers.html', 'test/qa-find.mjs'],
    ['/test/layers.html', 'test/qa-custom-choices.mjs'],
    ['/test/layers.html', 'test/qa-anim.mjs'],
    ['/test/events.html', 'test/qa-events.mjs'],
    ['/test/design.html', 'test/qa-design.mjs'],
    ['/test/design.html', 'test/qa-images.mjs'],
    ['/test/appearance.html', 'test/qa-appearance.mjs'],
    ['/test/separate.html', 'test/qa-separate.mjs'],
    ['/test/lazy-default.html', 'test/qa-lazy-default.mjs'],
    ['/test/virtual.html', 'test/qa-virtual.mjs'],
    ['/test/search-a11y.html', 'test/qa-search-a11y.mjs'],
    ['/test/memory.html', 'test/qa-memory.mjs'],
    ['/test/mode-check.html', 'test/qa-defaults.mjs'],
    ['/test/views.html', 'test/qa-views.mjs'],
    ['/test/subtext.html', 'test/qa-subtext.mjs'],
    ['/test/tabs.html', 'test/qa-tabs.mjs'],
    ['/test/gear-all.html', 'test/qa-gear-all.mjs'],
    ['/test/views.html', 'test/qa-border.mjs'],
    ['/test/views.html', 'test/qa-tab-indicator.mjs'],
    ['/test/form-loop.html', 'test/qa-loop.mjs'],
    ['/demo-angular-loop.html', 'test/qa-loop.mjs'],
    ['/demo-angular.html', 'test/qa-angular.mjs'],
    ['/demo-grid.html', 'test/qa-grid.mjs'],
    ['/demo-grid.html', 'test/qa-oneline.mjs'],
    ['/demo-grid.html', 'test/qa-jump.mjs'],
    ['/demo-grid.html', 'test/qa-arrow.mjs'],
    ['/demo.html', 'test/qa-demo-theme.mjs'],
];

const server = spawn('node', [path.join(root, 'test', 'server.js')], { stdio: 'ignore' });
let failed = 0;

setTimeout(() => {
    spawnSync('node', [path.join(root, 'build.js')], { cwd: root, stdio: 'inherit' });

    checks.forEach(([page, script]) => {
        const result = spawnSync('node', [runner, base + page, '--script', path.join(root, script)], { encoding: 'utf8', timeout: 120000 });
        const text = (result.stdout || '') + (result.stderr || '');
        const error = /SCRIPT ERROR/.test(text) || result.status !== 0;

        console.log((error ? 'FAIL  ' : 'PASS  ') + script + '  ' + page);

        if (error) {
            failed++;
            console.log('      ' + (text.split('\n').find((l) => /SCRIPT ERROR/.test(l)) || text.slice(0, 200)).slice(0, 240));
        }
    });

    server.kill();
    console.log(failed ? '\n' + failed + ' check(s) FAILED' : '\nAll ' + checks.length + ' checks passed');
    process.exit(failed ? 1 : 0);
}, 800);
