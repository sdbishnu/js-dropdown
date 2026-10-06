/* Appearance: turns the appearance options (theme, mode, size, shape, variant, colours...) into css classes + variables */
var SIZES = {
    sm: { height: 28, font: 12, item: 26, itemFont: 11 },
    md: { height: 35, font: 13, item: 31, itemFont: 12 },
    lg: { height: 42, font: 15, item: 38, itemFont: 14 },
};
var SHADOWS = { none: 'none', soft: '0 8px 24px rgba(0,0,0,.12)', strong: '0 14px 40px rgba(0,0,0,.28)' };

/** relative luminance 0..1 of #rgb / #rrggbb / rgb(...), or null when it can not be parsed */
function luminance(colour) {
    var c = String(colour).trim();
    var m;
    var r;
    var g;
    var b;

    if ((m = /^#([0-9a-f]{3})$/i.exec(c))) {
        c = '#' + m[1].replace(/./g, 'var DENSITY =var DENSITY =');
    }

    if ((m = /^#([0-9a-f]{6})$/i.exec(c))) {
        r = parseInt(m[1].slice(0, 2), 16);
        g = parseInt(m[1].slice(2, 4), 16);
        b = parseInt(m[1].slice(4, 6), 16);
    } else if ((m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(c))) {
        r = +m[1];
        g = +m[2];
        b = +m[3];
    } else {
        return null;
    }

    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

var DENSITY = { compact: -5, normal: 0, comfortable: 6 };
var SHAPES = {
    square: { field: '2px', panel: '3px', item: '0px', box: '2px' },
    rounded: { field: '7px', panel: '8px', item: '0px', box: '4px' },
    pill: { field: '999px', panel: '16px', item: '10px', box: '50%' },
};

Object.assign(BSelect.prototype, {
    /** colours for one scope: 'field' (the select button, the root) or 'panel' (the dropdown) */
    _tokens: function (scope) {
        var o = this.opts;
        var panel = scope === 'panel';
        var panelPal = panel && PALETTES[o.panelPalette] ? PALETTES[o.panelPalette] : null;
        var sharedPal = PALETTES[o.palette] || null;
        var palette = panelPal || sharedPal;
        var mode = (panel && o.panelMode) || o.mode;
        var own = panel ? o.panelBackground : o.background;
        var bg = panel ? o.panelBackground || (panelPal && panelPal.bg) || o.background || (sharedPal && sharedPal.bg) || '' : o.background || (sharedPal && sharedPal.bg) || '';
        var lum = bg ? luminance(bg) : null;
        var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        var dark = bg ? lum !== null && lum < 0.45 : mode === 'dark' || (mode === 'auto' && mq);
        var textOption = panel ? o.panelTextColor || (panelPal && panelPal.text) || o.textColor : o.textColor;

        return {
            bg: bg,
            dark: dark,
            custom: !!bg,
            text: textOption || (palette && palette.text) || (bg && lum !== null ? (dark ? '#e8ecf3' : '#202733') : ''),
            muted: palette && !own && !(panel && o.background) ? palette.muted : '',
            accent: (panel ? o.panelColor : o.fieldColor) || o.color,
        };
    },

    _applyAppearance: function () {
        var self = this;

        this._rowH = 0; // row size may have changed (size, density, row height)
        var o = this.opts;
        var root = this.root;
        var size = SIZES[o.size] || SIZES.md;
        var shape = SHAPES[o.shape] || SHAPES.rounded;
        var panelShape = SHAPES[o.panelShape] || shape;
        var extra = DENSITY[o.density] || 0;
        var style = root.style;
        var f = this._tokens('field');
        var radius = o.radius !== null && o.radius !== undefined && o.radius !== '' ? parseFloat(o.radius) + 'px' : shape.field;
        var panelRadius = o.panelRadius !== null && o.panelRadius !== undefined && o.panelRadius !== '' ? parseFloat(o.panelRadius) + 'px' : panelShape.panel;

        function set(name, value) {
            if (value === '' || value === null || value === undefined) {
                style.removeProperty(name);
            } else {
                style.setProperty(name, value);
            }
        }

        // classes: drop the old appearance classes, add the current ones
        root.className = root.className
            .split(/\s+/)
            .filter(function (c) {
                return c && !/^bselect-(size|shape|variant|check|image|display|density)-/.test(c) && c !== 'bselect-dark' && c !== 'bselect-no-anim' && c !== 'bselect-custom-class';
            })
            .join(' ');

        [
            'bselect-size-' + (SIZES[o.size] ? o.size : 'md'),
            'bselect-shape-' + (SHAPES[o.shape] ? o.shape : 'rounded'),
            'bselect-variant-' + o.variant,
            'bselect-check-' + o.checkStyle,
            'bselect-image-' + o.imageShape,
            'bselect-display-' + o.display,
            'bselect-density-' + o.density,
        ].forEach(function (c) {
            root.classList.add(c);
        });

        root.classList.toggle('bselect-dark', !!f.dark);
        root.classList.toggle('bselect-custom-bg', !!f.custom);
        root.classList.toggle('bselect-no-anim', o.animation === false);
        root.classList.toggle('bselect-rows-inset', o.rowStyle !== 'flat');
        root.classList.toggle('bselect-no-chevron', o.chevron === false);
        root.classList.toggle('bselect-field-bg', !!o.fieldBackground);
        root.classList.toggle('bselect-field-text', !!o.fieldTextColor);

        (this._customClasses || []).forEach(function (c) {
            root.classList.remove(c);
        });
        this._customClasses = String(o.cssClass || '').split(/\s+/).filter(Boolean);
        this._customClasses.forEach(function (c) {
            root.classList.add(c);
        });

        // ---- the select button
        set('--bselect-height', (o.fieldHeight ? parseFloat(o.fieldHeight) : size.height) + 'px');
        set('--bselect-font', o.fontSize ? parseFloat(o.fontSize) + 'px' : size.font + 'px');
        set('--bselect-radius', radius);
        set('--bselect-box-radius', shape.box);
        set('--bselect-color', f.accent);
        set('--bselect-trigger-border', o.borderColor || f.accent);
        set('--bselect-trigger-border-width', o.borderWidth === null || o.borderWidth === undefined ? '' : o.borderWidth + 'px');
        set('--bselect-field-bg', o.fieldBackground);
        set('--bselect-field-text', o.fieldTextColor);
        set('--bselect-text', f.text);
        set('--bselect-muted', f.muted);
        set('--bselect-bg', f.bg);
        set('--bselect-pic-size', (parseFloat(o.imageSize) || 24) + 'px');
        set('font-family', o.fontFamily);
        style.width = o.width || '';

        // ---- the dropdown (panel): sizes and rows live on the root so the panel inherits them
        set('--bselect-item-height', (o.rowHeight ? parseFloat(o.rowHeight) : size.item + extra) + 'px');
        set('--bselect-item-font', (o.rowFontSize ? parseFloat(o.rowFontSize) : size.itemFont) + 'px');
        set('--bselect-panel-radius', panelRadius);
        set('--bselect-item-radius', panelShape.item);
        set('--bselect-hover', o.hoverColor);
        set('--bselect-selected', o.selectedColor);
        set('--bselect-shadow', SHADOWS[o.shadow] || o.shadow);
        set('--bselect-list-height', o.listHeight ? o.listHeight + 'px' : '');

        // style / vars: any css variable, e.g. { '--bselect-radius': '14px' }
        [o.vars, o.style].forEach(function (bag) {
            Object.keys(bag || {}).forEach(function (name) {
                style.setProperty(name, bag[name]);
            });
        });

        // mode:'auto' follows the operating system live
        if ((o.mode === 'auto' || o.panelMode === 'auto') && window.matchMedia && !this._modeQuery) {
            this._modeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this._onMode = function () {
                self._applyAppearance();
            };
            this._modeQuery.addEventListener && this._modeQuery.addEventListener('change', this._onMode);
        }

        this._applyPanelAppearance();
    },

    /** colours that belong to the dropdown only (mode, palette, background, text, border, accent) */
    _applyPanelAppearance: function () {
        var panel = this.panel;
        var o = this.opts;
        var field;
        var p;

        if (!panel) {
            return;
        }

        panel.classList.remove('bselect-dark', 'bselect-custom-bg', 'bselect-force-light');
        ['--bselect-bg', '--bselect-text', '--bselect-muted', '--bselect-color', '--bselect-panel-border'].forEach(function (name) {
            panel.style.removeProperty(name);
        });

        if (!(o.panelMode || o.panelPalette || o.panelBackground || o.panelTextColor || o.panelColor || o.panelBorderColor)) {
            return; // same look as the button: inherit everything
        }

        field = this._tokens('field');
        p = this._tokens('panel');

        if (p.dark) {
            panel.classList.add('bselect-dark');
        } else if (field.dark) {
            panel.classList.add('bselect-force-light');
        }

        panel.classList.toggle('bselect-custom-bg', !!p.custom);

        if (p.bg) {
            panel.style.setProperty('--bselect-bg', p.bg);
        }

        if (p.text) {
            panel.style.setProperty('--bselect-text', p.text);
        }

        if (p.muted) {
            panel.style.setProperty('--bselect-muted', p.muted);
        }

        if (o.panelColor) {
            panel.style.setProperty('--bselect-color', o.panelColor);
        }

        if (o.panelBorderColor) {
            panel.style.setProperty('--bselect-panel-border', o.panelBorderColor);
        }
    },

    /** Change appearance at runtime: inst.setAppearance({ size:'lg', shape:'pill', mode:'dark' }) */
    setAppearance: function (changes) {
        Object.assign(this.opts, changes || {});
        this._applyAppearance();
        this._render();
        this._savePrefs();
    },

    /** inst.setTheme('dark') - apply a registered theme on top of the current options */
    setTheme: function (name) {
        if (!THEMES[name]) {
            return;
        }

        this.opts.theme = name;
        this.setAppearance(THEMES[name]);
    },

    _themeDestroy: function () {
        if (this._modeQuery && this._onMode && this._modeQuery.removeEventListener) {
            this._modeQuery.removeEventListener('change', this._onMode);
        }
    },
});
