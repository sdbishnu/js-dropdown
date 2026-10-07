# BSelect – Phases and status

Location `D:\APP\dropdown` · core in `src/` → `npm run build` → `dist/` · tests: `npm test` (38 headless-browser checks, all passing).
Decision: vanilla core first, AngularJS wrapper over it, migrate pages last. The old Angular `bselect.js` in `d:\xampp\htdocs\dev\common\dropdown` is untouched.

Status: ✅ done and tested · 🟡 done, needs a real-world check · ⏳ open

## Done

| # | Phase | What | Docs / tests |
|---|---|---|---|
| 1 | Core + build | plain-JS core, single / multiple, local / server, search, paging, form sync, presets, `data-*`, jQuery plugin, build script | README |
| 2 | Parity with the old Angular version | auto-position, resize, sort, settings, popover + marquee, same panel structure (skeleton, empty / error states, results header, scroll hint, load-more, end marker, ripple, aria, PageUp/Down, hand-over animation, `isOptionDisabled`, `noun`) | `test/qa-parity.mjs`, screenshot comparison |
| 3 | Features | events, resolve ids, cascade, validation, min / max, groups, sub-text, icons, create-new, `beforeChange`, keyboard, dark theme | `qa-features` |
| 3b | Appearance + loading names | themes, mode, size, shape, variant, density, colours, icon / prefix / suffix / label, chips, check style, `load` modes, clean option names | APPEARANCE_AND_LOADING.md |
| 3c | Design system | token stylesheet (`skin.css`), palettes, custom background, custom styling, option pictures (image / emoji / icon / initials / `imageMap`) | `qa-design`, `qa-images` |
| 3d | Config layers | default → global → per dropdown → own, `explain()`, per-dropdown defaults from any js file | CONFIG_LAYERS.md, `qa-layers` |
| 3e | Settings | popup with tabs, Custom inputs per choice, find, export (global / per dropdown / JSON / HTML), animations, optional drawer (`settingsStyle`) | `qa-find`, `qa-custom-choices`, `qa-anim`, `qa-events` |
| 3f | Separate design | `field:` (button) and `panel:` (dropdown) design, nested export | `qa-separate` |
| 3g | Angular wrapper | `<bselect ng-model …>`, old `bind` / `config` / object model / handlers, cascade, required, ng-repeat loops | ANGULAR.md, `qa-angular`, `qa-loop` |
| 3h | Performance | shared option cache, one document listener, delegated rows, released panels, light selection updates, cheap digest watchers, `bselect.data / many` | PERFORMANCE.md, `qa-bench`, `qa-loop` |
| 3i | Defaults and polish | lazy load by default (duplicate-safe), arrow, gear on by default, no open "jump", arrow stays visible while switching | `qa-lazy-default`, `qa-jump`, `qa-arrow` |
| 3j | Long lists and quality | virtual scrolling, multi-word search + highlight, screen-reader announcements, request cache, recent + favourites, minified build + version, `npm test` | PERFORMANCE.md, `qa-virtual`, `qa-search-a11y`, `qa-memory` |
| 3k | List improvements (option driven) | result count line, All / Selected tabs, Apply / Cancel commit mode, sub text, settings button on/off | LIST_FEATURES.md, `qa-views`, `qa-tabs`, `qa-subtext` |
| 3l | Removed again | range select, paste ids, request cancel / retry, group fold / A–Z rail, status / badge / meta / reason rows, searchFields + accents, `texts`, switch row mark | - |
| 3m | Settings gear covers the kept options | List and Data tabs, field-name boxes with suggestions, lazy per-option editors, nothing rendered when the gear is off | `qa-gear-all` |
| 3n | Settings gear tested control by control | `data-key` on every control, `qa-controls` changes + restores each one (121 checks, single + multiple), SETTINGS_TABS.md generated; fixes: number boxes go back to the starting value, switches restore the exact default, images / default-picture restore | `qa-controls`, `test/make-controls-doc.js` |
| 3o | Guide page + Guide button | docs-site style guide (sidebar pages, on-this-page, Ctrl+K search, code blocks, live demo), deep links per gear tab, built to dist/, Guide button next to Find | `qa-guide`, `qa-guide-page` |
| 5 | Documentation | README + the docs in this folder | README.md |

## Open

| Item | Notes |
|---|---|
| ⏳ Migrate TrainingMaster | change the includes in `TrainingMaster/index.html` (see ANGULAR.md); the folder has uncommitted changes, so confirm first. Pages keep working unchanged (`bselect.bind`, `config=`, object model). The old 30 s response cache is replaced by the new `cache` option |
| 🟡 Real endpoints | run against two or three real module APIs (response shapes, session / auth, GET vs POST, error bodies). Endpoints that ignore `page` / `search` are handled, long lists on them should use `searchMode: 'client'` |
| ⏳ Retire the old Angular file | after migration; `common/dropdown` is untracked in git, so back it up first |
| ⏳ List improvements still to do | table columns with sticky header, tree lists, RTL + language packs, phone bottom sheet, fuzzy search, drag reorder, inline create form, undo after Clear all |
| ⏳ Nice to have | undo after Clear all, paste a list of ids / names, fuzzy search, bottom-sheet polish on phones, offline notice keeping the last good list |

## How to verify
```
npm run serve   →  http://localhost:8765/demo-grid.html  (and the other demo / test pages)
npm test        →  PASS / FAIL for all 38 checks
```

## Fix log
* **Default look was dark** (introduced with the multi-word search): two methods were both called `_tokens`, so the colour code got the search-word list and switched `bselect-dark` / `bselect-custom-bg` on for every dropdown. Renamed (`_queryTokens`) and guarded; `test/qa-defaults.mjs` now checks that the default is light with a light *and* a dark operating system, that `mode:'auto'` follows the OS, and that `panel: { mode: 'dark' }` darkens only the dropdown.
* **Demo pages** start in Light (the Auto choice follows the operating system on purpose).
* **Opening a server list showed an empty panel first**: lists now preload on hover / focus (`preload`).
