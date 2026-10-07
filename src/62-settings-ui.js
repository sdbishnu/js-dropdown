/* Settings popup (compact): Behavior / Look / Images / Custom / Export tabs.
 * Compact rows, pills for on/off, segmented choices, swatches, free-form custom values, copy-able config. */
var ACCENTS = ['#47a0ec', '#0d6efd', '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#0f766e', '#64748b'];
var PALETTE_ORDER = ['slate', 'midnight', 'graphite', 'black', 'ocean', 'paper', 'mint', 'rose'];

Object.assign(BSelect.prototype, {
    _settingsToggle: function () {
        var self = this;
        var o = this.opts;
        var drawer = o.settingsStyle === 'drawer';
        var wrap;
        var box;
        var tabs;
        var body;
        var rect;
        var side;
        var need;
        var panes = {};
        var tabButtons = {};
        var available = (o.settingsTabs || ['behavior', 'look', 'button', 'dropdown', 'list', 'data', 'images', 'custom', 'export']).filter(Boolean);

        if (this.settingsEl) {
            this._settingsClose();
            return;
        }

        if (drawer) {
            wrap = el('div', 'bselect-drawer-layer');

            var backdrop = el('div', 'bselect-drawer-backdrop');

            backdrop.addEventListener('click', function () {
                self._settingsClose();
            });
            wrap.appendChild(backdrop);
            box = el('div', 'bselect-settings bselect-drawer' + (this._reopening ? ' bselect-drawer-static bselect-static' : ''));
            box.setAttribute('role', 'dialog');
            box.setAttribute('aria-label', 'Dropdown settings');
        } else {
            rect = this.panel.getBoundingClientRect();
            need = 22.1875 * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) + 8; // popup width (rem) + gap
            side = window.innerWidth - rect.right >= need || window.innerWidth - rect.right >= rect.left ? 'right' : 'left';
            wrap = el('div', 'bselect-settings-wrap bselect-settings-' + side);

            if (o.arrow) {
                wrap.appendChild(el('span', 'bselect-settings-connector')).appendChild(el('i'));
            }

            box = el('div', 'bselect-settings' + (this._reopening ? ' bselect-static' : ''));
        }

        // ---- header
        var head = el('div', 'bselect-settings-header');
        var title = el('div', 'bselect-settings-title');
        var closeBtn = el('button', 'bselect-settings-close');
        var find = el('input', 'bselect-settings-find');
        var findRow = el('div', 'bselect-drawer-find');

        if (drawer) {
            title.appendChild(el('h2', '', 'Dropdown settings'));
            title.appendChild(el('p', '', 'Changes apply instantly and are saved in this browser.'));
            closeBtn.innerHTML = '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
            find.placeholder = 'Search settings';
            findRow.appendChild(icon('search', 'bselect-drawer-find-ico'));
            findRow.appendChild(find);
            head.appendChild(title);
            head.appendChild(closeBtn);
        } else {
            var sub = el('small');

            head.appendChild(icon('cog', 'bselect-settings-badge'));
            title.appendChild(el('strong', '', 'Dropdown settings'));
            sub.appendChild(el('span', 'bselect-autosave-dot'));
            sub.appendChild(document.createTextNode('Saved as you change'));
            title.appendChild(sub);
            closeBtn.textContent = '\u00d7';
            find.placeholder = 'Find...';
            head.appendChild(title);
            head.appendChild(find);
            head.appendChild(closeBtn);
        }

        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', 'Close settings');
        closeBtn.addEventListener('click', function () {
            self._settingsClose();
        });
        find.type = 'search';
        find.setAttribute('aria-label', 'Find a setting');

        tabs = el('div', 'bselect-tabs');
        tabs.setAttribute('role', 'tablist');

        var indicator = el('span', 'bselect-tab-ind');

        tabs.appendChild(indicator);

        /** keep the highlight exactly under the active tab: it follows the tab while it grows (flex transition), and again when the size changes */
        var indTimer = 0;

        function placeIndicator() {
            var active = tabs.querySelector('.bselect-tab-active');

            if (active && active.offsetWidth) {
                indicator.style.left = active.offsetLeft + 'px';
                indicator.style.width = active.offsetWidth + 'px';
            }
        }

        function moveIndicator() {
            var start = performance.now();
            var token = ++indTimer;

            placeIndicator();

            (function step() {
                placeIndicator();

                if (token === indTimer && performance.now() - start < 600) {
                    requestAnimationFrame(step);
                }
            })();
        }

        if (window.ResizeObserver) {
            new ResizeObserver(function () {
                placeIndicator();
            }).observe(tabs);
        }

        tabs.addEventListener('transitionend', placeIndicator);
        body = el('div', 'bselect-settings-body');

        var TAB_ICONS = { behavior: 'sliders', look: 'brush', button: 'button', dropdown: 'panel', list: 'list', data: 'data', images: 'image', custom: 'wand', export: 'code' };

        /** the pane is filled the first time its tab is shown (keeps the popup light to open) */
        function lazyFill(pane, fn) {
            pane._fill = fn;
        }

        function addTab(id, label) {
            var button = el('button', 'bselect-tab');

            button.appendChild(icon(TAB_ICONS[id], 'bselect-tab-ico'));
            button.appendChild(el('span', '', label));
            button.title = label;
            var pane = el('div', 'bselect-pane');

            pane.setAttribute('data-tab', id);

            button.type = 'button';
            button.setAttribute('role', 'tab');
            button.addEventListener('click', function () {
                var order = Object.keys(panes);
                var dir = order.indexOf(id) >= order.indexOf(self._settingsTab) ? 1 : -1;

                self._settingsTab = id;

                if (panes[id]._fill) {
                    panes[id]._fill();
                    panes[id]._fill = null;
                }

                panes[id].style.setProperty('--dir', dir);
                Object.keys(panes).forEach(function (key) {
                    panes[key].classList.toggle('bselect-pane-active', key === id);
                    tabButtons[key].classList.toggle('bselect-tab-active', key === id);
                });

                // rows fade in one after another
                [].forEach.call(panes[id].querySelectorAll('.bselect-rowc, .bselect-pills, .bselect-fgrid, .bselect-imgrows, .bselect-code'), function (node, index) {
                    node.style.setProperty('--r', Math.min(index, 9));
                });
                moveIndicator();

                copy.style.display = id === 'export' ? '' : 'none';

                if (id === 'export' && panes.export._refresh) {
                    panes.export._refresh();
                }
            });
            tabs.appendChild(button);
            body.appendChild(pane);
            panes[id] = pane;
            tabButtons[id] = button;
            return pane;
        }

        // ---- building blocks
        function group(into, name) {
            var g = el('div', 'bselect-card');

            if (name) {
                g.appendChild(el('div', 'bselect-card-title', name));
            }

            into.appendChild(g);
            return g;
        }

        function line(into, label, hint, control, stacked) {
            var row = el('div', 'bselect-rowc' + (stacked ? ' bselect-rowc-stack' : ''));
            var text = el('span', 'bselect-rowc-text');

            text.appendChild(el('span', 'bselect-rowc-label', label));

            if (hint) {
                text.appendChild(el('span', 'bselect-rowc-hint', hint));
            }

            if (hint) {
                row.title = hint;
            }

            row.appendChild(text);
            row.appendChild(control);
            into.appendChild(row);
            return row;
        }

        function pills(into, items) {
            var grid;
            var mini;

            if (!drawer) {
                grid = el('div', 'bselect-pills');
                items.forEach(function (item) {
                    var label = el('label', 'bselect-pill');

                    label.setAttribute('data-key', item[1]);
                    var input = el('input');

                    label.title = item[2] || '';
                    input.type = 'checkbox';
                    input.checked = !!o[item[1]];
                    label.classList.toggle('bselect-pill-on', input.checked);
                    input.addEventListener('change', function () {
                        label.classList.toggle('bselect-pill-on', input.checked);
                        label.querySelector('.bselect-seg-mini').style.setProperty('--i', input.checked ? 1 : 0);
                        // switching back to what the dropdown started with restores that exact value (e.g. images: 'auto')
                        var started = self._base ? self._base[item[1]] : undefined;

                        self._setting(item[1], started !== undefined && !!started === input.checked ? started : input.checked);
                    });
                    label.appendChild(input);
                    label.appendChild(el('span', 'bselect-pill-text', item[0]));
                    mini = el('span', 'bselect-seg bselect-seg-mini');
                    mini.appendChild(el('b', '', 'Off'));
                    mini.appendChild(el('b', '', 'On'));
                    mini.style.setProperty('--n', 2);
                    mini.style.setProperty('--i', input.checked ? 1 : 0);
                    label.appendChild(mini);
                    grid.appendChild(label);
                });
                into.appendChild(grid);
                return;
            }

            items.forEach(function (item) {
                var row = el('div', 'bselect-rowc');
                var text = el('span', 'bselect-rowc-text');
                var sw = el('button', 'bselect-sw');

                text.appendChild(el('span', 'bselect-rowc-label', item[0]));

                if (item[2]) {
                    text.appendChild(el('span', 'bselect-rowc-hint', item[2]));
                }

                sw.type = 'button';
                sw.setAttribute('role', 'switch');
                sw.setAttribute('aria-label', item[0]);
                sw.setAttribute('aria-checked', !!o[item[1]]);
                sw.appendChild(el('span', 'bselect-sw-dot'));
                sw.addEventListener('click', function () {
                    var on = sw.getAttribute('aria-checked') !== 'true';

                    sw.setAttribute('aria-checked', on);
                    self._setting(item[1], on);
                });
                row.appendChild(text);
                row.appendChild(sw);
                into.appendChild(row);
            });
        }

        /** Segmented choices. `custom` = { fields: [{ key, label, min, max, step }] } adds a "Custom" button with its own inputs. */
        function segmented(into, label, hint, key, choices, current, custom) {
            var seg = el('div', 'bselect-seg');
            var currentIndex = 0;
            var buttons = [];
            var inline = null;
            var inputs = [];
            var total = choices.length + (custom ? 1 : 0);
            var customOn = false;
            var row;

            function isSet(f) {
                var v = o[f.key];

                return f.key === 'maxChips' ? v !== null && v !== undefined && Number(v) !== 3 : v !== null && v !== undefined && v !== '';
            }

            function mark(index) {
                buttons.forEach(function (b, i) {
                    b.classList.toggle('bselect-seg-on', i === index);
                });
                seg.style.setProperty('--i', index);
            }

            customOn = !!custom && custom.fields.some(isSet);

            choices.forEach(function (choice, index) {
                var button = el('button', '', choice[1]);

                if (!customOn && String(choice[0]) === String(current)) {
                    currentIndex = index;
                }

                button.type = 'button';
                button.addEventListener('click', function () {
                    mark(index);
                    self._setting(key, choice[2] !== undefined ? choice[2] : choice[0]);

                    if (inline) {
                        inline.classList.remove('is-open');
                        inputs.forEach(function (input) {
                            input.value = '';
                        });
                    }
                });
                buttons.push(button);
                seg.appendChild(button);
            });

            if (custom) {
                var customButton = el('button', '', 'Custom');

                customButton.type = 'button';
                customButton.title = 'Type your own value';
                customButton.addEventListener('click', function () {
                    mark(choices.length);
                    inline.classList.add('is-open');

                    if (inputs[0]) {
                        inputs[0].focus();
                    }
                });
                buttons.push(customButton);
                seg.appendChild(customButton);

                inline = el('div', 'bselect-custom-inline');

                var innerBox = el('div', 'bselect-custom-inner');
                var fieldsBox = el('div', 'bselect-custom-fields');

                innerBox.appendChild(fieldsBox);
                inline.appendChild(innerBox);
                custom.fields.forEach(function (f) {
                    var wrapField = el('label', 'bselect-custom-field');
                    var input = el('input', 'bselect-num');

                    input.type = 'number';
                    input.min = f.min;
                    input.max = f.max;
                    input.step = f.step || 1;
                    input.placeholder = 'auto';
                    input.value = o[f.key] === null || o[f.key] === undefined || o[f.key] === '' ? '' : o[f.key];
                    input.addEventListener('input', function () {
                        var n = parseFloat(input.value);

                        self._setting(f.key, isNaN(n) ? null : Math.max(f.min, Math.min(f.max, n)));
                    });
                    wrapField.appendChild(el('span', '', f.label));
                    wrapField.appendChild(input);
                    wrapField.appendChild(el('em', '', f.unit === undefined ? 'px' : f.unit));
                    inputs.push(input);
                    fieldsBox.appendChild(wrapField);
                });
                inline.classList.toggle('is-open', customOn);
            }

            mark(customOn ? choices.length : currentIndex);
            seg.style.setProperty('--n', total);

            // roomy layouts stack the control under the label when there are many buttons
            row = line(into, label, hint, seg, drawer ? total >= 4 : total >= 5);
            row.setAttribute('data-key', key);

            if (inline) {
                row.parentNode.insertBefore(inline, row.nextSibling);
                // Find: typing "radius" or "height" should find the row that owns that custom input
                row.setAttribute('data-keys', custom.fields.map(function (f) {
                    return f.label;
                }).join(' '));
            }

            return row;
        }

        function swatchRow(into, label, hint, key, colours, withDefault, custom) {
            var list = el('div', 'bselect-swatches');
            var current = String(o[key] || '').toLowerCase();

            function select(button) {
                [].forEach.call(list.querySelectorAll('.bselect-swatch-on'), function (n) {
                    n.classList.remove('bselect-swatch-on');
                });

                if (button) {
                    button.classList.add('bselect-swatch-on');
                }
            }

            if (withDefault) {
                var none = el('button', 'bselect-swatch bselect-swatch-none' + (!current ? ' bselect-swatch-on' : ''));

                none.type = 'button';
                none.title = 'Default';
                none.addEventListener('click', function () {
                    select(none);
                    self._setting(key, '');
                });
                list.appendChild(none);
            }

            colours.forEach(function (c) {
                var colour = c.bg || c;
                var button = el('button', 'bselect-swatch' + (String(colour).toLowerCase() === current ? ' bselect-swatch-on' : ''));

                button.type = 'button';
                button.style.background = colour;
                button.title = c.name || colour;
                button.addEventListener('click', function () {
                    select(button);
                    self._setting(c.key || key, c.value !== undefined ? c.value : colour);
                });
                list.appendChild(button);
            });

            if (custom) {
                var input = el('input', 'bselect-swatch bselect-swatch-custom');

                input.type = 'color';
                input.title = 'Any colour';
                input.value = /^#[0-9a-f]{6}$/i.test(current) ? current : '#47a0ec';
                input.addEventListener('input', function () {
                    select(null);
                    self._setting(key, input.value);
                });
                list.appendChild(input);
            }

            return line(into, label, hint, list, drawer);
        }

        var fieldsList = el('datalist');
        var sampleItem = (self.items && self.items.length ? self.items : self.known)[0] || {};

        fieldsList.id = self.id + '-fields';
        Object.keys(sampleItem).forEach(function (key) {
            if (typeof sampleItem[key] !== 'object') {
                fieldsList.appendChild(el('option', '', key)).value = key;
            }
        });

        /** a text setting (item field names, comma lists ...) with suggestions from the loaded data */
        function fieldText(into, key, label, hint, placeholder) {
            var input = el('input', 'bselect-text-input');
            var current = o[key];

            input.type = 'text';
            input.placeholder = placeholder || 'item field';
            input.value = Array.isArray(current) ? current.join(', ') : current || '';
            input.setAttribute('list', fieldsList.id);
            input.setAttribute('aria-label', label);
            input.addEventListener('change', function () {
                self._setting(key, input.value.trim());
            });

            var row = line(into, label, hint, input);

            row.classList.add('bselect-rowc-wide');
            row.setAttribute('data-key', key);
            return row;
        }

        function field(into, label, control) {
            var f = el('label', 'bselect-field');

            f.appendChild(el('span', '', label));
            f.appendChild(control);
            into.appendChild(f);
            return f;
        }

        function numberField(into, key, label, unit, min, max, step) {
            var holder = el('span', 'bselect-field-control');
            var input = el('input', 'bselect-num');
            var clear = el('button', 'bselect-field-clear', '×');

            input.type = 'number';
            input.min = min;
            input.max = max;
            input.step = step || 1;
            input.placeholder = 'auto';
            input.value = o[key] === null || o[key] === undefined || o[key] === '' ? '' : o[key];

            // the value the dropdown started with (empty box / the x button go back to it)
            function started() {
                var b = self._base ? self._base[key] : undefined;

                return b === undefined ? null : b;
            }

            input.addEventListener('input', function () {
                var n = parseFloat(input.value);

                self._setting(key, isNaN(n) ? started() : Math.max(min, Math.min(max, n)));
            });
            clear.type = 'button';
            clear.title = 'Back to default';
            clear.addEventListener('click', function () {
                input.value = started() === null ? '' : started();
                self._setting(key, started());
            });
            holder.appendChild(input);
            holder.appendChild(el('em', '', unit));
            holder.appendChild(clear);
            var fieldEl = field(into, label, holder);

            fieldEl.setAttribute('data-key', key);
            return fieldEl;
        }

        function colourField(into, key, label) {
            var holder = el('span', 'bselect-field-control');
            var input = el('input', 'bselect-colour');
            var code = el('code', '', o[key] || 'auto');
            var clear = el('button', 'bselect-field-clear', '×');

            input.type = 'color';
            input.value = /^#[0-9a-f]{6}$/i.test(o[key] || '') ? o[key] : '#47a0ec';
            input.addEventListener('input', function () {
                code.textContent = input.value;
                self._setting(key, input.value);
            });
            clear.type = 'button';
            clear.title = 'Back to default';
            clear.addEventListener('click', function () {
                code.textContent = 'auto';
                self._setting(key, '');
            });
            holder.appendChild(input);
            holder.appendChild(code);
            holder.appendChild(clear);
            var fieldEl = field(into, label, holder);

            fieldEl.setAttribute('data-key', key);
            return fieldEl;
        }

        // ================= Behavior
        var behavior = addTab('behavior', 'Behavior');
        var b1 = group(behavior);

        segmented(b1, 'Selection', 'Single or multiple choice', 'multiple', [['0', 'Single', false], ['1', 'Multiple', true]], o.multiple ? '1' : '0');
        segmented(b1, 'Loading', 'How more rows are shown', 'load', [['all', 'All'], ['scroll', 'Scroll'], ['button', 'Click']], o.load);

        if (o.load !== 'all') {
            segmented(b1, 'Rows', 'Rows added each time', 'pageSize', [[10, '10', 10], [20, '20', 20], [50, '50', 50], [100, '100', 100]], o.pageSize);
        }

        var pillItems = [
            ['Search', 'search', 'Search box'],
            ['Sort', 'sort', 'Sort button'],
            ['Clear ×', 'clearable', 'Clear button in the field'],
            ['Preview', 'popover', 'Hover preview of the selected values'],
        ];

        if (o.load === 'scroll') {
            pillItems.push(['Scroll hint', 'lazyHint', 'Scroll-to-load helper']);
        }

        if (o.multiple) {
            pillItems.push(['Apply / Cancel', 'commit', 'Edits wait for the Apply button']);
        }

        if (o.multiple) {
            pillItems.push(['All / Selected', 'viewTabs', 'All and Selected tabs'], ['Select all', 'selectAll', 'Select all / Clear all button']);
        }

        pillItems.push(['Count', 'info', 'Result count line']);
        pills(group(behavior, 'Show'), pillItems);

        if (o.multiple) {
            var bm = group(behavior, 'Multiple');

            segmented(bm, 'Closing', 'Closing with pending Apply / Cancel edits', 'commitClose', [['cancel', 'Discard'], ['apply', 'Apply']], o.commitClose === 'apply' ? 'apply' : 'cancel');
        }

        // ================= Look
        var look = addTab('look', 'Look');
        var l1 = group(look);

        segmented(l1, 'Mode', 'Light, dark or follow the system', 'mode', [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']], o.mode);

        var paletteColours = [{ bg: '#ffffff', name: 'Default (follows mode)', key: 'palette', value: '' }].concat(
            PALETTE_ORDER.map(function (id) {
                return { bg: PALETTES[id].bg, name: id.charAt(0).toUpperCase() + id.slice(1), key: 'palette', value: id };
            })
        );
        var bgRow = line(l1, 'Background', 'Pick a palette or any colour - text adapts', el('div', 'bselect-swatches'), drawer);
        var bgList = bgRow.lastChild;

        paletteColours.forEach(function (p) {
            var on = p.value === (o.palette || '') && !o.background;
            var button = el('button', 'bselect-swatch' + (on ? ' bselect-swatch-on' : ''));

            button.type = 'button';
            button.style.background = p.bg;
            button.title = p.name;
            button.addEventListener('click', function () {
                [].forEach.call(bgList.querySelectorAll('.bselect-swatch-on'), function (n) {
                    n.classList.remove('bselect-swatch-on');
                });
                button.classList.add('bselect-swatch-on');
                self._setting('palette', p.value);
            });
            bgList.appendChild(button);
        });

        var bgCustom = el('input', 'bselect-swatch bselect-swatch-custom');

        bgCustom.type = 'color';
        bgCustom.title = 'Any background colour';
        bgCustom.value = /^#[0-9a-f]{6}$/i.test(o.background || '') ? o.background : '#1b2230';
        bgCustom.addEventListener('input', function () {
            [].forEach.call(bgList.querySelectorAll('.bselect-swatch-on'), function (n) {
                n.classList.remove('bselect-swatch-on');
            });
            self._setting('background', bgCustom.value);
        });
        bgList.appendChild(bgCustom);

        swatchRow(l1, 'Accent', 'Selection and focus colour', 'color', ACCENTS, false, true);

        l1.appendChild(el('div', 'bselect-export-note', 'Applies to the button and the dropdown. Fine-tune each one in the next two tabs.'));

        // ================= Button: the closed select field
        var button = addTab('button', 'Button');
        var b1 = group(button);

        segmented(b1, 'Size', 'Field and font size', 'size', [['sm', 'S'], ['md', 'M'], ['lg', 'L']], o.size, { fields: [{ key: 'fieldHeight', label: 'Height', min: 22, max: 80 }, { key: 'fontSize', label: 'Font', min: 9, max: 24 }] });
        segmented(b1, 'Shape', 'Corner style of the button', 'shape', [['square', 'Square'], ['rounded', 'Round'], ['pill', 'Pill']], o.shape, { fields: [{ key: 'radius', label: 'Radius', min: 0, max: 40 }] });
        segmented(b1, 'Style', 'Look of the closed field', 'variant', [['outline', 'Outline'], ['filled', 'Filled'], ['underline', 'Line'], ['ghost', 'Ghost']], o.variant);
        segmented(b1, 'Border', 'Border thickness of the button', 'borderWidth', [['', 'Auto', null], ['0', 'None', 0], ['1', '1px', 1], ['2', '2px', 2], ['3', '3px', 3]], o.borderWidth === null || o.borderWidth === undefined ? '' : String(o.borderWidth), { fields: [{ key: 'borderWidth', label: 'Border', min: 0, max: 8, step: 0.5 }] });

        if (o.multiple) {
            segmented(b1, 'Values', 'How chosen values show', 'display', [['text', 'Text'], ['chips', 'Chips'], ['count', 'Count']], o.display, { fields: [{ key: 'maxChips', label: 'Max chips', min: 1, max: 12, unit: '' }] });
        }

        var b2 = group(button, 'Colours');
        var bgrid = el('div', 'bselect-fgrid');

        colourField(bgrid, 'fieldBackground', 'Fill');
        colourField(bgrid, 'fieldTextColor', 'Text');
        colourField(bgrid, 'borderColor', 'Border');
        colourField(bgrid, 'fieldColor', 'Accent');
        b2.appendChild(bgrid);
        pills(group(button), [['Clear \u00d7', 'clearable', 'Clear button in the field'], ['Arrow', 'chevron', 'Chevron in the field']]);

        // ================= Dropdown: the open panel and its rows
        var dropdown = addTab('dropdown', 'Dropdown');
        var d1 = group(dropdown, 'Theme and rows');

        segmented(d1, 'Mode', 'Light, dark or auto - only for the dropdown', 'panelMode', [['', 'Same'], ['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']], o.panelMode || '');

        var panelColours = [{ bg: '#ffffff', name: 'Same as the button', value: '' }].concat(
            PALETTE_ORDER.map(function (id) {
                return { bg: PALETTES[id].bg, name: id.charAt(0).toUpperCase() + id.slice(1), value: id };
            })
        );
        var pRow = line(d1, 'Palette', 'Own background for the dropdown', el('div', 'bselect-swatches'), drawer);
        var pList = pRow.lastChild;

        panelColours.forEach(function (p) {
            var on = p.value === (o.panelPalette || '') && !o.panelBackground;
            var swatch = el('button', 'bselect-swatch' + (on ? ' bselect-swatch-on' : ''));

            swatch.type = 'button';
            swatch.style.background = p.bg;
            swatch.title = p.name;
            swatch.addEventListener('click', function () {
                [].forEach.call(pList.querySelectorAll('.bselect-swatch-on'), function (n) {
                    n.classList.remove('bselect-swatch-on');
                });
                swatch.classList.add('bselect-swatch-on');
                self._setting('panelPalette', p.value);
            });
            pList.appendChild(swatch);
        });

        var pCustom = el('input', 'bselect-swatch bselect-swatch-custom');

        pCustom.type = 'color';
        pCustom.title = 'Any background colour';
        pCustom.value = /^#[0-9a-f]{6}$/i.test(o.panelBackground || '') ? o.panelBackground : '#1b2230';
        pCustom.addEventListener('input', function () {
            [].forEach.call(pList.querySelectorAll('.bselect-swatch-on'), function (n) {
                n.classList.remove('bselect-swatch-on');
            });
            self._setting('panelBackground', pCustom.value);
        });
        pList.appendChild(pCustom);

        segmented(d1, 'Shape', 'Corner style of the dropdown', 'panelShape', [['', 'Same'], ['square', 'Square'], ['rounded', 'Round'], ['pill', 'Pill']], o.panelShape || '', { fields: [{ key: 'panelRadius', label: 'Radius', min: 0, max: 40 }] });
        segmented(d1, 'Rows', 'Row spacing', 'density', [['compact', 'Tight'], ['normal', 'Normal'], ['comfortable', 'Roomy']], o.density, { fields: [{ key: 'rowHeight', label: 'Height', min: 20, max: 70 }] });
        segmented(d1, 'Layout', 'Rounded rows or edge to edge', 'rowStyle', [['inset', 'Inset'], ['flat', 'Flat']], o.rowStyle === 'flat' ? 'flat' : 'inset');
        segmented(d1, 'Shadow', 'Depth under the dropdown', 'shadow', [['none', 'None'], ['soft', 'Soft'], ['strong', 'Strong']], ['none', 'soft', 'strong'].indexOf(o.shadow) >= 0 ? o.shadow : 'soft');

        var d2 = group(dropdown, 'Sizes');
        var dgrid = el('div', 'bselect-fgrid');

        numberField(dgrid, 'panelWidth', 'Width', 'px', 240, 600, 10);
        numberField(dgrid, 'listHeight', 'List height', 'px', 120, 600, 10);
        numberField(dgrid, 'rowFontSize', 'Row font', 'px', 9, 24, 1);
        numberField(dgrid, 'fadeSize', 'Edge fade', 'px', 0, 40, 1);
        d2.appendChild(dgrid);

        var d3 = group(dropdown, 'Custom colours');
        var dcolours = el('div', 'bselect-fgrid');

        colourField(dcolours, 'panelBackground', 'Background');
        colourField(dcolours, 'panelTextColor', 'Text');
        colourField(dcolours, 'panelBorderColor', 'Border');
        colourField(dcolours, 'hoverColor', 'Hover');
        colourField(dcolours, 'selectedColor', 'Selected');
        colourField(dcolours, 'panelColor', 'Accent');
        d3.appendChild(dcolours);
        pills(group(dropdown, 'Behaviour'), [['Arrow', 'arrow', 'Pointer under the button'], ['Preview', 'popover', 'Hover preview of the selected values'], ['Settings button', 'settings', 'Gear in the dropdown (a page reload brings it back)'], ['Scroll fade', 'scrollFade', 'Rows fade out at the top / bottom edge of the list']]);

        // sub text: the small line under (or beside) the label
        var sub1 = group(dropdown, 'Sub text');
        var subFieldInput = el('input', 'bselect-text-input');
        var subList = el('datalist');
        var sample = (self.items && self.items.length ? self.items : self.known)[0] || {};
        var subRows = el('div', 'bselect-subrows');

        pills(sub1, [['Sub text', 'subText', 'Show the small second line']]);
        segmented(sub1, 'Place', 'Under the label or beside it', 'subTextPlace', [['below', 'Below'], ['beside', 'Beside']], o.subTextPlace === 'beside' ? 'beside' : 'below');
        subList.id = 'bselect-sublist-' + self.id;
        Object.keys(sample).forEach(function (key) {
            if (typeof sample[key] !== 'object') {
                subList.appendChild(el('option', '', key)).value = key;
            }
        });
        subFieldInput.type = 'text';
        subFieldInput.placeholder = 'item field, e.g. code';
        subFieldInput.value = o.subTextField || '';
        subFieldInput.setAttribute('list', subList.id);
        subFieldInput.setAttribute('aria-label', 'Sub text field');
        subFieldInput.addEventListener('change', function () {
            self._setting('subTextField', subFieldInput.value.trim());
        });
        line(sub1, 'Field', 'Item field with the sub text', subFieldInput).setAttribute('data-key', 'subTextField');
        sub1.appendChild(subList);
        sub1.appendChild(el('div', 'bselect-card-title', 'Per option (for testing - normally the text comes from your data field)'));

        lazyFill(dropdown, function () {
        (self.items && self.items.length ? self.items : self.known).slice(0, 40).forEach(function (item) {
            var row = el('div', 'bselect-subrow');
            var input = el('input', 'bselect-text-input');
            var key = String(self._val(item));
            var current = self.opts.subTextMap && self.opts.subTextMap[key];

            input.type = 'text';
            input.placeholder = self._subText(item) || 'sub text';
            input.value = current || '';
            input.setAttribute('aria-label', 'Sub text for ' + self._lbl(item));
            input.addEventListener('change', function () {
                var map = Object.assign({}, self.opts.subTextMap || {});

                if (input.value.trim() === '') {
                    delete map[key];
                } else {
                    map[key] = input.value.trim();
                }

                self._setting('subTextMap', Object.keys(map).length ? map : null);
            });
            row.appendChild(el('span', 'bselect-subrow-name', self._lbl(item)));
            row.appendChild(input);
            subRows.appendChild(row);
        });
        });
        sub1.appendChild(subRows);

        // ================= List: tabs, count, rows, search, groups, memory
        var listTab = addTab('list', 'List');
        var ls1 = group(listTab, 'Count');

        segmented(ls1, 'Count', 'Where the "1-20 of 100" line sits', 'infoPlace', [['top', 'Top'], ['bottom', 'Bottom']], o.infoPlace === 'bottom' ? 'bottom' : 'top');
        segmented(ls1, 'Align', 'Side of the count line', 'infoAlign', [['left', 'Left'], ['center', 'Centre'], ['right', 'Right']], o.infoAlign || 'right');

        var ls2 = group(listTab, 'Rows');

        pills(ls2, [['Highlight', 'highlight', 'Mark the searched words in the rows']]);

        var ls3 = group(listTab, 'Search');

        segmented(ls3, 'Where', 'Search in the browser or ask the server', 'serverSearch', [['', 'Auto', null], ['0', 'Browser', false], ['1', 'Server', true]], o.serverSearch === true ? '1' : o.serverSearch === false ? '0' : '');

        var lg = el('div', 'bselect-fgrid');

        numberField(lg, 'searchMinChars', 'Min letters', '', 0, 10, 1);
        ls3.appendChild(lg);

        var ls4 = group(listTab, 'Groups');

        fieldText(ls4, 'groupField', 'Group by', 'Item field to group the rows under headers', 'e.g. dept');

        var ls5 = group(listTab, 'Memory');
        var lm = el('div', 'bselect-fgrid');

        pills(ls5, [['Favourites', 'favorites', 'A star on each row']]);
        numberField(lm, 'recent', 'Recent', 'items', 0, 20, 1);
        ls5.appendChild(lm);

        // ================= Data: requests and long lists
        var dataTab = addTab('data', 'Data');
        var dq = group(dataTab, 'Requests');
        var dqg = el('div', 'bselect-fgrid');

        pills(dq, [['Preload', 'preload', 'Start loading when the pointer reaches the button']]);

        numberField(dqg, 'cache', 'Cache', 'ms', 0, 600000, 1000);
        dq.appendChild(dqg);

        var dl = group(dataTab, 'Long lists');
        var dlg = el('div', 'bselect-fgrid');

        segmented(dl, 'Virtual', 'Draw only the rows in view', 'virtual', [['auto', 'Auto'], ['1', 'On', true], ['0', 'Off', false]], o.virtual === true ? '1' : o.virtual === false ? '0' : 'auto');
        numberField(dlg, 'virtualFrom', 'Virtual from', 'rows', 20, 2000, 10);
        dl.appendChild(dlg);

        body.appendChild(fieldsList);

        // ================= Images
        var images = addTab('images', 'Images');
        var i1 = group(images);

        pills(i1, [['Show images', 'images', 'Picture, emoji or initials per option']]);
        fieldText(i1, 'imageField', 'Field', 'Item field with the image URL, emoji or icon class', 'e.g. photo');
        segmented(i1, 'Default', 'Picture for options that have none', 'avatar', [['initials', 'Initials'], ['icon', 'Person'], ['none', 'None']], o.avatar === 'none' && o.images === true ? 'initials' : o.avatar);
        segmented(i1, 'Colour', 'Initials / person background', 'avatarColor', [['random', 'Random'], ['accent', 'Accent']], o.avatarColor === 'accent' ? 'accent' : 'random');
        segmented(i1, 'Shape', 'Picture shape', 'imageShape', [['circle', 'Circle'], ['rounded', 'Round'], ['square', 'Square']], o.imageShape);
        segmented(i1, 'Size', 'Picture size', 'imageSize', [[20, 'S', 20], [24, 'M', 24], [32, 'L', 32], [40, 'XL', 40]], o.imageSize);

        var i3 = group(images, 'Per option (for testing - normally the picture comes from your data field)');
        var editor = el('div', 'bselect-imgrows');
        var emojiBar = el('div', 'bselect-emoji-bar');
        var EMOJIS = ['\ud83d\ude00', '\ud83d\ude0e', '\ud83d\udc68\u200d\u2695\ufe0f', '\ud83d\udc69\u200d\u2695\ufe0f', '\ud83c\udfe5', '\ud83d\udc8a', '\ud83d\udc89', '\ud83e\ude7a', '\ud83d\ude91', '\ud83d\udd2c', '\u2764\ufe0f', '\u2b50', '\ud83d\udd25', '\u2705', '\u26a0\ufe0f', '\ud83d\ude80', '\ud83c\udf3f', '\ud83d\udc36', '\ud83d\udc31', '\ud83c\udf4e', '\ud83d\udcc5', '\ud83d\udcbc', '\ud83d\udd12', '\ud83d\udee0\ufe0f'];
        var emojiTarget = null;
        var rowsSource = (self.items && self.items.length ? self.items : self.known).slice(0, 60);

        function mapValue(item) {
            return String(self._val(item));
        }

        function setPicture(item, value, previewNode, input) {
            var map = Object.assign({}, self.opts.imageMap || {});

            if (value === '' || value === null || value === undefined) {
                delete map[mapValue(item)];
            } else {
                map[mapValue(item)] = value;
            }

            self._setting('imageMap', Object.keys(map).length ? map : null);
            self._fillPicture(previewNode, item, 'bselect-imgrow-pic');
            previewNode.style.display = '';

            if (input) {
                input.value = value && !/^data:/i.test(value) ? value : value ? '(uploaded image)' : '';
            }
        }

        function shrink(file, done) {
            var reader = new FileReader();

            reader.onload = function () {
                var image = new Image();

                image.onload = function () {
                    var canvas = document.createElement('canvas');
                    var size = 96;
                    var scale = Math.min(1, size / Math.max(image.width, image.height));

                    canvas.width = Math.max(1, Math.round(image.width * scale));
                    canvas.height = Math.max(1, Math.round(image.height * scale));
                    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
                    done(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85));
                };
                image.src = reader.result;
            };
            reader.readAsDataURL(file);
        }

        EMOJIS.forEach(function (emoji) {
            var b = el('button', '', emoji);

            b.type = 'button';
            b.addEventListener('click', function () {
                if (emojiTarget) {
                    emojiTarget(emoji);
                }
            });
            emojiBar.appendChild(b);
        });
        emojiBar.style.display = 'none';

        lazyFill(images, function () {
        if (!rowsSource.length) {
            editor.appendChild(el('div', 'bselect-export-note', 'Open the list first so the options are loaded.'));
        }

        rowsSource.forEach(function (item) {
            var row = el('div', 'bselect-imgrow');
            var pic = el('span');
            var name = el('span', 'bselect-imgrow-name', self._lbl(item));
            var input = el('input', 'bselect-text-input');
            var emojiBtn = el('button', 'bselect-imgrow-btn', '\ud83d\ude00');
            var upload = el('label', 'bselect-imgrow-btn', '\u2191');
            var file = el('input');
            var clear = el('button', 'bselect-imgrow-btn', '\u00d7');
            var current = self.opts.imageMap && self.opts.imageMap[mapValue(item)];

            self._fillPicture(pic, item, 'bselect-imgrow-pic');
            pic.style.display = '';
            input.type = 'text';
            input.placeholder = 'image URL, emoji or icon class';
            input.value = current && !/^data:/i.test(current) ? current : current ? '(uploaded image)' : '';
            input.addEventListener('change', function () {
                if (input.value !== '(uploaded image)') {
                    setPicture(item, input.value.trim(), pic, null);
                }
            });
            input.addEventListener('focus', function () {
                emojiTarget = null;
            });
            emojiBtn.type = 'button';
            emojiBtn.title = 'Pick an emoji';
            emojiBtn.addEventListener('click', function () {
                var open = emojiBar.style.display !== 'none' && emojiTarget && emojiBar._row === row;

                emojiBar.style.display = open ? 'none' : '';
                emojiBar._row = row;
                emojiTarget = open ? null : function (emoji) {
                    setPicture(item, emoji, pic, input);
                };

                if (!open) {
                    row.parentNode.insertBefore(emojiBar, row.nextSibling);
                }
            });
            upload.title = 'Upload an image';
            file.type = 'file';
            file.accept = 'image/*';
            file.style.display = 'none';
            file.addEventListener('change', function () {
                if (file.files && file.files[0]) {
                    shrink(file.files[0], function (data) {
                        setPicture(item, data, pic, input);
                    });
                }
            });
            upload.appendChild(file);
            clear.type = 'button';
            clear.title = 'Remove the custom picture';
            clear.addEventListener('click', function () {
                setPicture(item, '', pic, input);
            });
            row.appendChild(pic);
            row.appendChild(name);
            row.appendChild(input);
            row.appendChild(emojiBtn);
            row.appendChild(upload);
            row.appendChild(clear);
            editor.appendChild(row);
        });
        });
        i3.appendChild(editor);

        // ================= Advanced: font and raw css variables
        var custom = addTab('custom', 'Advanced');
        var c3 = group(custom, 'Advanced');
        var fontInput = el('input', 'bselect-text-input');
        var fontRow;

        fontInput.type = 'text';
        fontInput.placeholder = 'e.g. Segoe UI, sans-serif';
        fontInput.value = o.fontFamily || '';
        fontInput.addEventListener('input', function () {
            self._setting('fontFamily', fontInput.value);
        });
        fontRow = line(c3, 'Font family', '', fontInput);
        fontRow.classList.add('bselect-rowc-wide');

        var vars = el('textarea', 'bselect-code bselect-code-small');

        vars.rows = 3;
        vars.spellcheck = false;
        vars.placeholder = '--bselect-radius: 14px\n--bselect-hover: #eef6ff';
        vars.value = Object.keys(o.style || {})
            .map(function (k) {
                return k + ': ' + o.style[k];
            })
            .join('\n');
        vars.addEventListener('input', function () {
            var parsed = {};

            vars.value.split('\n').forEach(function (rowText) {
                var m = /^\s*(--[\w-]+)\s*:\s*(.+?)\s*;?\s*$/.exec(rowText);

                if (m) {
                    parsed[m[1]] = m[2];
                }
            });
            self._setting('style', parsed);
        });
        line(c3, 'CSS variables', 'One per line: --name: value', vars, true);

        // ================= Export
        var exp = addTab('export', 'Export');
        var e1 = group(exp);
        var state = { format: 'global', scope: 'changed' };
        var area = el('textarea', 'bselect-code');
        var note = el('div', 'bselect-export-note');
        var copy = el('button', 'bselect-reset', 'Copy');

        area.readOnly = true;
        area.rows = drawer ? 9 : 6;
        area.spellcheck = false;

        function refresh() {
            area.value = self._exportText(state.format, state.scope);
            note.textContent = state.format === 'dropdown' ? 'Applies only to this dropdown (matched by id / name).' : state.format === 'global' ? 'Applies to every dropdown. Own options still win.' : 'Order of precedence: default → global → per dropdown → own.';
        }

        exp._refresh = refresh;

        var formatSeg = el('div', 'bselect-seg');

        formatSeg.style.setProperty('--n', 4);
        formatSeg.style.setProperty('--i', 0);

        [['global', 'Global'], ['dropdown', 'This one'], ['json', 'JSON'], ['html', 'HTML']].forEach(function (f, index) {
            var button = el('button', index === 0 ? 'bselect-seg-on' : '', f[1]);

            button.type = 'button';
            button.addEventListener('click', function () {
                [].forEach.call(formatSeg.children, function (b) {
                    b.classList.remove('bselect-seg-on');
                });
                button.classList.add('bselect-seg-on');
                formatSeg.style.setProperty('--i', index);
                state.format = f[0];
                refresh();
            });
            formatSeg.appendChild(button);
        });
        line(e1, 'Format', 'Where the settings will be pasted', formatSeg, true);

        var scopeSeg = el('div', 'bselect-seg');

        scopeSeg.style.setProperty('--n', 2);
        scopeSeg.style.setProperty('--i', 0);

        [['changed', 'Changes'], ['all', 'All']].forEach(function (f, index) {
            var button = el('button', index === 0 ? 'bselect-seg-on' : '', f[1]);

            button.type = 'button';
            button.addEventListener('click', function () {
                [].forEach.call(scopeSeg.children, function (b) {
                    b.classList.remove('bselect-seg-on');
                });
                button.classList.add('bselect-seg-on');
                scopeSeg.style.setProperty('--i', index);
                state.scope = f[0];
                refresh();
            });
            scopeSeg.appendChild(button);
        });
        line(e1, 'Include', '', scopeSeg);
        e1.appendChild(area);
        e1.appendChild(note);

        copy.type = 'button';
        copy.addEventListener('click', function () {
            area.select();

            try {
                (navigator.clipboard && navigator.clipboard.writeText(area.value)) || document.execCommand('copy');
            } catch (e) {
                document.execCommand('copy');
            }

            copy.textContent = 'Copied \u2713';
            copy.classList.add('bselect-copied');
            setTimeout(function () {
                copy.textContent = 'Copy';
                copy.classList.remove('bselect-copied');
            }, 1400);
        });

        // ---- footer
        var footer = el('div', 'bselect-settings-footer');
        var reset = el('button', 'bselect-reset', 'Reset');

        reset.type = 'button';
        reset.title = 'Back to the options this dropdown started with';
        reset.addEventListener('click', function () {
            self._resetSettings();
        });
        footer.appendChild(copy);

        if (drawer) {
            var done = el('button', 'bselect-btn-primary', 'Done');

            done.type = 'button';
            done.addEventListener('click', function () {
                self._settingsClose();

                if (self.gearBtn) {
                    self.gearBtn.focus();
                }
            });
            footer.appendChild(el('span', 'bselect-footer-gap'));
            footer.appendChild(reset);
            footer.appendChild(done);
        } else {
            footer.appendChild(reset);
        }

        available.forEach(function (id) {
            var labels = { behavior: 'Behavior', look: 'Look', button: 'Button', dropdown: 'Dropdown', list: 'List', data: 'Data', images: 'Images', custom: 'Advanced', export: 'Export' };

            if (!panes[id]) {
                return;
            }

            tabButtons[id].lastChild.textContent = labels[id];
        });

        // drop tabs the page switched off
        Object.keys(panes).forEach(function (id) {
            if (available.indexOf(id) < 0) {
                panes[id].parentNode.removeChild(panes[id]);
                tabs.removeChild(tabButtons[id]);
                delete panes[id];
                delete tabButtons[id];
            }
        });

        // find a setting: searches every tab at once
        var none = el('div', 'bselect-export-note bselect-find-none', 'No setting matches.');

        none.style.display = 'none';
        body.appendChild(none);
        find.addEventListener('input', function () {
            var q = find.value.trim().toLowerCase();
            var any = false;

            Object.keys(panes).forEach(function (id) {
                if (panes[id]._fill) {
                    panes[id]._fill();
                    panes[id]._fill = null;
                }
            });

            body.classList.toggle('bselect-searching', !!q);
            tabs.style.display = q ? 'none' : '';

            [].forEach.call(body.querySelectorAll('.bselect-rowc, .bselect-field, .bselect-pill, .bselect-imgrow'), function (node) {
                var text = (node.textContent + ' ' + (node.title || '') + ' ' + (node.getAttribute('data-keys') || '')).toLowerCase();
                var hit = !q || text.indexOf(q) >= 0;

                node.classList.toggle('bselect-hide', !hit);
                any = any || hit;
            });

            [].forEach.call(body.querySelectorAll('.bselect-card'), function (card) {
                card.classList.toggle('bselect-hide', !!q && !card.querySelector('.bselect-rowc:not(.bselect-hide), .bselect-field:not(.bselect-hide), .bselect-pill:not(.bselect-hide), .bselect-imgrow:not(.bselect-hide)'));
            });
            none.style.display = q && !any ? '' : 'none';
        });

        // keyboard: left/right between tabs, Esc closes the popup (not the dropdown)
        tabs.addEventListener('keydown', function (event) {
            var ids = Object.keys(tabButtons);
            var at = ids.indexOf(self._settingsTab);

            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                at = (at + (event.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length;
                tabButtons[ids[at]].click();
                tabButtons[ids[at]].focus();
            }
        });
        wrap.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && event.target.tagName === 'INPUT' && event.target.type !== 'checkbox') {
                event.preventDefault();
            }

            if (event.key === 'Escape') {
                event.stopPropagation();
                self._settingsClose();

                if (self.gearBtn) {
                    self.gearBtn.focus();
                }
            }
        });

        box.appendChild(head);

        if (drawer) {
            box.appendChild(findRow);
        }

        box.appendChild(tabs);
        box.appendChild(body);
        box.appendChild(footer);
        wrap.appendChild(box);
        wrap.addEventListener('click', function (event) {
            event.stopPropagation();
        });
        (drawer ? this.root : this.panel).appendChild(wrap);
        this.settingsEl = wrap;
        this.root.classList.add('bselect-settings-open');

        if (this.gearBtn) {
            this.gearBtn.classList.add('bselect-settings-action-active');
        }

        (tabButtons[this._settingsTab] || tabButtons[Object.keys(tabButtons)[0]]).click();
        moveIndicator();

        if (drawer) {
            closeBtn.focus();
            return;
        }

        // keep the popup fully inside the window
        var box2 = wrap.getBoundingClientRect();
        var shift = 0;

        if (box2.bottom > window.innerHeight - 8) {
            shift = window.innerHeight - 8 - box2.bottom;
        }

        if (box2.top + shift < 8) {
            shift = 8 - box2.top;
        }

        wrap.style.top = shift + 'px';
    },
});
