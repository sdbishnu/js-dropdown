/* Sort button, settings gear + popup, optional saved preferences (localStorage) */
var PREF_KEYS = ['search', 'sort', 'multiple', 'load', 'pageSize', 'clearable', 'color', 'borderColor', 'borderWidth', 'mode', 'size', 'shape', 'variant', 'display', 'popover', 'lazyHint', 'density', 'palette', 'background', 'images', 'avatar', 'avatarColor', 'imageShape', 'imageSize', 'radius', 'fontSize', 'rowHeight', 'panelWidth', 'listHeight', 'textColor', 'hoverColor', 'selectedColor', 'panelBackground', 'fontFamily', 'shadow', 'style', 'imageMap', 'rowStyle', 'fieldHeight', 'maxChips', 'fieldBackground', 'fieldTextColor', 'fieldColor', 'panelMode', 'panelPalette', 'panelTextColor', 'panelBorderColor', 'panelShape', 'panelRadius', 'panelColor', 'rowFontSize', 'arrow', 'chevron', 'info', 'commit', 'subText', 'subTextField', 'subTextMap', 'subTextPlace', 'viewTabs', 'selectAll', 'commitClose', 'infoPlace', 'infoAlign', 'imageField', 'serverSearch', 'searchMinChars', 'recent', 'favorites', 'highlight', 'preload', 'cache', 'virtual', 'virtualFrom', 'groupField'];

Object.assign(BSelect.prototype, {
    _prefKey: function () {
        var p = this.opts.persist;
        return p ? 'bselect:' + (typeof p === 'string' ? p : this.source.id || this.source.getAttribute('data-name') || 'default') : null;
    },

    _loadPrefs: function () {
        var key = this._prefKey();
        var saved;

        try {
            saved = key && JSON.parse(localStorage.getItem(key) || 'null');
        } catch (e) {
            saved = null;
        }

        if (saved) {
            delete saved.settings; // an old saved 'settings:false' must not hide the gear
            Object.assign(this.opts, saved);
        }
    },

    _savePrefs: function () {
        var key = this._prefKey();
        var data = {};
        var opts = this.opts;

        if (!key) {
            return;
        }

        PREF_KEYS.forEach(function (k) {
            data[k] = opts[k];
        });

        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            /* storage blocked - ignore */
        }
    },

    /** Adds the sort button and settings gear to the panel header. */
    _toolsBuild: function (header) {
        var self = this;
        var o = this.opts;
        var actions;

        if (!o.sort && !o.settings) {
            return;
        }

        actions = el('div', 'bselect-actions');

        if (o.sort) {
            this.sortBtn = el('button', 'bselect-action', this.sortDir === 'desc' ? '↓' : '↑');
            this.sortBtn.type = 'button';
            this.sortBtn.setAttribute('aria-label', 'Toggle sort direction');
            this.sortBtn.addEventListener('click', function () {
                self.sortDir = self.sortDir === 'desc' ? 'asc' : 'desc';
                self.sortBtn.textContent = self.sortDir === 'desc' ? '↓' : '↑';

                if (o.serverSort && self._isServer()) {
                    self._load(false);
                } else {
                    self._render();
                }
            });
            actions.appendChild(this.sortBtn);
        }

        if (o.settings) {
            this.gearBtn = el('button', 'bselect-action bselect-settings-action');
            this.gearBtn.type = 'button';
            this.gearBtn.setAttribute('aria-label', 'Dropdown settings');
            this.gearBtn.innerHTML = ICONS.cog;
            this.gearBtn.addEventListener('click', function () {
                self._settingsToggle();
            });
            actions.appendChild(this.gearBtn);
        }

        header.appendChild(actions);
    },

    /** Back to the options the page gave this dropdown (clears the saved browser preferences too). */
    _resetSettings: function () {
        var key = this._prefKey();

        Object.assign(this.opts, this._base || {});

        try {
            if (key) {
                localStorage.removeItem(key);
            }
        } catch (e) {
            /* storage blocked - ignore */
        }

        this._applyAppearance();
        this._rebuildPanel();
        this._changed(true);

        if (this.settingsEl && this.opts.settingsStyle === 'drawer') {
            this._settingsRefresh();
        }
    },

    /** brief ring on the button so you see which dropdown the setting was applied to */
    _flashField: function () {
        var self = this;

        if (this.opts.animation === false) {
            return;
        }

        this.root.classList.remove('bselect-flash');
        void this.root.offsetWidth; // restart the animation
        this.root.classList.add('bselect-flash');
        clearTimeout(this._flashFieldTimer);
        this._flashFieldTimer = setTimeout(function () {
            self.root.classList.remove('bselect-flash');
        }, 600);
    },

    /** rebuild the open drawer in place (no slide animation) */
    _settingsRefresh: function () {
        this._reopening = true;
        this._settingsClose();
        this._settingsToggle();
        this._reopening = false;
    },

    _settingsClose: function () {
        if (this.settingsEl && this.settingsEl.parentNode) {
            this.settingsEl.parentNode.removeChild(this.settingsEl);
        }

        this.settingsEl = null;
        this.root.classList.remove('bselect-settings-open');

        if (this.gearBtn) {
            this.gearBtn.classList.remove('bselect-settings-action-active');
        }
    },

    /** Apply one changed setting at runtime. */
    _setting: function (key, value) {
        var o = this.opts;
        var rebuild = false;
        var reload = false;

        o[key] = value;
        this._memo = null; // the visible list depends on many settings (search fields, groups, sort ...)

        if (key.indexOf('subText') === 0) {
            this._subVer = (this._subVer || 0) + 1; // search text of the rows changed
            this._memo = null;
        }

        // choosing a palette clears a custom background and the other way round; picking a mode clears both
        if (key === 'panelPalette') {
            o.panelBackground = '';
        } else if (key === 'panelBackground') {
            o.panelPalette = '';
        } else if (key === 'palette') {
            o.background = '';
        } else if (key === 'background') {
            o.palette = '';
        } else if (key === 'mode') {
            o.palette = '';
            o.background = '';
        } else if (key === 'images' && value && o.avatar === 'none') {
            o.avatar = 'initials';
        } else if (key === 'size') {
            o.fieldHeight = null;
            o.fontSize = null;
        } else if (key === 'density') {
            o.rowHeight = null;
        } else if (key === 'variant') {
            o.borderWidth = null;
        } else if (key === 'display') {
            o.maxChips = 3;
        } else if (key === 'shape') {
            o.radius = null;
        } else if (key === 'panelShape') {
            o.panelRadius = null;
        } else if (key === 'panelWidth') {
            this.panelWidth = value || null;

            if (this.isOpen) {
                this._position();
            }
        }

        if (key === 'multiple') {
            if (!value && this.selected.length > 1) {
                this.selected = this.selected.slice(0, 1);
            }

            if (this.source.tagName === 'SELECT') {
                this.source.multiple = !!value;
            }

            rebuild = true;
        } else if (['search', 'sort', 'settings', 'arrow', 'info', 'commit', 'viewTabs', 'infoPlace', 'infoAlign', 'recent', 'favorites'].indexOf(key) >= 0) {
            if (!value && key === 'search') {
                this.query = '';
            }

            rebuild = true;
        } else if (key === 'serverSearch' && this._isServer()) {
            reload = true;
        } else if (key === 'load' || key === 'pageSize') {
            this._limit = this._firstLimit();
            reload = this._serverPaged() || (this._isServer() && key === 'load');
        } else if (['color', 'borderColor', 'borderWidth', 'mode', 'size', 'shape', 'variant', 'display', 'density', 'palette', 'background', 'images', 'avatar', 'avatarColor', 'imageShape', 'imageSize', 'radius', 'fontSize', 'rowHeight', 'listHeight', 'textColor', 'hoverColor', 'selectedColor', 'panelBackground', 'fontFamily', 'shadow', 'style', 'imageMap', 'rowStyle', 'fieldHeight', 'fieldBackground', 'fieldTextColor', 'fieldColor', 'panelMode', 'panelPalette', 'panelTextColor', 'panelBorderColor', 'panelShape', 'panelRadius', 'panelColor', 'rowFontSize', 'arrow', 'chevron', 'panelBackground'].indexOf(key) >= 0) {
            this._applyAppearance();
        }

        this._savePrefs();
        this._flashField();

        if ((key === 'load' || key === 'multiple') && this.settingsEl) {
            this._settingsRefresh();
        }

        if (rebuild) {
            this._rebuildPanel();
            this._changed(key !== 'multiple');
        } else if (reload) {
            this.loaded = false;
            this._load(false);
        } else {
            this._render();
        }
    },

    _rebuildPanel: function () {
        // the popup lives inside the panel: carry the same element over, so scroll, focus and the open tab stay as they are
        var keep = this.settingsEl && this.opts.settingsStyle !== 'drawer' ? this.settingsEl : null;

        if (keep && keep.parentNode) {
            keep.parentNode.removeChild(keep);
        }

        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
        }

        this.input = this.allBtn = this.viewBar = null;

        if (!this.isOpen) {
            this.panel = null;

            if (keep) {
                this.settingsEl = null;
                this.root.classList.remove('bselect-settings-open');
            }

            return;
        }

        this._buildPanel();
        this.root.appendChild(this.panel);

        if (keep) {
            this.panel.appendChild(keep);
        }

        this._position();
        this._render();
    },
});
