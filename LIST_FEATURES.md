# BSelect – list design and features

Everything here is **option driven**: switch it on with an option (or a `data-*` attribute, or the settings gear) and it reads the data from fields of your items. Nothing is hard-coded.

## Layout (top to bottom)
search · result count (optional) · **All | Selected (n)** tabs with the tab action (multiple select only) · list · Apply / Cancel (optional)

## All / Selected tabs (multiple select)
| Tab | Shows | Action on the right |
|---|---|---|
| **All** | the full list (search, lazy load, virtual scroll as usual) | **Select all** / Unselect all (the rows currently listed, honours `max`) |
| **Selected (n)** | only the chosen rows; unticking a row removes it from the tab | **Clear all** |

Single select (radio) has no tabs. `viewTabs: false` turns them off, `selectAll: false` hides Select all. The old selected-items drawer (+ / − panel) was removed; the Selected tab replaces it.

## Count, Apply / Cancel
| Option | Meaning |
|---|---|
| `info: true` | count line under the search, "1–20 of 100" (server lists with more pages: "1–20 of 100+") |
| `infoPlace` / `infoAlign` | count line position: `'top'` (default) or `'bottom'`; `'right'` (default) `'left'` `'center'` |
| `checkStyle` | `'box'` (default, classic checkbox / radio), `'switch'` (every row is an on / off toggle), `'tick'`, `'none'` |
| `commit: true` | multiple select: edits stay pending, `change` and the model update only on **Apply**. Events: `apply`, `cancel` (`onApply`, `onCancel`) |
| `commitClose: 'cancel' \| 'apply'` | what closing the panel does with pending edits (default discards) |
| `texts: { apply: 'Übernehmen' }` | reword / translate any label, `{n}` style placeholders. Keys: `TEXTS` in `src/00-head.js` |

Both are also switches in the settings gear (Behavior → Show).

## Richer rows (item fields, you choose the field names)
| Option | Shows |
|---|---|
| `statusField` | coloured dot before the label (css colour or `ok` `warn` `error` `info` `off`) |
| `badgeField` + `badgeColorField` | pill at the end of the row ("New"), optional colour |
| `metaField` | right-aligned text (price, count, code) |
| `disabledReasonField` | red line under a disabled row + tooltip |
| `subTextField` | item field with the small second line |
| `subTextMap` | `{ value: 'text' }` per-option sub text set from outside the data (wins over the field) |
| `subText` | `false` hides the sub text without losing the field / texts |
| `subTextPlace` | `'below'` (second line, default) or `'beside'` (same line after the label) |
| `imageField`, `renderItem` | as before |

The settings gear has a **Sub text** group in the Dropdown tab: on/off, Below/Beside, the field name (suggests the fields of your data) and a text box per option.

The Dropdown tab also has a **Settings button** switch (the gear inside the dropdown). Turning it off hides the gear; it is not saved, so a page reload brings it back (set `settingsButton: false` in code to remove it for good).

## Search
| Option | Meaning |
|---|---|
| `searchFields: ['name','code']` | fields searched (array or `'name,code'`); default is label + sub text |
| `accentInsensitive` (default true) | "jose" finds and highlights "José" |

Example:
```js
  statusField: 'state', badgeField: 'tag', metaField: 'code', searchFields: ['name', 'code'] });
```
Checks: `test/qa-views.mjs` (page `test/views.html`), `test/qa-rows.mjs` (page `test/rows.html`).
