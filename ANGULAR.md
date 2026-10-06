# BSelect – AngularJS 1.x wrapper (`ng/bselect.ng.js`)

Load order: `dist/bselect.bundle.js` (or `.min.js`; it loads its stylesheet itself) · `ng/bselect.ng.js`, then add `'bselect'` to your module. All logic is in the plain-JS core; the wrapper only connects `ng-model`, the scope and the digest.

## New style (clean, no controller config)
```html
<bselect ng-model="f.user" preset="users"></bselect>
<bselect ng-model="f.users" url="php/user.php?action=dropdown" load="scroll" multiple display="chips"
         placeholder="Pick users" params="{active:1}" on-change="changed($value, $items)"></bselect>
<bselect ng-model="f.ward" options="wardList" ng-disabled="locked" ng-required="true"></bselect>
<bselect ng-model="f.ward" url="php/ward.php" depends-on="f.dept" depends-param="dept_id"></bselect>   <!-- cascade -->
<bselect ng-model="x" config="myOptions"></bselect>                                                      <!-- flat options object -->
```
* Any core option works as an attribute (kebab-case): `size="lg" shape="pill" mode="dark" images="true" avatar="initials" …`.
* `options`, `params`, `depends-on`, `on-change`, `config` are Angular expressions; everything else is a literal.
* Separate button / dropdown design works as attributes too: `size="lg" shape="pill"` style the button, `panel-mode="dark" panel-shape="square" panel-color="#f59e0b"` the dropdown (`field-background`, `field-text-color`, `panel-background` …), or pass `config="{ field: {...}, panel: {...} }"`.
* Lazy loading is the default (`load="scroll"`); use `load="all"` for everything at once.
* `model-type="object"` puts the item object(s) in `ng-model` instead of the value (empty single = `{id:'0'}`, like the old component).
* `ng-required`, `ng-disabled`, `ng-change`, form `$invalid` / `$touched` all work.

## Settings layers (same as plain JS)
```js
bselect.defaults({ color: '#0f766e', mode: 'light' });        // global
bselect.defaults('f.users', { size: 'lg' });                  // per dropdown: by ng-model expression, id or name
bselect.defaults('#ward',   { shape: 'pill' });               //                or by selector
bselect.preset('users', { url: 'php/user.php?action=dropdown', load: 'scroll' });
// order: built-in default -> global -> per dropdown -> own (attributes / config)
```
`bselect` (the injectable service) re-exports `defaults`, `resetDefaults`, `preset`, `theme`, `themes`; `bselectLib` is the raw core.

## Old API still works (drop-in)
`bselect.bind($scope, {...}, shared, preset)`, `bselect.server / local / serverHandler / api`, `bselect.refresh(configs)`, `bselect.toParam(value)`, `config="…"` with the grouped `data / server / selection / search / sort / display` shape, `selection.model:'object'`, handlers `data.source.handlers.loadPage / resolveSelected`, `source.options` as a provider function, `selection.onChange`.
The old `bind()` defaults (`serverLazyMulti`: sort on, settings gear on, …) are reproduced.

### Migrating TrainingMaster (not done yet – needs your go-ahead, the folder has uncommitted changes)
Only the includes change in `TrainingMaster/index.html`:
```html
<link rel="stylesheet" href="../common/dropdown/dist/bselect.css">   <!-- core loads it itself too -->
<script src="../common/dropdown/dist/bselect.bundle.js"></script>
<script src="../common/dropdown/ng/bselect.ng.js"></script>
```
(replace `../common/dropdown/bselect.js`). `assessment.html`, `assessmentController.js` and `assessmentRoute.js` keep working unchanged (`bselect.bind`, `config="…"`, object model, `bselect.refresh`, `bselect.toParam`).
Differences to know: the old response cache (`cache` / `cacheTtl`) is replaced by the new `cache` option (milliseconds, default 30000, shared by all dropdowns; `bselect.refresh(configs)` / `inst.reload()` always ask the server again); lazy loading, the arrow and the settings gear are on by default; the new default look (inset rows) is used unless `row-style="flat"`.

## ng-repeat forms
`<bselect id="empid{{$index}}" ng-model="r.emp" options="staff">` inside `ng-repeat` shares one prepared copy of the `staff` array and uses cheap watchers (array reference + length), so 90 rows settle in about 70 ms and each row has its own model. See `demo-angular-loop.html` and PERFORMANCE.md. After changing the array in place (push / splice) the length watcher notices it; a replaced array is noticed by reference.

## Verified (headless, AngularJS 1.8.3)
`demo-angular.html` + `test/qa-angular.mjs`: ng-model both ways, `on-change`, multiple + chips, per-dropdown default by ng-model, cascade (disabled until parent, reload on change, child cleared), old `bind` + server `loadPage` handler, object model with `{id:'0'}` empty, `config=` provider options, required validity, `bselect.refresh`.
