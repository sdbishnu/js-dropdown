# BSelect – where settings come from (default → global → per dropdown → own)

Every setting is resolved in layers. **A later layer overrides an earlier one.**

| # | Layer | Set with | Scope |
|---|---|---|---|
| 1 | **Built-in default** | (inside bselect) | everything |
| 2 | **Global** | `bselect.defaults({ ... })` | every dropdown on the page |
| 3 | Theme *(optional)* | `theme: 'dark'` / `bselect.theme(name, {...})` | dropdowns that name it |
| 4 | Preset *(optional)* | `preset: 'users'` / `bselect.preset(name, {...})` | dropdowns that name it |
| 5 | **Per dropdown** | `bselect.defaults('#ward', { ... })` | one dropdown, set from **any other js file** |
| 6 | **Own** | `bselect('#ward', { ... })` or `data-*` attributes | that dropdown only |
| 7 | User choice *(optional)* | settings gear with `persist:true` | that browser |

Layers 3–4 are optional shortcuts; the order you asked for is **default → global → own**, with the per-dropdown layer (5) letting another js file set a dropdown's defaults without touching the page that builds it.

## Example

```js
// shared-config.js  (load it before the dropdowns are built)
bselect.defaults({ size: 'sm', color: '#0f766e', mode: 'light' });        // global
bselect.defaults('#ward',   { size: 'lg', shape: 'pill' });                // per dropdown, by id / selector
bselect.defaults('.report-filter', { size: 'sm', display: 'chips' });      // per dropdown, by class
bselect.defaults('user_id', { images: true, avatar: 'initials' });         // per dropdown, by name / id / data-name

// page.js
bselect('#ward', { options: wards, color: '#ef4444' });                    // own: color wins, size 'lg' comes from layer 5
```

`bselect.defaults()` returns the current global defaults · `bselect.resetDefaults()` clears all · `bselect.resetDefaults('#ward')` clears one.

Per-dropdown keys can be a CSS selector (`#id`, `.class`, `[name=x]`, anything with a space or `>`), or a plain id / `name` / `data-name`.

### Where did a value come from?
```js
var inst = bselect('#ward', {...});
inst.explain().size      // { value: 'lg', from: 'dropdown' }   (default | global | theme | preset | dropdown | own)
inst.getConfig()         // the effective settings object
```

## Settings popup → config you can paste elsewhere
The gear opens a **compact popup** (about 300 px tall, 5 tabs):

| Tab | Contents |
|---|---|
| Behavior | Selection, Loading (All / Scroll / Click), page size, on/off pills: Search, Sort, Clear ×, Preview, Gear, Scroll hint |
| Look | Mode, background palettes + any colour, accent swatches + any colour, size, shape, field style, row spacing, value display |
| Images | show images, default picture (initials / person / none), avatar colour (random / accent), shape, size |
| **Custom** | free values, no presets: corner radius, font size, row height, border width, panel width, list height (px); colours for accent, field border, text, background, panel only, row hover, selected row; font family; shadow; raw CSS variables |
| **Export** | shows the changes as text to paste into another js file |

**Notes**: the panel arrow is on by default (`arrow: false` for a flat edge); the gear is on by default and can no longer be switched off from inside the popup or by an old saved preference.

**Export formats**
* **Global** – `bselect.defaults({ ... });`
* **This one** – `bselect.defaults('#id', { ... });` (per dropdown)
* **JSON** – plain object
* **HTML** – `data-*` attributes
* *Changes* = only what you changed in the popup, *All* = every non-empty setting. **Copy** puts it on the clipboard.

Change something, open **Export**, copy, and paste the block into your shared config file – that sets the default for that dropdown (or for all of them). `Reset` returns to the options the dropdown started with. Limit the tabs with `settingsTabs: ['look','export']`, the gear is now shown by default - hide it with `settingsButton: false` (per dropdown) or `bselect.defaults({ settingsButton: false })` (all) (the Export tab is only reachable through the gear, so it is a developer tool by design).

## data-* attributes
Any option can be set in HTML, kebab-case: `data-size="lg" data-border-color="#f00" data-load="scroll" data-search-box="false" data-style='{"--bselect-radius":"14px"}'` (these count as **own**).

## Settings style
`settingsStyle: 'popup'` (default) opens the settings beside the panel, with the arrow. `settingsStyle: 'drawer'` is an optional Tailwind-style slide-over from the right edge of the window (set it per dropdown, globally with `bselect.defaults({ settingsStyle: 'drawer' })`, or test with `bselect.apply({ settingsStyle: 'drawer' })`).

## Custom values in the Look tab
Size, Shape, Field, Rows and Values each end with a **Custom** button that opens its own inputs: Size = field height + font size, Shape = corner radius, Field = border width, Rows = row height, Values = max chips. Picking a preset button clears the custom value again. They map to the options `fieldHeight`, `fontSize`, `radius`, `borderWidth`, `rowHeight`, `maxChips`, so they also appear in the Export tab and can be set from code.

---

# Separate design: the select button and the dropdown

The **button** (the closed field) and the **dropdown** (the open panel with its rows) each have their own settings. Group them or use flat keys; groups merge across the layers (default -> global -> per dropdown -> own), so a global `field.size` and an own `field.shape` both apply.

```js
bselect.defaults({ field: { size: 'sm' } });                        // global: every button is small
bselect('#ward', {
    options: wards,
    field: { shape: 'pill', background: '#fff7e6', borderColor: '#f59e0b', textColor: '#7c2d12' },   // the button
    panel: { mode: 'dark', shape: 'square', rowStyle: 'flat', shadow: 'strong', color: '#f59e0b' },    // the dropdown
});
```

| `field` (button) | |
|---|---|
| `size` `shape` `radius` `variant` | S/M/L, square/rounded/pill or px, outline/filled/underline/ghost |
| `height` `fontSize` | px |
| `background` `textColor` `borderColor` `borderWidth` `color` | fill, text, border, border width, accent |
| `icon` `chevron` `width` `prefix` `suffix` | content / width |

| `panel` (dropdown) | |
|---|---|
| `mode` `palette` `background` `textColor` `borderColor` `color` | its own light/dark/auto, palette or colour, text, border, accent (`''` = same as the button) |
| `shape` `radius` `shadow` | corner style (`''` = same), px, none/soft/strong |
| `width` `listHeight` | px |
| `rowStyle` `density` `rowHeight` `rowFontSize` `checkStyle` | rows |
| `hoverColor` `selectedColor` `arrow` `animation` | |

Flat keys keep working (`size`, `panelMode`, `panelShape`, `fieldBackground` ...). `mode`, `palette`, `background`, `textColor` and `color` set both; `panel.*` / `field.*` override only their part (for example a light button with a dark dropdown, or the reverse).

## Settings popup tabs
**Behavior · Look** (shared mode / background / accent) **· Button · Dropdown · Images · Advanced · Export**. The Button and Dropdown tabs each end their choices with a **Custom** button (height + font, radius, border, row height ...) and have their own colour fields. Export writes the nested form (`field: {...}`, `panel: {...}`).

## Animated settings
Pop-in from the gear, a highlight that glides under the active tab, panes that slide in from the side of the new tab with rows fading in one after another, custom inputs that expand and collapse, a ring flash on the button when a setting is applied, and a "Copied" pop on the copy button. All of it is turned off by `prefers-reduced-motion` and by `animation: false`.

## Settings popup size
The popup (default `settingsStyle: 'popup'`) is **22.1875rem wide (355 px at a 16 px root)** and at most about 330 px tall (it scrolls inside when a tab needs more); on screens up to 576 px wide it fills the screen. Change the width with the css variable `--bselect-settings-width`, e.g. `.my-form .bselect { --bselect-settings-width: 24rem; }`. The drawer style is 440 px wide.
