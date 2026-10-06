# BSelect – forms and loops with many dropdowns

Typical case: a form (or ng-repeat) with dozens of dropdowns, each on its own `id`, all reading the same big array.

## What changed
| Problem | Fix | Result (120 dropdowns x 2000 options) |
|---|---|---|
| Every dropdown normalised the array again and looked values up linearly (O(n²)) | One shared, indexed copy per array (`Map` value → item), built once | build **5116 ms → 30 ms** |
| One `document` click listener per dropdown | ONE shared listener for the page, removed when the last dropdown is destroyed | listeners **120 → 1** |
| Two or three listeners per list row | Event delegation: one click + one hover handler per list | less memory, faster open |
| A closed dropdown kept its whole panel (100+ rows) alive | Panel DOM is released on close and rebuilt on open (a few ms) | only one panel in the DOM at a time |
| Selecting a row re-rendered the whole list | Only the changed rows, trigger and counters are updated | instant check/uncheck in long lists |
| Searching re-lowercased every label each key press | Lower-case labels cached once per array, visible list memoised | fast search in 5000+ rows |
| AngularJS `$watchCollection` copied the array per dropdown per digest | Cheap watchers (array reference + length) | digest cost independent of array size |
| Option JSON repeated in the markup of every row | `bselect.data('name', array)` and `data-options="name"` | 90 rows = 13 KB of HTML instead of megabytes |

## Using it
```js
bselect.data('staff', staffArray);                       // name the array once
// plain html rows (any number): picked up by bselect.scan() / DOMContentLoaded
//   <select id="empid3" name="emp[3]" data-bselect data-options="staff" data-value="5"></select>
bselect.many('.js-staff', { options: 'staff' });         // or build a whole loop in one call
bselect.many(rows, function (el, i) { return { options: 'staff', value: saved[i] }; });
bselect('#empid7', { options: staffArray });             // each id on its own also shares the cache
```
AngularJS: `<bselect id="empid{{$index}}" ng-model="r.emp" options="staff">` inside `ng-repeat` shares the same cache.

* A `<select>`/`<input>` target keeps the native value in sync, so normal form submits (`FormData`) work: `emp[3]=5`.
* After changing an array **in place** (push/splice) call `bselect.data('name', array)` again or `bselect.invalidate(array)`; a new array, or a different length, is noticed automatically.
* Long lists draw `renderChunk` rows (100) at a time while scrolling; use `load:'scroll'` / `'button'` with `pageSize` to page them.

## Verified
`test/bench.html` + `test/qa-bench.mjs`, `test/form-loop.html` (plain JS, 90 rows in 30 ms, form values collected), `demo-angular-loop.html` (ng-repeat 90 rows, independent models, controller fill, required validity), plus all earlier suites.

---

# Update: virtual scrolling, search, accessibility, cache, favourites, minified build

## Virtual scrolling
Lists with more than `virtualFrom` (150) rows draw **only the rows in view** (plus 8 above and below) between two spacers, so a 5000-row list opens as fast as a 20-row one: 17-26 rows in the DOM, 249 nodes on the whole page. `virtual: 'auto'` (default) | `true` | `false`. It works for local and server lists (a paged server list becomes virtual once it holds more than 150 rows), keyboard (Home / End / PageUp / PageDown / arrows / type-ahead), selection (single and multiple) and search. Automatic mode is skipped for lists with groups, a sub-text line, `renderItem`, `creatable`, or the favourites / recent sections, because their rows have different heights; `virtual: true` forces it.

## Search
* **Several words:** `john card` finds rows that contain *both* words, in the label and in the small second line.
* **Highlight:** the matched words are marked in the rows (`highlight: false` to turn off); regular-expression characters in the query are safe.
* Searching a long shared array is fast: lower-case text is built once per array.

## Screen readers
A polite live region announces "12 results for …", "No results", "Loading", "Maria Cardoso selected", "3 selected", "Selection cleared"; rows carry `aria-setsize` / `aria-posinset` / `aria-disabled`; the button has an accessible name ("Staff: Maria Cardoso"); focus returns to the button after a single pick or Escape.

## Request cache
Server answers are reused for `cache` ms (default 30000; `0` = off) when the url + method + parameters are the same, shared by every dropdown on the page, in-flight requests included. `inst.reload()` always asks the server again; `bselect.clearCache()` or `bselect.clearCache('/api/staff')` drops entries. Failed answers are never kept. (A controller `handler` is never cached - it is your own request.)

## Recent picks and favourites (optional)
`recent: 3` lists the last picked items first, `favorites: true` adds a star on each row (starred items first). They show as "Favourites / Recent / All" while nobody is searching and are remembered in the browser under `memoryKey` (default: the element id or name).

## Build
`npm run build` writes `dist/bselect.bundle.js` (202 KB, 48 KB gzip), `dist/bselect.bundle.min.js` (99 KB, **29 KB gzip**), `dist/bselect.css` and `dist/bselect.min.css` (76 KB, 12 KB gzip). The css link in the bundle follows the script name (`.min.js` loads `bselect.min.css`) and carries `?v=<version>` so a new release is never served from cache; `bselect.version` holds the version (from `package.json`). Terser is a dev dependency (`npm install`).

## Tests
`npm test` (= `node test/run-all.js`) starts the mock server, builds, runs all 23 headless-browser checks and prints PASS / FAIL.

## Preload (server lists)
`preload: true` (default): when the pointer reaches the button, or it gets keyboard focus, the first page is requested at once (one request, shared with the cache), so the rows are already there when the panel opens - no "empty panel, then rows appear". `preload: false` to load only on open.
