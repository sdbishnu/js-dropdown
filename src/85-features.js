/* Validation (required/min/max), cascade (dependsOn), create-new (tags), theme, flash message */
Object.assign(BSelect.prototype, {
    _initFeatures: function () {
        var self = this;
        var o = this.opts;
        var form;

        if (o.required === null || o.required === undefined) {
            o.required = !!this.source.required;
        }

        // The hidden native control must not block submit with an invisible "required" bubble.
        if (this.source.tagName === 'SELECT') {
            this.source.required = false;
        }

        if (this._hasRules()) {
            form = this.source.closest ? this.source.closest('form') : null;

            if (form) {
                this._onSubmit = function (event) {
                    if (!self.disabled && !self._validate(true)) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        self.trigger.focus();
                    }
                };
                this._form = form;
                form.addEventListener('submit', this._onSubmit, true);
            }
        }

        this._cascadeInit();
    },

    _featuresDestroy: function () {
        if (this._form && this._onSubmit) {
            this._form.removeEventListener('submit', this._onSubmit, true);
        }

        if (this._onParent) {
            document.removeEventListener('bselect:change', this._onParent);
        }

        clearTimeout(this._flashTimer);
    },

    // ---------- validation ----------
    _hasRules: function () {
        return !!(this.opts.required || this.opts.min);
    },

    _message: function () {
        var o = this.opts;
        var n = this.selected.length;

        if (o.required && !n) {
            return o.requiredMessage;
        }

        if (o.min && n < o.min) {
            return 'Select at least ' + o.min;
        }

        return '';
    },

    isValid: function () {
        return !this._message();
    },

    /** Validate and show the message under the field. */
    validate: function () {
        this._touched = true;
        return this._validate(true);
    },

    _validate: function (show) {
        var message = this._message();

        this.root.classList.toggle('bselect-invalid', !!message && !!show);

        if (show && message) {
            this._errorBox = this._errorBox || this.root.appendChild(el('div', 'bselect-error-text'));
            this._errorBox.textContent = message;
        } else if (this._errorBox) {
            this._errorBox.textContent = '';
        }

        if (show) {
            this._emit('validate', !message, message);
        }

        return !message;
    },

    _validateIfTouched: function () {
        if (this._hasRules() && this._touched) {
            this._validate(true);
        }
    },

    /** Short message under the field, e.g. when the max selection is reached. */
    _flash: function (text) {
        var self = this;

        this._flashBox = this._flashBox || this.root.appendChild(el('div', 'bselect-error-text'));
        this._flashBox.textContent = text;
        clearTimeout(this._flashTimer);
        this._flashTimer = setTimeout(function () {
            self._flashBox.textContent = '';
        }, 2200);
    },

    // ---------- cascade: dependsOn ----------
    _parentEl: function () {
        var d = this.opts.dependsOn;

        if (!d) {
            return null;
        }

        if (d instanceof BSelect) {
            return d.source;
        }

        return typeof d === 'string' ? document.querySelector(d) : d;
    },

    _parentValue: function () {
        var parent = this._parentEl();

        return parent && parent._bselect ? parent._bselect.getValue() : parent ? parent.value : undefined;
    },

    _depParams: function () {
        var value;

        if (!this.opts.dependsOn) {
            return {};
        }

        value = this._parentValue();

        var out = {};
        out[this.opts.dependsParam || 'parent'] = value;
        return out;
    },

    _cascadeInit: function () {
        var self = this;
        var o = this.opts;

        if (!o.dependsOn) {
            return;
        }

        function empty(v) {
            return v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
        }

        function refresh(changed) {
            var wait = o.dependsRequired !== false && empty(self._parentValue());

            self._waitingParent = wait;
            self._applyDisabled();

            if (changed) {
                self.selected = [];
                self._changed();
            }

            self.loaded = false;
            self.items = [];

            if (!self._isServer()) {
                self.setOptions(undefined, true);
            }

            self._render();

            if (self.isOpen && self._isServer() && !wait) {
                self._load(false);
            }
        }

        this._onParent = function (event) {
            if (event.target === self._parentEl()) {
                refresh(true);
            }
        };

        document.addEventListener('bselect:change', this._onParent);
        refresh(false);
    },

    // ---------- create new item (tags) ----------
    _canCreate: function () {
        var q;
        var self = this;

        if (!this.opts.creatable || !this.query) {
            return false;
        }

        q = this.query.toLowerCase();

        return !this.items.some(function (item) {
            return self._lbl(item).toLowerCase() === q;
        });
    },

    _create: function () {
        var self = this;
        var text = this.query;
        var made = this.opts.onCreate ? this.opts.onCreate(text) : null;

        function done(item) {
            var norm;

            if (!item) {
                return;
            }

            norm = self._norm(item);
            self._ownItems();
            self.items.unshift(norm);
            self._remember([norm]);

            if (self.input) {
                self.input.value = '';
            }

            self.query = '';
            self._emit('create', norm);
            self._choose(norm);
            self._render();
        }

        if (made && typeof made.then === 'function') {
            made.then(done);
            return;
        }

        if (!made) {
            made = {};
            made[this.opts.valueField] = text;
            made[this.opts.labelField] = text;
            made._new = true;
        }

        done(made);
    },
});
