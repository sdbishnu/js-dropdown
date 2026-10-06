# BSelect – Appearance, Loading modes and option names

> **Current state:** the single stylesheet is `skin.css` (it replaced `bselect.css` + `extras.css` + `appearance.css`); the settings popup tabs are now **Behavior · Look · Button · Dropdown · Images · Advanced · Export** (see [CONFIG_LAYERS.md](CONFIG_LAYERS.md), which also describes the separate `field:` / `panel:` design); lazy loading (`load: 'scroll'`) is the default. Start with the [README](README.md); this file keeps the option tables for themes, images and loading.

## 1. Three layers of appearance (later layer wins)

```
project defaults  <  theme  <  preset  <  options on the dropdown  <  setAppearance() at runtime
bselect.defaults({ size:'md', color:'#0f766e' })          // once per project
bselect.theme('hospital', { shape:'pill', size:'lg' })    // named bundle, reusable
bselect.preset('wards', { url:'...', theme:'hospital' })  // data + look together
bselect('#x', { preset:'wards', size:'sm' })              // one dropdown
inst.setAppearance({ mode:'dark' })  /  inst.setTheme('dark')
```
Everything is also plain CSS variables, so a stylesheet can restyle it too:
`.my-form .bselect { --bselect-color:#0f766e; --bselect-radius:12px; }`

Built-in themes: `light` (default), `dark`, `auto`, `soft`, `minimal`, `pill`. `bselect.themes()` lists all registered names.

## 2. Appearance options

| Option | Values | What it does |
|---|---|---|
| `theme` | name | apply a registered theme |
| `mode` | `light` `dark` `auto` | dark mode; `auto` follows the operating system live |
| `size` | `sm` `md` `lg` | field height + font + row height |
| `shape` | `square` `rounded` `pill` | corner style (field, panel, checkbox) |
| `radius` | px | exact corner radius (overrides `shape`) |
| `variant` | `outline` `filled` `underline` `ghost` | field look |
| `density` | `compact` `normal` `comfortable` | row height |
| `color` / `borderColor` / `borderWidth` | colour / px | accent, field border |
| `background` / `textColor` | colour | field + panel background, text |
| `icon` | css class (`fa fa-user`), image URL, or short text/emoji | leading icon in the field |
| `prefix` / `suffix` | text | fixed text around the value (`Ward:` … `beds`) |
| `label` | text | label above the field (adds `*` when required) |
| `imageField` / `iconField` | item field | avatar/icon per row, also shown in the field for single select |
| `imageShape` | `circle` `rounded` `square` | avatar shape |
| `showSelectedImage` | bool | show the chosen item's picture in the field |
| `display` | `text` `chips` `count` | how multiple values show (`chips` have × per value, `maxChips` then `+N`) |
| `checkStyle` | `box` `tick` `none` | selection indicator in the list |
| `chevron` | bool | arrow on/off |
| `clearIcon` | text | clear button text |
| `width` / `panelWidth` / `listHeight` | css / px / px | sizes |
| `animation` | bool | panel animation |
| `cssClass` / `vars` | class names / `{ '--bselect-x': '..' }` | escape hatches |

Users can also change mode, size, shape, style and display themselves from the settings gear (`settingsButton:true`), and keep them with `persist:true`.

## 3. Loading modes (one option: `load`)

| `load` | Server list | Local list |
|---|---|---|
| `'all'` (default) | fetch everything once, search/sort in the browser | all rows (drawn in chunks of `renderChunk` while scrolling) |
| `'scroll'` | fetch the next page when the list is scrolled near the end | show the next `pageSize` rows while scrolling |
| `'button'` | "Show more results" button fetches the next page | button shows the next `pageSize` rows |

`loadOn: 'open'` (default) fetches on first open · `loadOn: 'init'` fetches immediately.
Paged server lists send `page` + `pageSize`; with `searchMode:'auto'` they search on the server.
Old names still work: `lazy:true` = `load:'scroll'`, `lazy:true, loadMore:true` = `load:'button'`.

## 4. Option renames (old names keep working)

| New (use these) | Old |
|---|---|
| `load: 'all' \| 'scroll' \| 'button'` | `lazy`, `loadMore` |
| `loadOn` | – (new) |
| `searchBox` | `search` |
| `searchMode: 'auto' \| 'client' \| 'server'` | `serverSearch` |
| `sortButton` | `sort` |
| `sortMode: 'client' \| 'server'` | `serverSort` |
| `sortBy` | `sortField` |
| `settingsButton` | `settings` |
| `clearButton` | `clearable` |
| `selectAllButton` | `selectAll` |
| `valuePreview` | `popover` |
| `mode` | `theme:'dark'/'auto'` |

HTML: `data-load="scroll" data-theme="dark" data-size="lg" data-shape="pill" data-variant="filled" data-display="chips" data-icon="fa fa-user" data-prefix="Ward:" data-label="Ward"`.

## 5. Verified (headless browser)
`test/appearance.html` + `test/qa-appearance.mjs`: sizes 28/35/42 px, square/pill radius, underline variant, icon + prefix + suffix + label, chips with remove and `+N`, avatars + sub-text, tick style, custom registered theme, dark mode, local scroll/button/all loading (10→20 rows, 60 rows), clean option names, settings gear changing size and mode at runtime. Old `lazy`/`loadMore` pages still pass `test/features.html`.

---

# Update: dark mode, backgrounds, custom styling, option images, settings popup

## Stylesheet
`skin.css` is now the single source for the look (`node build.js` -> `dist/bselect.css`). It is fully token driven, so dark mode has no hard-coded white patches. Every surface, divider, border, hover and selected colour is derived from two values, `--bselect-bg` and `--bselect-text`, with `color-mix()`.

## Backgrounds (dark or light)
| Option | Meaning |
|---|---|
| `mode: 'light' \| 'dark' \| 'auto'` | built-in light / slate dark / follow the system |
| `palette` | `slate` `midnight` `graphite` `black` `ocean` (dark) · `paper` `mint` `rose` (light). Add your own in `PALETTES` |
| `background: '#0f2a44'` | any colour; light or dark text is chosen automatically from its brightness |
| `panelBackground` | panel only |
Users pick a palette or colour in the settings gear (Look tab); `persist:true` remembers it.

## Custom style options
`accent (color)`, `borderColor`, `borderWidth`, `textColor`, `hoverColor`, `selectedColor`, `fontFamily`, `fontSize`, `shadow` (`none` `soft` `strong` or any css), `radius`/`shape`, `size`, `variant`, `density`, `width`, `listHeight`, `cssClass`, and the escape hatch `style: { '--bselect-radius': '14px' }` (alias `vars`). Plain CSS works too: `.my-form .bselect { --bselect-color:#0f766e; }`.

## Option pictures
| Option | Meaning |
|---|---|
| `images: 'auto' \| true \| false` | show pictures; `auto` = when any picture option below is configured |
| `imageField: 'image'` | item field holding an image URL, an **emoji**, an icon class (`fa fa-user`) or short text |
| `iconField` | same, kept for icon classes |
| `imageFor: function(item)` | decide per option in code, return URL / emoji / class / text |
| `avatar: 'initials' \| 'icon' \| 'none'` | default picture when an option has none: initials from the name, or a person glyph |
| `avatarColor: 'random' \| 'accent' \| css colour \| function(item)` | `random` = a stable colour per name (same name, same colour) |
| `colorField` | item field with an explicit avatar colour |
| `imageShape` `imageSize` | `circle`/`rounded`/`square`, pixels |
Pictures show in rows, in the field (single select), in chips and in the Selected tab. The settings gear has a **Show images** switch and an **Images** tab.

## Settings popup (redesigned)
Three tabs: **Behavior** (selection, search, sort, clear, loading mode, rows per load, helpers), **Look** (mode, background palettes + custom colour, accent swatches, size, shape, field style, row spacing, border width, selected-value display), **Images** (show images, default picture, avatar colour, shape, size). Switches, segmented controls, swatches, **Reset to defaults**, stays inside the window, works in dark mode.

## Verified (headless)
`test/design.html` + `test/qa-design.mjs` + screenshots (`test/design-shots.mjs`): image/emoji/icon/initials kinds, stable random colours, `colorField`, palette and custom background switching dark/light and text colour, Images switch off/on, Reset, settings tabs; light look still matches the original in `compare-new.html`; parity, appearance and feature suites still pass.

---

# Update: lazy load is the default
`load` now defaults to `'scroll'` (lazy load): the first `pageSize` rows (20) show, the next ones come while scrolling, with the "Scroll to continue" hint and the "All results loaded" marker. It works for local arrays (rows are drawn in slices) and for server lists (`page` / `pageSize` are sent). Use `load: 'all'` for the old "everything at once" behaviour, or `load: 'button'` for the Show more button.

Safe for endpoints that ignore paging: rows already loaded are never added twice, and when a page brings nothing new bselect stops asking. Server search (`searchMode: 'auto'`) is used only while rows are still missing; once everything has been loaded the list is filtered in the browser, so an endpoint without a `search` parameter still searches correctly for short lists. For a long list on such an endpoint set `searchMode: 'client'` (and `load: 'all'`) or add a `search` parameter to the API. Keyboard End / type-ahead and search reach rows that are not drawn yet.
