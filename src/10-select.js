/* Selection state, value API, form sync, enable/disable, destroy */
var docBound = false;

/** ONE click listener for all dropdowns on the page (a loop of 200 dropdowns used to add 200). */
function onDocClick(event) {
    var open = openInstance;

    if (open && open.isOpen && !open.root.contains(event.target) && Date.now() > (open._suppressUntil || 0)) {
        open.close();
    }
}

function bindDoc() {
    if (!docBound) {
        document.addEventListener('click', onDocClick);
        docBound = true;
    }
}

function unbindDoc() {
    if (docBound && !INSTANCES.length) {
        document.removeEventListener('click', onDocClick);
        docBound = false;
    }
}

function BSelect(target, userOptions) {
    var self = this;

    userOptions = userOptions || {};
    this.opts = buildOptions(userOptions, target);
    this.id = 'bselect-' + ++sequence;
    INSTANCES.push(this);
    this.source = target;
    this.items = [];
    this._kn = new Map(); // every item ever seen (value -> item), so selected labels survive paging/search
    this._cache = null; // shared normalised options (local lists)
    this._itemsShared = false; // items is the shared array: copy before changing it
    this._memo = null; // last visible list
    this.selected = [];
    this.page = 1;
    this.hasMore = false;
    this.loading = false;
    this.loaded = false;
    this.query = '';
    this.requestId = 0;
    this.active = -1;
    this.isOpen = false;
    this.timer = null;
    this.sortDir = 'asc';
    this.panelWidth = this.opts.panelWidth || null;
    this._base = {};
    PREF_KEYS.forEach(function (k) {
        self._base[k] = self.opts[k];
    });
    this._loadPrefs();

    this._build();

    bindDoc();

    this.setOptions(this.opts.options, true);

    if (this.opts.value !== null && this.opts.value !== undefined) {
        this.setValue(this.opts.value, null, true);
    }

    this._initial = this.getValue();
    this._initFeatures();
    this._render();

    // load: 'init' fetches immediately instead of on first open
    if (this.opts.loadOn === 'init' && this._isServer() && !this._waitingParent) {
        this._load(false);
    }
}

/** every item seen so far, as an array (read only) */
Object.defineProperty(BSelect.prototype, 'known', {
    get: function () {
        return Array.from(this._kn.values());
    },
});

/* selection + state */
Object.assign(BSelect.prototype, {
    _isSel: function (item) {
        return this._indexIn(this.selected, this._val(item)) >= 0;
    },

    _atMax: function () {
        return !!(this.opts.multiple && this.opts.max && this.selected.length >= this.opts.max);
    },

    _choose: function (item) {
        var i;
        var selecting;

        if (!item || this._isDisabled(item)) {
            return;
        }

        i = this._indexIn(this.selected, this._val(item));
        selecting = i < 0;

        if (this.opts.beforeChange && this.opts.beforeChange(item, selecting) === false) {
            return;
        }

        if (this.opts.multiple) {
            if (selecting) {
                this._memPicked(item);

                if (this._atMax()) {
                    this._emit('limit', this.opts.max);
                    this._flash('You can select up to ' + this.opts.max);
                    return;
                }

                this.selected.push(item);
            } else {
                this.selected.splice(i, 1);
            }
        } else {
            this._memPicked(item);
            this.selected = [item];
            this.close();

            if (this.trigger && document.activeElement !== this.trigger) {
                this.trigger.focus({ preventScroll: true });
            }
        }

        this._changed();
    },

    _toggleAll: function () {
        var self = this;
        var visible = this._visible().filter(function (item) {
            return !self._isDisabled(item);
        });
        var all = visible.every(function (item) {
            return self._isSel(item);
        });

        visible.forEach(function (item) {
            var i = self._indexIn(self.selected, self._val(item));

            if (all && i >= 0) {
                self.selected.splice(i, 1);
            } else if (!all && i < 0 && !self._atMax()) {
                self.selected.push(item);
            }
        });

        this._changed();
    },

    /** setValue(5) | setValue([1,2]) | setValue(5, {id:5, name:'Label'}) when the item is not loaded yet. */
    setValue: function (value, itemOrItems, silent) {
        var self = this;
        var values = value === null || value === undefined || value === '' ? [] : [].concat(value);
        var extra = itemOrItems ? [].concat(itemOrItems).map(this._norm, this) : [];

        this._remember(extra);
        this.selected = values.map(function (v) {
            var found = self._lookup(v);
            var placeholder;

            if (found) {
                return found;
            }

            placeholder = { _ph: true };
            placeholder[self.opts.valueField] = v;
            placeholder[self.opts.labelField] = v;
            return placeholder;
        });

        if (!this.opts.multiple) {
            this.selected = this.selected.slice(0, 1);
        }

        this._changed(silent);
        this._resolveMissing();
    },

    clear: function () {
        this.selected = [];
        this._changed();
    },

    /** Back to the value the dropdown had when created. */
    reset: function () {
        this._touched = false;
        this.setValue(this._initial);
    },

    getValue: function () {
        var values = this.selected.map(this._val, this);
        return this.opts.multiple ? values : values.length ? values[0] : '';
    },

    getSelected: function () {
        return this.opts.multiple ? this.selected.slice() : this.selected[0] || null;
    },

    getText: function () {
        var texts = this.selected.map(this._lbl, this);
        return this.opts.multiple ? texts : texts[0] || '';
    },

    /** a text of the list, with {name} placeholders: this._t('info', { from: 1, to: 20, total: 100 }) */
    _t: function (key, vars) {
        var custom = this.opts.texts && this.opts.texts[key];
        var text = String(custom !== undefined && custom !== null ? custom : TEXTS[key] !== undefined ? TEXTS[key] : key);

        return text.replace(/\{(\w+)\}/g, function (m, name) {
            return vars && vars[name] !== undefined ? vars[name] : m;
        });
    },

    _commitOn: function () {
        return !!(this.opts.commit && this.opts.multiple);
    },

    /** commit mode: leave the pending edits in the list and wait for Apply */
    _apply: function () {
        this._dirty = false;
        this._applying = true;
        this._changed();
        this._applying = false;
        this._snap = this.selected.slice();
        this._emit('apply', this.getValue(), this.getSelected());
        this.close();
    },

    _revertPending: function () {
        if (this._dirty) {
            this.selected = (this._snap || []).slice();
            this._dirty = false;
            this._selVer = (this._selVer || 0) + 1;
            this._renderTrigger();
        }
    },

    _cancel: function () {
        this._revertPending();
        this._emit('cancel');
        this.close();
    },

    _changed: function (silent) {
        var value = this.getValue();
        var src = this.source;

        this._selVer = (this._selVer || 0) + 1;

        // commit mode (panel open): only the list changes, the model / events wait for Apply
        if (this._commitOn() && this.isOpen && !this._applying && !silent) {
            this._dirty = true;

            if (this.panel && this.list && this._shown && this.view !== 'selected') {
                this._renderLight();
            } else {
                this._render();
            }

            return;
        }

        if (src.tagName === 'SELECT') {
            src.innerHTML = '';
            this.selected.forEach(
                function (item) {
                    var option = new Option(this._lbl(item), this._val(item), true, true);
                    src.appendChild(option);
                }.bind(this)
            );
        } else if (src.tagName === 'INPUT') {
            src.value = this.opts.multiple ? [].concat(value).join(',') : value;
        } else if (src.getAttribute('data-name')) {
            this._hidden = this._hidden || src.appendChild(el('input'));
            this._hidden.type = 'hidden';
            this._hidden.name = src.getAttribute('data-name');
            this._hidden.value = this.opts.multiple ? [].concat(value).join(',') : value;
        }

        if (!silent) {
            this._touched = true;
        }

        if (this.isOpen && this.panel && this.list && this._shown && this.view !== 'selected') {
            this._renderLight();
        } else {
            this._render();
        }

        this._validateIfTouched();

        if (silent) {
            return;
        }

        this._announce(
            this.selected.length === 0
                ? 'Selection cleared'
                : this.opts.multiple
                  ? this.selected.length + ' selected'
                  : this._lbl(this.selected[0]) + ' selected'
        );
        this._emit('change', value, this.getSelected());

        if (src.tagName === 'SELECT' || src.tagName === 'INPUT') {
            src.dispatchEvent(new Event('change', { bubbles: true }));
        }
    },

    disable: function (state) {
        this.userDisabled = state !== false;
        this._applyDisabled();
        this.close();
        this._render();
    },

    enable: function () {
        this.disable(false);
    },

    _applyDisabled: function () {
        this.disabled = !!this.userDisabled || !!this._waitingParent;
    },

    destroy: function () {
        this._featuresDestroy();
        this._themeDestroy();
        clearTimeout(this.timer);
        this.close();
        this._popoverHide();

        if (this.root.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }

        if (this.source.tagName === 'SELECT' || this.source.tagName === 'INPUT') {
            this.source.style.display = '';
        }

        delete this.source._bselect;
        INSTANCES.splice(INSTANCES.indexOf(this), 1);
        unbindDoc();
    },
});
