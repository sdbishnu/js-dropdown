# BSelect – setup, configuration and GitHub

Repository: https://github.com/sdbishnu/js-dropdown (branch `main`)

## 1. Get it
```
git clone https://github.com/sdbishnu/js-dropdown.git
cd js-dropdown
npm install        # only needed for the minified build (terser)
```
Needs **Node.js 18+** (developed on Node 24) and a current browser (the CSS uses `color-mix()` and `:has()`).

## 2. Use it in a page (nothing to configure)
The built files are committed in `dist/`, so a page only needs:
```html
<script src="dist/bselect.bundle.min.js"></script>   <!-- loads dist/bselect.min.css by itself -->
<!-- AngularJS 1.x pages add the wrapper after it: -->
<script src="ng/bselect.ng.js"></script>             <!-- angular.module('app', ['bselect']) -->
```
Keep `dist/bselect.min.css` next to the script (the script loads the stylesheet from its own folder). See [README.md](README.md) for the options and [FEATURES.md](FEATURES.md) for everything that exists.

## 3. Change the code
```
src/*.js    source files (joined in the order listed in build.js)
skin.css    the one stylesheet
ng/         AngularJS wrapper
dist/       GENERATED - never edit by hand
```
```
npm run build      # rebuild dist/ (bundle, min, css, min css)
npm run serve      # demo + mock API on http://localhost:8765
npm test           # build + run all headless-browser checks
```
Always run `npm run build` (or `npm test`) before committing so `dist/` matches `src/`.

## 4. Running the tests - one thing to configure
The checks drive a headless browser through a small runner script. It is **not** in this repository (it comes from the "browser-automation" skill of Claude Code). `test/run-all.js` looks for it here:

```
C:/Users/OSPL/.claude/skills/browser-automation/browser.mjs
```
On another machine point to your copy with an environment variable:
```
set BROWSER_RUNNER=C:/path/to/browser.mjs        (Windows cmd)
$env:BROWSER_RUNNER="C:/path/to/browser.mjs"     (PowerShell)
export BROWSER_RUNNER=/path/to/browser.mjs       (bash)
npm test
```
The runner opens `http://localhost:8765/<page>` and runs `test/qa-*.mjs` (Playwright-style `page` API). Without the runner the library itself still works; only `npm test` needs it. `npm run serve` + opening `demo.html`, `demo-grid.html`, `demo-angular.html` or any `test/*.html` page in a browser always works.

Port **8765** must be free (`npm test` starts and stops its own server; stop a manual `npm run serve` first).

## 5. Working with the repository
- Remote `origin` = the GitHub URL above, branch `main`.
- `node_modules/` is ignored. Line-ending warnings on Windows (`LF will be replaced by CRLF`) are harmless.
- Commit messages: plain text, no co-author trailer.
- The old Angular-only dropdown (`d:\xampp\htdocs\dev\common\dropdown`) is a separate, untouched copy used by TrainingMaster. Migration to this version is **not done** (it needs the go-ahead because TrainingMaster has uncommitted changes); the steps are in [ANGULAR.md](ANGULAR.md).

## 6. Where settings come from
Order (later wins): **built-in default → global (`bselect.defaults`) → per dropdown (`bselect.defaults('#id', …)`) → own options**. Details: [CONFIG_LAYERS.md](CONFIG_LAYERS.md). The settings gear inside a dropdown has an **Export** tab that writes the changed settings in exactly this format.

## 7. Documentation map
| File | What |
|---|---|
| guide.html (also dist/guide.html) | the guide: every feature, option and gear control, searchable, with a live demo; opened by the Guide button in the settings gear |
| README.md | quick start and option overview |
| FEATURES.md | complete checklist of what is built |
| LIST_FEATURES.md | list design, tabs, selecting, rows, requests, groups |
| SETTINGS_TABS.md | the settings gear tab by tab: every control, option, test result; how to add / remove / fix one |
| CONFIG_LAYERS.md | config layers, separate button / dropdown design, settings tabs |
| APPEARANCE_AND_LOADING.md | themes, backgrounds, images, loading modes, old names |
| PERFORMANCE.md | loops, virtual scroll, caches, accessibility, build sizes |
| ANGULAR.md | AngularJS wrapper and migration notes |
| BSELECT_ARCHITECTURE_AND_PLAN.md | how the code is organised |
| PHASES.md | phases, open items, fix log |
