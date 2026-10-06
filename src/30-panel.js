/* DOM, panel open/close, rendering, keyboard */
Object.assign(BSelect.prototype, {
        _build: function () {
            var self = this;
            var o = this.opts;
            var root = el('div', 'bselect');
            var trigger = el('button', 'bselect-trigger');
            var text = el('span', 'bselect-trigger-text');
            var actions = el('span', 'bselect-trigger-actions');

            trigger.type = 'button';
            trigger.setAttribute('aria-haspopup', 'listbox');
            this.leadEl = el('span', 'bselect-lead');
            this.prefixEl = el('span', 'bselect-affix bselect-prefix');
            this.label = el('span', 'bselect-item-label bselect-trigger-label');
            this.chipsEl = el('span', 'bselect-chips');
            this.suffixEl = el('span', 'bselect-affix bselect-suffix');
            [this.leadEl, this.prefixEl, this.label, this.chipsEl, this.suffixEl].forEach(function (node) {
                text.appendChild(node);
            });
            this.clearBtn = el('span', 'bselect-clear', o.clearIcon);
            actions.appendChild(this.clearBtn);
            actions.appendChild(el('span', 'bselect-chevron'));
            trigger.appendChild(text);
            trigger.appendChild(actions);
            root.appendChild(trigger);

            // rows are fetched while the pointer travels to the button / on focus, so opening does not wait for the network
            function preload() {
                if (o.preload !== false && self._isServer() && !self.loaded && !self.loading && !self.isOpen && !self._waitingParent && !self.disabled) {
                    self._load(false);
                }
            }

            trigger.addEventListener('pointerenter', preload);
            trigger.addEventListener('focus', preload);
            trigger.addEventListener('click', function () {
                self.isOpen ? self.close() : self.open();
            });
            trigger.addEventListener('keydown', function (event) {
                self._key(event);
            });
            this.clearBtn.addEventListener('click', function (event) {
                event.stopPropagation();
                self.clear();
            });

            this.root = root;
            this.trigger = trigger;
            this.textBox = text;
            this._popoverInit();
            this._rippleInit();

            // polite live region: result counts, selection, loading, errors
            this._sr = el('div', 'bselect-sr');
            this._sr.setAttribute('role', 'status');
            this._sr.setAttribute('aria-live', 'polite');
            this._sr.setAttribute('aria-atomic', 'true');
            root.appendChild(this._sr);
            this._applyAppearance();
            this.trigger.setAttribute('aria-controls', this.id + '-list');

            if (o.label) {
                this.labelEl = el('label', 'bselect-label', o.label);
                this.labelEl.addEventListener('click', function () {
                    self.trigger.focus();
                });
                root.insertBefore(this.labelEl, trigger);
            }

            // A <select>/<input> is hidden and kept in sync so normal forms still submit.
            if (this.source.tagName === 'SELECT' || this.source.tagName === 'INPUT') {
                this.source.style.display = 'none';
                this.source.parentNode.insertBefore(root, this.source.nextSibling);
            } else {
                this.source.innerHTML = '';
                this.source.appendChild(root);
            }

            if (this.source.tagName === 'SELECT' && o.multiple) {
                this.source.multiple = true;
            }

            this.userDisabled = !!o.disabled || !!this.source.disabled;
            this.disabled = this.userDisabled;
        },

        open: function () {
            var o = this.opts;

            if (this.isOpen || this.disabled) {
                return;
            }

            var previous = null;

            if (openInstance && openInstance !== this) {
                previous = openInstance.root.getBoundingClientRect();
                openInstance.close();
            }

            openInstance = this;
            this.isOpen = true;
            this.root.classList.add('bselect-open');

            if (!this.panel) {
                this._buildPanel();
            }

            this.root.appendChild(this.panel);

            this._popoverHide();
            this._limit = this._firstLimit();
            this.active = -1;
            this.view = 'all';
            this._snap = this.selected.slice();
            this._dirty = false;
            this._position();
            this._switchFrom(previous);
            this._bindWindow(true);

            if (!this.loaded) {
                this._load(false);
            } else {
                this._render();
            }

            if (this.input) {
                // preventScroll: focusing must never scroll the page (that was a second "jump" on open)
                this.input.focus({ preventScroll: true });
            }

            this._emit('open');
        },

        close: function () {
            if (!this.isOpen) {
                return;
            }

            // commit mode: closing without Apply discards the pending edits (or applies them: commitClose:'apply')
            if (this._commitOn() && this._dirty) {
                if (this.opts.commitClose === 'apply') {
                    this._dirty = false;
                    this._applying = true;
                    this.isOpen = false;
                    this._changed();
                    this.isOpen = true;
                    this._applying = false;
                    this._emit('apply', this.getValue(), this.getSelected());
                } else {
                    this._revertPending();
                    this._emit('cancel');
                }
            }

            this.isOpen = false;
            this._touched = true;
            this._settingsClose();
            this._bindWindow(false);
            this.root.classList.remove('bselect-open', 'bselect-up', 'bselect-end', 'bselect-switching');
            this._ariaActive();

            if (this.panel && this.panel.parentNode) {
                this.panel.parentNode.removeChild(this.panel);
            }

            if (this.input && this.query) {
                this.input.value = '';
                this.query = '';
                this.searchHolder.style.display = '';
                this.searchClear.style.display = 'none';

                if (this._isServerSearch()) {
                    this.loaded = false;
                }
            }

            if (openInstance === this) {
                openInstance = null;
            }

            // drop the panel (rows, listeners): it is rebuilt in a few ms on the next open
            this._mqStop();
            this.panel = this.list = this.wrap = this.input = this.viewBar = this.allBtn = this.handle = this._shown = this.footer = this.footerCount = this.viewInfo = null;
            this.view = 'all';
            this.noteBox = null;
            this.rail = null;
            this.gearBtn = this.sortBtn = this.searchHolder = this.searchClear = null;

            this._validateIfTouched();
            this._emit('close');
        },
});
