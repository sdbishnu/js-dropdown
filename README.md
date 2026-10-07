# BSelect

A custom select / dropdown written in **plain JavaScript** (no framework, no jQuery needed), with an **AngularJS 1.x wrapper**.
One component for every module: single and multiple select, local or server data, lazy loading, search, validation, cascades, images, themes, and a built-in settings panel.

Version **1.0.0** · folder `D:\APP\dropdown` · see [docs](#documentation) for details.

---

## 1. Install (two tags)

```html
<script src="dist/bselect.bundle.min.js"></script>   <!-- 29 KB gzip; loads dist/bselect.min.css by itself -->
<!-- or the readable build: dist/bselect.bundle.js + dist/bselect.css -->
```
AngularJS pages add the wrapper after it: `<script src="ng/bselect.ng.js"></script>` and `angular.module('app', ['bselect'])`.

## 2. Use it

```js
// plain JS, on an id
var ward = bselect('#ward', { options: wards, placeholder: 'Select ward' });
var user = bselect('#user', { url: 'php/user.php?action=dropdown', load: 'scroll', multiple: true });
ward.getValue();  ward.setValue(5);  ward.clear();  ward.reload();  ward.destroy();
```
```html
<!-- plain HTML, no JS -->
<select id="empid3" name="emp[3]" data-bselect data-options="staff" data-value="5"></select>

<!-- AngularJS -->
<bselect ng-model="f.user" url="php/user.php?action=dropdown" multiple on-change="changed($value, $items)"></bselect>
```
A `<select>` or `<input>` target keeps its native value in sync, so normal form submits work.
jQuery (optional): `$('#ward').bselect({...})`, `$('#ward').bselect('getValue')`.

### Forms and loops with many dropdowns
```js
bselect.data('staff', staffArray);                    // name a big array once (shared, indexed, built once)
bselect.many('.js-staff', { options: 'staff' });      // build a whole loop in one call
```
120 dropdowns on a 2000-item array build in 30 ms. See [PERFORMANCE.md](PERFORMANCE.md).

## 3. What it does

| Area | Options (most used) |
|---|---|
| **Data** | `options` (array / name / function), `url` + `params` + `method`, `handler(params, state)`, `valueField`, `labelField`, `transform`, `resolve` / `resolveUrl` (labels for saved ids) |
| **Loading** | `load: 'scroll'` (**default**, lazy) · `'all'` · `'button'`; `pageSize`; `loadOn: 'open' \| 'init'`; paging-safe for APIs that ignore it |
| **Speed** | virtual scrolling for long lists (`virtual`, `virtualFrom`), shared option cache, request cache (`cache`) |
| **Selecting** | `multiple`, `min` / `max`, `required`, `creatable` (type to add), `recent`, `favorites`, `viewTabs` (All / Selected tabs with Select all / Clear all), `dependsOn` cascade |
| **Search** | multi-word, match highlight, server or browser search (`searchMode`), `searchMinChars` |
| **Look** | `mode` (light / dark / auto), `palette`, `background`, `size`, `shape`, `variant`, `display: 'chips'`, icons, images / emoji / initials, `theme`, [separate `field:` / `panel:` design](CONFIG_LAYERS.md) |
| **Settings** | gear in the panel: Behavior · Look · Button · Dropdown · Images · Advanced · Export (copy the result as global / per-dropdown config) |
| **List** | `info` (result count), `commit` (Apply / Cancel for multiple), `viewTabs` (All / Selected), sub text (`subTextField`, `subTextMap`, `subTextPlace`) — see [LIST_FEATURES.md](LIST_FEATURES.md) |
| **Access** | keyboard (arrows, Home / End, PageUp / PageDown, type-ahead), screen-reader announcements, focus handling |

Events: `inst.on('change' \| 'open' \| 'close' \| 'load' \| 'error' \| 'create' \| 'limit' \| 'validate', fn)` or `onChange` etc.; DOM events `bselect:change`, `bselect:open`, `bselect:close`.
Methods: `getValue() getSelected() getText() setValue() setOptions() addOption() removeOption() reload() setParams() clear() reset() validate() isValid() open() close() disable() enable() setAppearance() setTheme() explain() getConfig() destroy()`.
Static: `bselect.defaults() · .preset() · .theme() · .data() · .many() · .scan() · .apply() · .setMode() · .all() · .clearCache() · .invalidate() · .version`.

## 4. Configure once, override anywhere

`built-in default → global → per dropdown → own options` (a later layer wins):
```js
bselect.defaults({ color: '#0f766e', size: 'sm' });                         // global
bselect.defaults('#ward', { field: { shape: 'pill' }, panel: { mode: 'dark' } });   // one dropdown, set from any js file
bselect('#ward', { size: 'md' });                                            // own wins
```
Any option can also be a `data-*` attribute. Details: [CONFIG_LAYERS.md](CONFIG_LAYERS.md).

## 5. Develop and test

```
npm install          # terser (minified build)
npm run build        # dist/bselect.bundle.js, .min.js, bselect.css, .min.css
npm run serve        # demo + mock API on http://localhost:8765
npm test             # builds, then runs all 32 headless-browser checks
```
Demo pages (with the server running): `/demo-grid.html` (10 dropdowns in one line, test toggles, light/dark switch) · `/demo.html` · `/demo-angular.html` · `/demo-angular-loop.html` · `/test/virtual.html` · `/test/search-a11y.html` · `/test/memory.html`.

Source is in `src/` (see [BSELECT_ARCHITECTURE_AND_PLAN.md](BSELECT_ARCHITECTURE_AND_PLAN.md)); `skin.css` is the one stylesheet; `dist/` is generated - edit `src/` and rebuild.

Needs a current browser (uses CSS `color-mix()`, `:has()`, `Map` / `Set` / `WeakMap`).

## Documentation

| File | Contents |
|---|---|
| [FEATURES.md](FEATURES.md) | complete checklist of every feature built |
| [SETUP_AND_GITHUB.md](SETUP_AND_GITHUB.md) | clone, build, test runner setup, repository notes |
| [CONFIG_LAYERS.md](CONFIG_LAYERS.md) | the config layers, per-dropdown defaults, separate button / dropdown design, settings tabs, export |
| [APPEARANCE_AND_LOADING.md](APPEARANCE_AND_LOADING.md) | themes, backgrounds, images, option names, loading modes |
| [LIST_FEATURES.md](LIST_FEATURES.md) | list design: count, Apply / Cancel, texts, richer rows, multi-field accent-insensitive search |
| [PERFORMANCE.md](PERFORMANCE.md) | loops / big forms, virtual scrolling, cache, search, accessibility, build sizes |
| [ANGULAR.md](ANGULAR.md) | AngularJS wrapper, old API compatibility, migration notes |
| [BSELECT_ARCHITECTURE_AND_PLAN.md](BSELECT_ARCHITECTURE_AND_PLAN.md) | how the code is organised |
| [PHASES.md](PHASES.md) | what is done, what is open |

The previous AngularJS-only version still lives in `d:\xampp\htdocs\dev\common\dropdown` (used by TrainingMaster until it is migrated).
