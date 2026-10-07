# BSelect – settings gear, tab by tab

Generated from `test/qa-controls.mjs` (every control is changed and put back, in single and multiple mode). **125 control checks, all with a result below.**

Work through one tab at a time: keep it, fix it or remove it, then re-run the check (see the end of this file).

## Behavior

| Control | Option | Type | Shown for | Test |
|---|---|---|---|---|
| Selection | `multiple` | choice buttons | single + multiple | ok |
| Loading | `load` | choice buttons | single + multiple | ok |
| Rows | `pageSize` | choice buttons | single + multiple | ok |
| Search | `search` | Off / On | single + multiple | ok |
| Sort | `sort` | Off / On | single + multiple | ok |
| Clear × | `clearable` | Off / On | single + multiple | ok |
| Preview | `popover` | Off / On | single + multiple | ok |
| Scroll hint | `lazyHint` | Off / On | single + multiple | ok |
| Count | `info` | Off / On | single + multiple | ok |
| Apply / Cancel | `commit` | Off / On | multiple only | ok |
| All / Selected | `viewTabs` | Off / On | multiple only | ok |
| Select all | `selectAll` | Off / On | multiple only | ok |
| Closing | `commitClose` | choice buttons | multiple only | ok |

## Look

| Control | Option | Type | Shown for | Test |
|---|---|---|---|---|
| Mode | `mode` | choice buttons | single + multiple | ok |

## Button

| Control | Option | Type | Shown for | Test |
|---|---|---|---|---|
| Size | `size` | choice buttons | single + multiple | ok |
| Shape | `shape` | choice buttons | single + multiple | ok |
| Style | `variant` | choice buttons | single + multiple | ok |
| Border | `borderWidth` | choice buttons | single + multiple | ok |
| Fill | `fieldBackground` | colour | single + multiple | ok |
| Text | `fieldTextColor` | colour | single + multiple | ok |
| Border | `borderColor` | colour | single + multiple | ok |
| Accent | `fieldColor` | colour | single + multiple | ok |
| Clear × | `clearable` | Off / On | single + multiple | ok |
| Arrow | `chevron` | Off / On | single + multiple | ok |
| Values | `display` | choice buttons | multiple only | ok |

## Dropdown

| Control | Option | Type | Shown for | Test |
|---|---|---|---|---|
| Mode | `panelMode` | choice buttons | single + multiple | ok |
| Shape | `panelShape` | choice buttons | single + multiple | ok |
| Rows | `density` | choice buttons | single + multiple | ok |
| Layout | `rowStyle` | choice buttons | single + multiple | ok |
| Shadow | `shadow` | choice buttons | single + multiple | ok |
| Width | `panelWidth` | number box | single + multiple | ok |
| List height | `listHeight` | number box | single + multiple | ok |
| Row font | `rowFontSize` | number box | single + multiple | ok |
| Edge fade | `fadeSize` | number box | single + multiple | ok |
| Background | `panelBackground` | colour | single + multiple | ok |
| Text | `panelTextColor` | colour | single + multiple | ok |
| Border | `panelBorderColor` | colour | single + multiple | ok |
| Hover | `hoverColor` | colour | single + multiple | ok |
| Selected | `selectedColor` | colour | single + multiple | ok |
| Accent | `panelColor` | colour | single + multiple | ok |
| Arrow | `arrow` | Off / On | single + multiple | ok |
| Preview | `popover` | Off / On | single + multiple | ok |
| Settings button | `settings` | Off / On | single + multiple | ok |
| Scroll fade | `scrollFade` | Off / On | single + multiple | ok |
| Sub text | `subText` | Off / On | single + multiple | ok |
| Place | `subTextPlace` | choice buttons | single + multiple | ok |
| Field | `subTextField` | text box | single + multiple | ok |

## List

| Control | Option | Type | Shown for | Test |
|---|---|---|---|---|
| Count | `infoPlace` | choice buttons | single + multiple | ok |
| Align | `infoAlign` | choice buttons | single + multiple | ok |
| Highlight | `highlight` | Off / On | single + multiple | ok |
| Where | `serverSearch` | choice buttons | single + multiple | ok |
| Min letters | `searchMinChars` | number box | single + multiple | ok |
| Group by | `groupField` | text box | single + multiple | ok |
| Favourites | `favorites` | Off / On | single + multiple | ok |
| Recent | `recent` | number box | single + multiple | ok |

## Data

| Control | Option | Type | Shown for | Test |
|---|---|---|---|---|
| Preload | `preload` | Off / On | single + multiple | ok |
| Cache | `cache` | number box | single + multiple | ok |
| Virtual | `virtual` | choice buttons | single + multiple | ok |
| Virtual from | `virtualFrom` | number box | single + multiple | ok |

## Images

| Control | Option | Type | Shown for | Test |
|---|---|---|---|---|
| Show images | `images` | Off / On | single + multiple | ok |
| Field | `imageField` | text box | single + multiple | ok |
| Default | `avatar` | choice buttons | single + multiple | ok |
| Colour | `avatarColor` | choice buttons | single + multiple | ok |
| Shape | `imageShape` | choice buttons | single + multiple | ok |
| Size | `imageSize` | choice buttons | single + multiple | ok |

## Not covered by the one-by-one check (no single option key)
* **Look** tab: mode / palette / background / accent swatches, **Button** and **Dropdown** colour pickers with their own custom inputs.
* **Per-option editors** (Images tab, Dropdown tab → Sub text): for trying things out only; the real values come from your data.
* **Advanced** tab (font, raw CSS variables) and **Export** tab (copy settings as code).

## Add, remove or fix one control
1. **Add:** build it in `src/62-settings-ui.js` inside the tab with the helpers `pills`, `segmented`, `numberField`, `colourField`, `fieldText` (they set `data-key` for you); add the key to `PREF_KEYS` in `src/60-settings.js` so it is saved and exported; if it needs more than a re-render when it changes, handle it in `_setting()` there.
2. **Remove:** delete the helper call (and the option, its CSS and docs when the feature goes too).
3. **Fix:** change the code, then run the check below.
4. **Test:** `npm test` (the check is `qa-controls`), or run just this check and regenerate this page:
```
npm run serve
node <browser-automation>/browser.mjs http://localhost:8765/test/controls.html --script test/qa-controls.mjs > .ctl.txt
node test/make-controls-doc.js .ctl.txt
```
A control passes when changing it changes the dropdown's config **and** putting it back gives exactly the starting config.
