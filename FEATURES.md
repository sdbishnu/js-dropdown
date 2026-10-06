# BSelect – every feature built so far (v1.0.0)

Plain JavaScript dropdown (no framework, no jQuery needed) with an AngularJS 1.x wrapper.
Everything below is **done and covered by `npm test`** (33 headless-browser checks).
Details for each area are in the linked file; this page is the checklist.

Legend: option name in `code`; **default** is stated where it matters.

---

## 1. Core
- Single and multiple select; works on `<select>`, `<input>` or any element; native value kept in sync (normal form submit works)
- Data: `options` (array / registered name / function), `url` + `params` + `method` + `headers`, `handler(params, state)`, `valueField`, `labelField`, `transform`, `itemsField` / `totalField` / `hasMoreField`
- Labels for saved ids that are not loaded: `resolve` / `resolveUrl`
- Validation: `required`, `min`, `max`, messages, `validate()`, `isValid()`
- Cascade: `dependsOn` (+ `dependsParam`), child clears and reloads
- Create new value by typing: `creatable`
- Public API: `getValue getSelected getText setValue setOptions addOption removeOption reload setParams clear reset validate isValid open close disable enable setAppearance setTheme explain getConfig destroy`
- Static API: `bselect.defaults / preset / theme / data / many / scan / apply / setMode / all / clearCache / invalidate / version`
- Events: `change open close load error create limit validate apply cancel paste retry` (callbacks `onChange` … and DOM events `bselect:change|open|close`)
- `data-*` attributes for every option, jQuery plugin (optional)

## 2. Loading and speed ([PERFORMANCE.md](PERFORMANCE.md))
- Lazy load is the default (`load: 'scroll'`), also `'all'` and `'button'`; `pageSize`; `loadOn`
- Duplicate-safe paging (endpoints that ignore `page` / `search` still work)
- Virtual scrolling for long lists (`virtual`, `virtualFrom`)
- Shared normalised option cache per array, request cache (`cache`), preload on hover / focus (`preload`)
- One document click listener, delegated row events, panel DOM released on close, light selection updates
- `bselect.data()` + `bselect.many()` for forms with many dropdowns in a loop (120 dropdowns × 2000 options ≈ 30 ms)
- Stale requests aborted (`abortStale`), automatic retry (`retry`, `retryDelay`), keep rows on error + Retry note (`keepOnError`)

## 3. Search
- Multi-word search with highlight, server or browser search (`searchMode`), `searchMinChars`
- Several fields (`searchFields`), accent-insensitive (`accentInsensitive`, default on)
- Paste a list of ids / names into the search to select them (`pasteIds`, `pasteMatch`)

## 4. Selecting ([LIST_FEATURES.md](LIST_FEATURES.md))
- **All | Selected (n)** tabs for multiple select; All = Select all / Unselect all, Selected = Clear all; none for single select (`viewTabs`, `selectAll`)
- Shift+click range, Shift+arrows, Ctrl/Cmd+A (`rangeSelect`)
- Apply / Cancel commit mode (`commit`, `commitClose`, events `apply` / `cancel`)
- Recent picks and favourites (`recent`, `favorites`, saved in localStorage)
- Groups: `groupField` with fold / unfold, row count, select whole group, folded start (`groupCollapse`, `groupCount`, `groupSelect`, `groupsOpen`)
- A–Z rail for long lists (`alphaRail`, `alphaRailFrom`)
- Count line "1–20 of 100" (`info`, `infoPlace`, `infoAlign`)

## 5. Rows
- Option pictures: image URL, emoji, icon class, initials with a stable random colour, `imageField`, `imageFor`, `imageMap`, `avatar`, `avatarColor`
- Sub text under (or beside) the label: `subTextField`, `subTextMap` (per option), `subText`, `subTextPlace`
- Status dot, badge, right-side meta, disabled reason: `statusField`, `badgeField`, `badgeColorField`, `metaField`, `disabledReasonField`
- Custom row: `renderItem`; selection indicator `checkStyle` (`box` default, `switch`, `tick`, `none`)
- Hover preview of long / selected values and marquee (`valuePreview`)
- Texts can be reworded or translated: `texts` (every label of the list)

## 6. Look ([APPEARANCE_AND_LOADING.md](APPEARANCE_AND_LOADING.md), [CONFIG_LAYERS.md](CONFIG_LAYERS.md))
- Light / dark / auto (follows the OS live), default is **light**; palettes (slate, midnight, graphite, black, ocean, paper, mint, rose) and any custom background
- Size, shape (square / round / pill), variant (outline / filled / line / ghost), density, row style, border width, radius, font, shadow, accent colour, every colour token
- Display of chosen values: text / chips / count, `maxChips`
- **Separate design for the button and the dropdown** (`field:` / `panel:` groups)
- Arrow under the button, open animation without a "jump", rounded panel
- Themes and presets (`bselect.theme`, `bselect.preset`), CSS variables for plain-CSS restyling
- Layers: **built-in default → global → per dropdown → own** (`bselect.defaults(...)`)

## 7. Settings gear (inside the dropdown, on by default)
- Popup beside the panel, 22.1875 rem wide (355 px), animated tabs with a sliding highlight
- Tabs: Behavior · Look · Button · Dropdown · Images · Advanced · Export
- Segmented choices with **Custom** value inputs, Off | On segments for yes / no options, swatches, find box, Reset
- Behavior: Single / Multiple, Loading, Rows, Search, Sort, Clear ×, Preview, Scroll hint, Apply / Cancel, Range select, Paste list, Count
- Button: size, shape, style, **border size** (Auto / None / 1–3 px / Custom), values display, colours
- Dropdown: mode, palette, shape, rows, layout, shadow, sizes, custom colours, Arrow, Preview, **Settings button on/off**, A–Z rail, **Sub text** (field, per-option text, place)
- Images: show images, default picture, colour, shape, size, per-option picture editor
- Export tab: copy the changed settings as global / per-dropdown / JSON / HTML data-attributes
- User changes can be remembered (`persist`); `settingsButton: false` removes the gear

## 8. Accessibility and keyboard
- Arrow keys, Home / End, PageUp / PageDown, type-ahead, Enter, Escape, Tab
- ARIA roles (listbox / option / tab), `aria-selected`, `aria-setsize` / `aria-posinset`, screen-reader announcements, focus returns to the button

## 9. AngularJS 1.x wrapper ([ANGULAR.md](ANGULAR.md))
- `<bselect ng-model="…" url / options / preset …>` with `on-change`, `ng-disabled`, `ng-required`, `ng-change`, form validity, `model-type="object"`
- Cheap watchers for `ng-repeat` forms (90 dropdowns settle in ≈ 70 ms)
- Old API still works (`bselect.bind`, `server / local`, `refresh`, `toParam`, grouped `config="…"`)

## 10. Build, tests, packaging
- `src/` → one bundle (`dist/bselect.bundle.js`, `.min.js`, `bselect.css`, `.min.css`), version injected from `package.json`
- Mock API server + demo pages; 33 headless-browser checks (`npm test`)
- Docs: README, FEATURES (this file), LIST_FEATURES, CONFIG_LAYERS, APPEARANCE_AND_LOADING, PERFORMANCE, ANGULAR, ARCHITECTURE, PHASES, SETUP_AND_GITHUB

## Not built yet (open list, see [PHASES.md](PHASES.md))
Table-style columns with sticky header · tree lists · RTL and ready language packs · phone bottom sheet · fuzzy search · drag to reorder · inline create form · undo after Clear all · TrainingMaster migration (needs your go-ahead) · tests against real module endpoints.
