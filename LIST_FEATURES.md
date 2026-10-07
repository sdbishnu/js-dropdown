# BSelect – list design and features

Everything here is **option driven**: switch it on with an option (or a `data-*` attribute, or the settings gear). Nothing is hard-coded.

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
| `commit: true` | multiple select: edits stay pending, `change` and the model update only on **Apply**. Events: `apply`, `cancel` (`onApply`, `onCancel`) |
| `commitClose: 'cancel' \| 'apply'` | what closing the panel does with pending edits (default discards) |

## Rows
| Option | Meaning |
|---|---|
| `subTextField` | item field with the small second line |
| `subTextMap` | `{ value: 'text' }` per-option sub text set from outside the data (wins over the field) |
| `subText` | `false` hides the sub text without losing the field / texts |
| `subTextPlace` | `'below'` (second line, default) or `'beside'` (same line after the label) |
| `imageField`, `renderItem`, `groupField` | as before (`groupField` shows a plain header per group) |

Sub text is searched together with the label. The settings gear has a **Sub text** group in the Dropdown tab: on/off, Below/Beside, the field name and a text box per option (for testing).

The Dropdown tab also has a **Settings button** switch (the gear inside the dropdown). Turning it off hides the gear; it is not saved, so a page reload brings it back (set `settingsButton: false` in code to remove it for good).

## Pictures and sub text come from your data
Images and sub text are normally **assigned in the data** (array or API rows): `imageField: 'photo'` (URL, emoji or icon class), `subTextField: 'code'`. The per-option editors in the settings gear (Images tab, Dropdown tab → Sub text) are **only for trying things out**; what you set there can be copied from the Export tab (`imageMap`, `subTextMap`) but real projects should put the values in the data.

## Settings gear = test bench + code generator
Every option on this page (and the loading, search, memory and long-list options) has a control in the gear (tabs **Behavior · Look · Button · Dropdown · List · Data · Images**). Change it, watch the dropdown react, then open **Export** (Changes / All, global / per dropdown / JSON / data-attributes) and paste the result into your code as the default.
- Field-name boxes suggest the fields of the loaded data.
- With the gear off (`settingsButton: false` or `settings: false`) **no settings DOM is created at all**; with it on, the popup is built when the gear is clicked and the per-option editors only when their tab is opened.
