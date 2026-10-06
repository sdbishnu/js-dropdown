# BSelect – Architecture

Plain-JS core + a thin AngularJS 1.x wrapper. The core is the single source of truth; the wrapper contains no dropdown logic.

```
D:\APP\dropdown
  src/          source, joined in this order by build.js
  skin.css      the one stylesheet (token driven: light, dark, custom backgrounds, sizes, shapes)
  ng/           bselect.ng.js  - AngularJS wrapper
  dist/         generated: bselect.bundle.js (+ .min.js), bselect.css (+ .min.css)
  build.js      node build.js  (reads package.json version, terser for the .min files)
  test/         mock server (server.js), test pages, headless-browser checks (qa-*.mjs), run-all.js
  demo*.html    demo pages; demo-theme.js / .css = light / dark switch for demos
  *.md          documentation
```

## Source files (`src/`, in build order)

| File | Responsibility |
|---|---|
| `00-head.js` | module header; **options** (`DEFAULTS`), clean-name map, palettes, themes, **config layering** (`buildOptions`: default → global → theme → preset → per dropdown → own, `field:` / `panel:` groups), shared registries (data, option cache, request cache, instances) |
| `05-theme.js` | appearance → css classes + variables, per scope (button = root, dropdown = panel), palette / custom background / dark detection, `setAppearance`, `setTheme` |
| `15-events.js` | `on / off`, option callbacks, DOM `bselect:*` events |
| `10-select.js` | constructor, selection state, value API, form sync (`<select>` / `<input>` / hidden), enable / disable, destroy, **one shared document click listener** |
| `20-data.js` | local options (shared indexed copy per array), server loading (`handler` / `url`), paging with duplicate protection, **request cache**, resolve-by-id, multi-word search, sort, memoised visible list |
| `30-panel.js` | trigger DOM, open / close (releases the panel on close), panel position hand-over |
| `32-panel-ui.js` | panel DOM (search, header, All / Selected tabs, list, pagination, states), the **render pass** incl. virtual window, delegated row events, svg icons |
| `34-pictures.js` | option pictures: image URL, emoji, icon class, initials + stable random colour, `imageMap`, broken-image fallback |
| `35-render.js` | trigger rendering (chips, lead icon, affixes), row rendering, match highlight, light selection update, **virtual scrolling**, keyboard, screen-reader announcements |
| `38-polish.js` | click ripple, aria wiring, PageUp / PageDown, animated hand-over between dropdowns |
| `40-position.js` | auto-position (up / down, start / end), drag resize |
| `60-settings.js` | saved preferences, sort button + settings gear, `_setting()` (applies one change), reset |
| `62-settings-ui.js` | settings popup / drawer UI: tabs, switches, choices with **Custom** inputs, swatches, find, animations |
| `64-export.js` | settings → text (global / per dropdown / JSON / HTML data-attributes, nested `field` / `panel`), `explain()`, `getConfig()` |
| `70-popover.js` | hover preview of selected values, marquee for long text |
| `72-memory.js` | recent picks and favourites (localStorage) |
| `85-features.js` | validation, cascade (`dependsOn`), create-new, flash messages |
| `99-index.js` | public API: `bselect()`, `defaults`, `preset`, `theme`, `data`, `many`, `scan`, `apply`, `setMode`, `clearCache`…, `data-*` parsing, jQuery plugin, auto-init |

## How a dropdown works
1. `bselect(el, opts)` → `buildOptions` merges the layers into one options object (`opts._sources` remembers which layer each key came from).
2. The trigger (field) is built at once - about 13 DOM nodes. The **panel is built on open and thrown away on close**.
3. Local arrays go through `sharedOptions()`: normalised once per array and indexed by value, shared by every dropdown that uses it. Server lists load pages through `_fetch` (handler or url, with the request cache).
4. `_visible()` (memoised) applies search, sort and favourites / recent ordering. `_render()` draws it: normal rows for short lists, a **virtual window** for long ones. Selection changes use `_renderLight()` (only touched rows).
5. Rows carry `data-i`; one delegated click / hover handler on the list picks, stars or marks them.
6. Appearance is css variables: the root carries the button's, the panel element its own (so the button and the dropdown can differ).

## Decisions
* Vanilla first; AngularJS only as a wrapper (`ng-model`, scope, digest).
* One stylesheet driven by tokens; dark mode and custom backgrounds derive every colour from `--bselect-bg` / `--bselect-text` with `color-mix()`.
* Clean option names; the old names still work.
* Defaults are lazy loading, arrow on, settings gear on.
* Performance is a feature: shared caches, delegation, released panels, virtual scrolling.

## Status
Done and covered by `npm test` (34 checks): core, features, appearance, separate button / dropdown design, settings UI, AngularJS wrapper with the old API, performance, accessibility, packaging.
Open: see [PHASES.md](PHASES.md) (TrainingMaster migration, testing against real module endpoints, retiring the old Angular file).
