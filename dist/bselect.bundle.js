/* BSelect v1.0.0 - built 2026-10-07 - do not edit, edit src/ and run node build.js */
/*
 * BSelect - plain JavaScript dropdown (no AngularJS, no jQuery required).
 *
 * Usage:
 *   <select id="user"></select>            (or any <div>/<input>)
 *   var user = bselect('#user', { url: 'php/user.php?action=dropdown', load: 'scroll' });
 *   var tags = bselect('#tags', { options: [{id:1,name:'A'}], multiple: true, display: 'chips' });
 *
 *   user.getValue();  user.setValue(5);  user.clear();  user.reload();  user.destroy();
 *
 * Or fully in HTML (auto-initialised on page load):
 *   <div data-bselect data-url="php/user.php?action=dropdown" data-multiple data-load="scroll"
 *        data-placeholder="Select user" data-name="user_id" data-theme="dark" data-size="lg"></div>
 */
(function (window, document) {
    'use strict';

    var currentScript = document.currentScript;
    // the guide page is built next to the bundle (dist/guide.html)
    var GUIDE_URL = currentScript && currentScript.src ? currentScript.src.replace(/bselect[\w.-]*\.js(\?.*)?$/i, 'guide.html') : 'guide.html';
    var sequence = 0;
    var REQ_CACHE = new Map(); // 'METHOD url params' -> { t, promise }  (server answers shared by every dropdown)
    // every text the list shows
    var TEXTS = {
        all: 'All',
        selected: 'Selected',
        recent: 'Recent',
        favorites: 'Favourites',
        apply: 'Apply',
        cancel: 'Cancel',
        pending: 'Unapplied changes',
        selectAll: 'Select all',
        unselectAll: 'Unselect all',
        clearAll: 'Clear all',
        limitHit: 'You can select up to {max}',
        retry: 'Retry',
        nSelected: '{n} selected',
        info: '{from}\u2013{to} of {total}',
        infoMore: '{from}\u2013{to} of {total}+',
        emptySelected: 'Nothing selected yet',
        emptySelectedHint: 'Pick items in the All tab.',
        emptyRecent: 'No recent items',
        emptyRecentHint: 'Items you pick are listed here.',
        emptyFav: 'No favourites yet',
        emptyFavHint: 'Click the star on a row.',
    };
    var DATA = {}; // bselect.data('staff', array): named arrays shared by many dropdowns (data-options="staff", options:'staff')
    var OPTION_CACHE = typeof WeakMap === 'function' ? new WeakMap() : null; // array -> normalised items + value index, built once and shared
    var INSTANCES = []; // every live dropdown (bselect.all())
    var openInstance = null;
    var PRESETS = {};
    var PROJECT = {}; // bselect.defaults({...}) - GLOBAL defaults
    var REGISTRY = []; // bselect.defaults('#id', {...}) - per dropdown defaults, set from any js file

    // Load the shared stylesheet once, next to this script.
    if (!document.querySelector('link[data-bselect-style]')) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.setAttribute('data-bselect-style', '');
        link.href =
            currentScript && currentScript.src
                ? currentScript.src.replace(/bselect[\w.-]*\.js(\?.*)?$/i, /\.min\.js/i.test(currentScript.src) ? 'bselect.min.css?v=1.0.0' : 'bselect.css?v=1.0.0')
                : '../common/dropdown/bselect.css';
        document.head.appendChild(link);
    }

    /* ------------------------------------------------------------------ options
     * Group 1  DATA        options, url, method, params, headers, valueField, labelField, disabledField, transform, resolve
     * Group 2  LOADING     load ('all' | 'scroll' | 'button'), loadOn ('open' | 'init'), pageSize, renderChunk
     * Group 3  BEHAVIOUR   multiple, searchBox, searchMode, sortButton, sortMode, sortBy, clearButton, selectAllButton, ...
     * Group 4  APPEARANCE  theme, mode, size, shape, variant, color, icon, prefix, suffix, label, display, checkStyle, ...
     * Group 5  RULES       required, min, max, dependsOn, creatable, beforeChange
     */
    var DEFAULTS = {
        // ---- data
        options: [], // local data: [{id, name}] or ['a','b'] or function(parentValue)
        url: '', // server data (omit for local)
        method: 'POST',
        params: {}, // object or function returning an object
        headers: {},
        valueField: 'id',
        labelField: 'name',
        disabledField: 'disabled',
        itemsField: 'items',
        totalField: 'total', // response field with the total count (dotted path ok: 'meta.total')
        hasMoreField: 'hasMore',
        handler: null, // function(params, state) -> Promise of the response; use instead of url (your own request)
        pageParam: 'page', // request parameter names
        pageSizeParam: 'pageSize',
        searchParam: 'search',
        transform: null, // function(response) -> array | {items,total,hasMore}
        formatLabel: null, // function(item) -> string
        resolve: null, // function(ids) -> items | Promise (labels for saved ids)
        resolveUrl: '', // or a server URL that accepts ?ids=1,2
        value: null, // initial value (or array when multiple)

        // ---- loading:  'all' = everything at once | 'scroll' = next page while scrolling | 'button' = "Show more" button
        load: 'scroll', // default = lazy load: the next rows come while scrolling. 'all' = everything at once | 'button' = Show more button
        preload: true, // server lists: start loading when the pointer reaches the button or it gets focus, so the rows are there when it opens
        loadOn: 'open', // 'open' = first fetch when opened | 'init' = fetch immediately
        pageSize: 20, // rows per page ('scroll' / 'button'), also used for local lists
        virtual: 'auto', // long lists draw only the rows in view: true | false | 'auto' (auto = more than virtualFrom rows, no groups / sub-text / renderItem)
        virtualFrom: 150,
        renderChunk: 100, // rows drawn at once when load is 'all' (more are drawn while scrolling)

        // ---- behaviour
        multiple: false,
        search: true, // search box
        noun: '', // 'ward' -> placeholder 'Select ward', search 'Search ward'
        infoPlace: 'top', // where the count line sits: 'top' (under the search) | 'bottom' (under the list)
        infoAlign: 'right', // 'left' | 'right' | 'center'
        info: false, // result line: "1-20 of 100 - 3 selected"
        commit: false, // multiple: edits stay pending until the Apply button (Cancel / closing discards them)
        commitClose: 'cancel', // what closing the panel does with pending edits: 'cancel' | 'apply'
        recent: 0, // remember the last N picked items and list them first (0 = off)
        favorites: false, // a star on each row; starred items are listed first
        memoryKey: '', // storage name for recent/favourites (default: the element id or name). Without one they live until the page closes
        highlight: true, // mark the searched words in the rows
        cache: 30000, // ms a server answer is reused (same url + params); 0 = off, true = 30000. bselect.clearCache() / reload() refresh it
        searchMinChars: 0, // minimum characters before searching
        lazyHint: true, // 'Scroll to continue' hint (load: 'scroll')
        isOptionDisabled: null, // function(item) -> true disables a row
        serverSearch: null, // null = auto (server when paged)
        searchDelay: 300,
        clearable: true, // x button in the field
        sort: false, // sort button
        sortField: '', // defaults to labelField
        serverSort: false, // sort on the server
        arrow: true, // small arrow pointing at the field (arrow:false = flat edge)
        settings: true, // settings gear in the panel header (set false, or bselect.defaults({ settingsButton: false }), to hide it)
        persist: false, // true | 'key' - remember user settings in localStorage
        resizable: true, // drag handle to resize the panel
        popover: true, // full selected text after hovering 2s
        viewTabs: true, // multiple: All | Selected tabs under the search (All: Select all, Selected: Clear all)
        selectAll: true, // select/unselect all (multiple)
        disabled: false,
        placeholder: 'Select',
        searchPlaceholder: 'Search...',

        // ---- rules
        required: null, // null = read the native required attribute
        requiredMessage: 'This field is required',
        min: 0, // minimum selections (multiple)
        max: 0, // maximum selections (multiple), 0 = no limit
        dependsOn: null, // selector | element | instance of the parent dropdown
        dependsParam: 'parent', // request param carrying the parent value
        dependsRequired: true, // disabled until the parent has a value
        dependsPlaceholder: '', // trigger text while waiting for the parent
        dependsMessage: '',
        creatable: false, // allow creating an item from the search text
        onCreate: null, // function(text) -> item | Promise<item>
        beforeChange: null, // function(item, selecting) -> false cancels

        // ---- item content
        groupField: '', // field name to group items under headers
        guideButton: true, // a Guide button next to Find in the settings gear (opens the guide in a new tab)
        guideUrl: null, // where the guide is (default: guide.html next to the bundle)
        scrollFade: true, // rows fade out at the top / bottom edge of the list when there is more to scroll (works in light and dark)
        fadeSize: 14, // px of that fade
        subText: true, // show the small second line (switch it off without losing the field / texts)
        subTextField: '', // item field with the small second line
        subTextMap: null, // { '<value>': 'text' } per-option sub text set from outside the data (wins over the field)
        subTextPlace: 'below', // 'below' (second line) | 'beside' (same line, after the label)
        iconField: '', // item field holding an icon css class (fa fa-user) or image url
        imageField: '', // item field holding an image url, an emoji, or an icon class
        imageFor: null, // function(item) -> image url | emoji | icon class | text  (decide per option)
        imageMap: null, // { '<value>': 'https://...' | '😀' | 'fa fa-user' }  per-option pictures set from outside the data
        colorField: '', // item field holding the avatar background colour
        images: 'auto', // true | false | 'auto' - show pictures for options
        avatar: 'none', // fallback when an option has no picture: 'initials' | 'icon' | 'none'
        avatarColor: 'random', // 'random' (stable per name) | 'accent' | any css colour | function(item)
        imageShape: 'circle', // 'circle' | 'rounded' | 'square'
        imageSize: 24, // px
        renderItem: null, // function(item) -> string | Node

        // ---- appearance  (any of these can be set per dropdown, per theme, or per project)
        theme: '', // name of a registered theme: 'light' 'dark' 'auto' 'soft' 'minimal' 'pill' or your own
        mode: 'light', // 'light' | 'dark' | 'auto' (follows the operating system)
        size: 'md', // 'sm' | 'md' | 'lg'
        shape: 'rounded', // 'square' | 'rounded' | 'pill'
        radius: null, // exact corner radius in px (overrides shape)
        variant: 'outline', // 'outline' | 'filled' | 'underline' | 'ghost'
        rowStyle: 'inset', // 'inset' (rounded rows with spacing) | 'flat' (edge-to-edge rows)
        density: 'normal', // 'compact' | 'normal' | 'comfortable' (row height)
        color: '', // accent colour
        borderColor: '', // field border colour (defaults to accent)
        borderWidth: null, // field border width in px
        // ---- separate design: the select button (field) and the dropdown (panel). Flat keys style both / are the field.
        //   field: { size, shape, radius, variant, height, fontSize, background, textColor, borderColor, borderWidth, color }
        //   panel: { mode, palette, background, textColor, borderColor, shape, radius, shadow, width, listHeight, rowStyle,
        //            density, rowHeight, rowFontSize, hoverColor, selectedColor, checkStyle, color, arrow }
        field: null,
        panel: null,
        fieldBackground: '', // button fill
        fieldTextColor: '', // button text
        fieldColor: '', // button accent (focus ring, chevron, value colour)
        panelMode: '', // '' = same as the button | 'light' | 'dark' | 'auto'
        panelPalette: '', // palette for the dropdown only
        panelTextColor: '',
        panelBorderColor: '',
        panelShape: '', // '' = same as the button | 'square' | 'rounded' | 'pill'
        panelRadius: null, // px
        panelColor: '', // dropdown accent (selected rows, focus)
        rowFontSize: null, // px
        palette: '', // named background: slate midnight graphite black ocean paper mint rose (or register your own)
        background: '', // any background colour for field + panel (light/dark text is picked automatically)
        textColor: '',
        panelBackground: '', // panel only
        hoverColor: '', // row hover
        selectedColor: '', // selected row
        fontFamily: '',
        fieldHeight: null, // px, overrides the field height of the size preset
        rowHeight: null, // px, overrides the row height of the size preset
        style: null, // raw css variables { '--bselect-radius': '14px' } (alias of vars)
        settingsStyle: 'popup', // 'popup' (beside the panel) | 'drawer' (slide-over from the right edge)
        settingsTabs: null, // e.g. ['look','export'] - limit the settings popup tabs
        fontSize: null, // px, overrides the size preset
        shadow: 'soft', // 'none' | 'soft' | 'strong' | any css box-shadow
        icon: '', // leading icon in the field: css class (fa fa-user) | image url | short text/emoji
        chevron: true, // show the arrow
        clearIcon: '×', // the clear button: the default × is an icon; any other text is shown as given
        prefix: '', // fixed text before the value, e.g. 'Ward:'
        suffix: '', // fixed text after the value
        label: '', // label shown above the field
        showSelectedImage: true, // single select: show the selected item's image/icon in the field
        display: 'text', // multiple: 'text' ("A, B") | 'chips' | 'count' ("3 selected")
        maxChips: 3, // chips shown before "+N"
        checkStyle: 'box', // 'box' | 'tick' | 'none'
        width: '', // field width, e.g. '100%' '240px'
        panelWidth: null, // fixed panel width in px (default: field width, 240-350)
        listHeight: null, // list height in px
        animation: true,
        cssClass: '', // extra class on the root element
        vars: null, // raw css variables, e.g. { '--bselect-hover': '#eef' }
    };

    // Clean public name -> internal key (the old internal names keep working too).
    var NAMES = {
        searchBox: 'search',
        sortButton: 'sort',
        sortBy: 'sortField',
        settingsButton: 'settings',
        clearButton: 'clearable',
        selectAllButton: 'selectAll',
        valuePreview: 'popover',
        minSearchCharacters: 'searchMinChars',
        lazyLoadHint: 'lazyHint',
    };

    // Named themes = a bundle of appearance options. Register your own with bselect.theme(name, {...}).
    var THEMES = {
        light: {},
        dark: { mode: 'dark' },
        auto: { mode: 'auto' },
        soft: { variant: 'filled', shape: 'rounded', color: '#6366f1' },
        minimal: { variant: 'underline', shape: 'square', chevron: true },
        pill: { shape: 'pill', variant: 'outline' },
    };

    // Named backgrounds. Only bg / text / muted are needed - every surface, border and hover colour is derived from them.
    var PALETTES = {
        slate: { bg: '#1b2230', text: '#e8ecf3', muted: '#93a0b8' },
        midnight: { bg: '#0e1424', text: '#e6eaf5', muted: '#8d9ab5' },
        graphite: { bg: '#1f2023', text: '#ececee', muted: '#9a9ba3' },
        black: { bg: '#000000', text: '#f2f2f2', muted: '#8e8e93' },
        ocean: { bg: '#0f2530', text: '#e4f1f6', muted: '#86a8b6' },
        paper: { bg: '#fbf6ec', text: '#3b3326', muted: '#8a7d68' },
        mint: { bg: '#eefaf3', text: '#173a2b', muted: '#5f8a76' },
        rose: { bg: '#fff1f3', text: '#4a1d27', muted: '#a06a76' },
    };

    // field: { ... } / panel: { ... } -> the internal flat keys
    var FIELD_MAP = { size: 'size', shape: 'shape', radius: 'radius', variant: 'variant', height: 'fieldHeight', fontSize: 'fontSize', background: 'fieldBackground', textColor: 'fieldTextColor', borderColor: 'borderColor', borderWidth: 'borderWidth', color: 'fieldColor', icon: 'icon', chevron: 'chevron', width: 'width', prefix: 'prefix', suffix: 'suffix' };
    var PANEL_MAP = { mode: 'panelMode', palette: 'panelPalette', background: 'panelBackground', textColor: 'panelTextColor', borderColor: 'panelBorderColor', shape: 'panelShape', radius: 'panelRadius', shadow: 'shadow', width: 'panelWidth', listHeight: 'listHeight', rowStyle: 'rowStyle', density: 'density', rowHeight: 'rowHeight', rowFontSize: 'rowFontSize', hoverColor: 'hoverColor', selectedColor: 'selectedColor', checkStyle: 'checkStyle', color: 'panelColor', arrow: 'arrow', animation: 'animation' };

    function expandGroups(layer) {
        var out = Object.assign({}, layer || {});

        [['field', FIELD_MAP], ['panel', PANEL_MAP]].forEach(function (group) {
            var source = out[group[0]];

            if (source && typeof source === 'object') {
                Object.keys(source).forEach(function (key) {
                    if (group[1][key]) {
                        out[group[1][key]] = source[key];
                    }
                });
            }

            delete out[group[0]];
        });

        return out;
    }

    function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    /** an AngularJS $http response -> its data; anything else unchanged */
    function unwrapResponse(res) {
        return res && typeof res === 'object' && res.config && res.status !== undefined && 'data' in res ? res.data : res;
    }

    function pathGet(obj, path) {
        if (!obj || !path) {
            return undefined;
        }

        return String(path)
            .split('.')
            .reduce(function (value, key) {
                return value === undefined || value === null ? undefined : value[key];
            }, obj);
    }

    function same(a, b) {
        return String(a) === String(b);
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);

        if (className) {
            node.className = className;
        }

        if (text !== undefined) {
            node.textContent = text;
        }

        return node;
    }

    /** Does a registry entry (selector, #id, name) apply to this element? */
    function registryMatches(match, node) {
        var name;

        try {
            if (/^[#.\[]|[\s>:]/.test(match)) {
                return !!(node.matches && node.matches(match));
            }
        } catch (e) {
            return false;
        }

        name = match.replace(/^#/, '');

        return node.id === name || node.getAttribute('name') === name || node.getAttribute('data-name') === name;
    }

    /**
     * Layers, later wins:
     *   1 built-in DEFAULTS
     *   2 global           bselect.defaults({...})
     *   3 theme            theme:'dark' (named bundle)
     *   4 preset           preset:'users'
     *   5 per dropdown     bselect.defaults('#ward', {...})   (from any js file)
     *   6 own              options given to bselect(el, {...}) or data-* attributes
     * Clean names / legacy names are then mapped to the internal keys. o._sources tells which layer each key came from.
     */
    function buildOptions(user, target) {
        var preset = PRESETS[user.preset] || {};
        var perDropdown = {};
        var raw;
        var theme;
        var layers;
        var o;
        var sources = {};

        var G = expandGroups(PROJECT);
        var P = expandGroups(preset);
        var U = expandGroups(user);

        REGISTRY.forEach(function (entry) {
            if (target && registryMatches(entry.match, target)) {
                Object.assign(perDropdown, expandGroups(entry.config));
            }
        });

        raw = Object.assign({}, G, P, perDropdown, U);
        theme = expandGroups(THEMES[raw.theme] || {});
        layers = Object.assign({}, G, theme, P, perDropdown, U);
        o = Object.assign({}, DEFAULTS, layers);

        [['global', G], ['theme', theme], ['preset', P], ['dropdown', perDropdown], ['own', U]].forEach(function (layer) {
            Object.keys(layer[1]).forEach(function (key) {
                sources[key] = layer[0];
            });
        });

        Object.keys(NAMES).forEach(function (name) {
            if (layers[name] !== undefined) {
                o[NAMES[name]] = layers[name];
                sources[NAMES[name]] = sources[name];
            }
        });

        if (layers.searchMode !== undefined) {
            o.serverSearch = layers.searchMode === 'server' ? true : layers.searchMode === 'client' ? false : null;
        }

        if (layers.sortMode !== undefined) {
            o.serverSort = layers.sortMode === 'server';
        }

        // legacy: lazy:true -> load:'scroll', lazy+loadMore -> load:'button'
        if (layers.load === undefined && (layers.lazy || layers.loadMore)) {
            o.load = layers.loadMore ? 'button' : 'scroll';
        }

        o.load = { lazy: 'scroll', loadmore: 'button', click: 'button', scroll: 'scroll', button: 'button' }[String(o.load).toLowerCase()] || 'all';

        if (layers.noun) {
            if (layers.placeholder === undefined) {
                o.placeholder = 'Select ' + layers.noun;
            }

            if (layers.searchPlaceholder === undefined) {
                o.searchPlaceholder = 'Search ' + layers.noun;
            }
        }

        if (layers.theme === 'dark' || layers.theme === 'auto') {
            o.mode = layers.theme;
        }

        o._sources = sources;
        return o;
    }

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

/* Events: instance.on('change'|'open'|'close'|'load'|'error'|'create'|'limit'|'validate', fn) and opts.onChange etc. */
Object.assign(BSelect.prototype, {
    on: function (name, fn) {
        this._h = this._h || {};
        this._h[name] = (this._h[name] || []).concat(fn);
        return this;
    },

    off: function (name, fn) {
        if (this._h && this._h[name]) {
            this._h[name] = fn
                ? this._h[name].filter(function (f) {
                      return f !== fn;
                  })
                : [];
        }

        return this;
    },

    _emit: function (name, a, b) {
        var self = this;
        var handler = this.opts['on' + name.charAt(0).toUpperCase() + name.slice(1)];

        ((this._h && this._h[name]) || []).forEach(function (fn) {
            fn.call(self, a, b);
        });

        if (typeof handler === 'function') {
            handler.call(this, a, b);
        }

        // DOM event too, so plain addEventListener works: el.addEventListener('bselect:open', ...)
        this.source.dispatchEvent(new CustomEvent('bselect:' + name, { bubbles: true, detail: { value: a, extra: b, instance: this } }));
    },
});

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
                    this._flash(this._t('limitHit', { max: this.opts.max }));
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

    /** a text of the list (one place for all labels), with {name} placeholders: this._t('info', { from: 1, to: 20, total: 100 }) */
    _t: function (key, vars) {
        var text = String(TEXTS[key] !== undefined ? TEXTS[key] : key);

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
        if (this._ctl) {
            this._ctl.abort();
        }

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

/* data: local/server loading, paging, search, sort, resolve-by-id, add/remove options */

/**
 * Local option arrays are normalised ONCE per array (shared by every dropdown that uses it) and indexed by value.
 * 120 dropdowns on one 2000-item array cost one pass instead of 120 x O(n^2).
 */
/** every word of the query is somewhere in the text */
function matchesAll(text, tokens) {
    var i;

    for (i = 0; i < tokens.length; i++) {
        if (text.indexOf(tokens[i]) === -1) {
            return false;
        }
    }

    return true;
}

function sharedOptions(inst, array) {
    var o = inst.opts;
    var key = o.valueField + '|' + o.labelField;
    var cache = OPTION_CACHE ? OPTION_CACHE.get(array) : null;
    var items;
    var index;
    var i;

    if (cache && cache.key === key && cache.length === array.length && cache.first === array[0] && cache.last === array[array.length - 1]) {
        return cache;
    }

    items = new Array(array.length);
    index = new Map();

    for (i = 0; i < array.length; i++) {
        items[i] = inst._norm(array[i]);
        index.set(String(items[i][o.valueField]), items[i]);
    }

    cache = { key: key, length: array.length, first: array[0], last: array[array.length - 1], items: items, index: index, lower: null };

    if (OPTION_CACHE) {
        OPTION_CACHE.set(array, cache);
    }

    return cache;
}

Object.assign(BSelect.prototype, {
    _isServer: function () {
        return !!(this.opts.url || typeof this.opts.handler === 'function');
    },

    /** load is 'scroll' or 'button' (anything except 'all') */
    _paged: function () {
        return this.opts.load !== 'all';
    },

    _serverPaged: function () {
        return this._isServer() && this._paged();
    },

    /** rows drawn on open: one page for scroll/button, one chunk for 'all' */
    _firstLimit: function () {
        return this._paged() ? this.opts.pageSize : this.opts.renderChunk;
    },

    _hasMoreRows: function () {
        if (this.view && this.view !== 'all') {
            return false; // Selected / Recent / Favourites hold everything they have
        }

        if (this._virtual && !this._serverPaged()) {
            return false; // a virtual local list already holds every row
        }

        return this._serverPaged() ? this.hasMore : this._visible().length > (this._limit || this._firstLimit());
    },

    /** Show the next rows: next server page, or the next slice of the local list. */
    _more: function () {
        if (this.loading || this.loadingMore || !this._hasMoreRows()) {
            return;
        }

        if (this._serverPaged()) {
            this._load(true);
        } else {
            this._limit = (this._limit || this._firstLimit()) + (this._paged() ? this.opts.pageSize : this.opts.renderChunk);
            this._render();
        }
    },

    _isServerSearch: function () {
        var s = this.opts.serverSearch;

        // auto: ask the server while there are more rows than were loaded; once everything is loaded, filter in the browser
        if (this.view && this.view !== 'all') {
            return false;
        }

        return this._isServer() && (s === null ? this._paged() && !this._complete : !!s);
    },

    _norm: function (item) {
        var o = this.opts;
        var obj;

        if (isObject(item)) {
            return item;
        }

        obj = {};
        obj[o.valueField] = item;
        obj[o.labelField] = item;
        return obj;
    },

    _val: function (item) {
        return item ? item[this.opts.valueField] : undefined;
    },

    _lbl: function (item) {
        var v;

        if (!item) {
            return '';
        }

        if (this.opts.formatLabel) {
            return String(this.opts.formatLabel(item));
        }

        v = item[this.opts.labelField];
        return v === undefined || v === null ? '' : String(v);
    },

    /** value -> item, from what was loaded (pages) or the shared local options */
    _lookup: function (value) {
        var k = String(value);

        return this._kn.get(k) || (this._cache && this._cache.index.get(k)) || undefined;
    },

    _remember: function (items, shared) {
        var self = this;
        var i;

        if (!shared) {
            for (i = 0; i < items.length; i++) {
                this._kn.set(String(this._val(items[i])), items[i]);
            }
        }

        // upgrade placeholder/selected entries to the real item (gets the real label)
        if (this.selected.length) {
            this.selected = this.selected.map(function (s) {
                return self._lookup(self._val(s)) || s;
            });
        }
    },

    /** items may be the array shared with other dropdowns: copy it before adding/removing rows */
    _ownItems: function () {
        if (this._itemsShared) {
            this.items = this.items.slice();
            this._itemsShared = false;
        }
    },

    _indexIn: function (list, value) {
        for (var i = 0; i < list.length; i++) {
            if (same(this._val(list[i]), value)) {
                return i;
            }
        }

        return -1;
    },

    /** Local options: array, or function(parentValue) returning an array (use with dependsOn). */
    _localOptions: function () {
        var o = this.opts.options;

        o = typeof o === 'function' ? o(this._parentValue ? this._parentValue() : undefined) : o;

        // a name registered with bselect.data('name', array)
        return typeof o === 'string' ? DATA[o] || [] : o;
    },

    /** Replace local options (also used for first init). */
    setOptions: function (options, silent) {
        if (this._isServer()) {
            return;
        }

        if (options !== undefined && options !== null) {
            this.opts.options = options;
        }

        var list = this._localOptions() || [];

        if (Array.isArray(list)) {
            this._cache = sharedOptions(this, list);
            this.items = this._cache.items;
            this._itemsShared = true;
        } else {
            this._cache = null;
            this.items = [];
            this._itemsShared = false;
        }

        this._memo = null;
        this._remember([], true);
        this.loaded = true;
        this.hasMore = false;
        this._limit = this._firstLimit();

        if (!silent) {
            this._render();
        }
    },

    addOption: function (item) {
        var norm = this._norm(item);

        this._ownItems();
        this.items.push(norm);
        this._remember([norm]);

        if (!this._isServer() && Array.isArray(this.opts.options)) {
            this.opts.options.push(item);
        }

        this._render();
        return norm;
    },

    removeOption: function (value) {
        var i = this._indexIn(this.items, value);

        if (i >= 0) {
            this._ownItems();
            this.items.splice(i, 1);
        }

        i = this._indexIn(this.selected, value);

        if (i >= 0) {
            this.selected.splice(i, 1);
            this._changed();
        } else {
            this._render();
        }
    },

    _params: function (more) {
        var base = typeof this.opts.params === 'function' ? this.opts.params(this._state()) : this.opts.params;
        return Object.assign({}, base || {}, this._depParams ? this._depParams() : {}, more || {});
    },

    /** What the page/search/sort currently are (passed to params(state) and handler(params, state)). */
    _state: function () {
        return { page: this.page, pageSize: this.opts.pageSize, search: this.query, sortDirection: this.sortDir };
    },

    /** One page of data: your handler(params, state) when given, otherwise an HTTP call to url. */
    _fetch: function (params) {
        var o = this.opts;

        var ttl = o.cache === true || o.cache === null || o.cache === undefined ? 30000 : Number(o.cache) || 0;
        var key;
        var hit;
        var promise;

        if (typeof o.handler === 'function') {
            return Promise.resolve(o.handler(params, this._state())).then(unwrapResponse);
        }

        if (!ttl) {
            return this._request(o.url, params);
        }

        key = String(o.method).toUpperCase() + ' ' + o.url + ' ' + JSON.stringify(params, Object.keys(params).sort());
        hit = this._bust ? null : REQ_CACHE.get(key);
        this._bust = false;

        if (hit && Date.now() - hit.t < ttl) {
            return hit.promise;
        }

        promise = this._request(o.url, params);
        REQ_CACHE.set(key, { t: Date.now(), promise: promise });
        promise.catch(function () {
            REQ_CACHE.delete(key); // never keep a failed answer
        });
        return promise;
    },

    /** One HTTP call -> parsed JSON. GET => query string, otherwise form-encoded body. */
    _request: function (url, params) {
        var o = this.opts;
        var method = String(o.method).toUpperCase();
        var init = { method: method, credentials: 'same-origin', headers: Object.assign({}, o.headers) };
        var body = new URLSearchParams();

        Object.keys(params).forEach(function (key) {
            var value = params[key];

            if (value === undefined || value === null) {
                return;
            }

            [].concat(value).forEach(function (v) {
                body.append(key, v);
            });
        });

        if (method === 'GET') {
            url += (url.indexOf('?') >= 0 ? '&' : '?') + body.toString();
        } else {
            init.body = body.toString();
            init.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        }

        return fetch(url, init).then(function (response) {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            return response.json();
        });
    },

    /** Any response shape -> { items, total, hasMore } */
    _extract: function (json, page) {
        var o = this.opts;
        var result = o.transform ? o.transform(json) : json;
        var list = Array.isArray(result)
            ? result
            : (result && (pathGet(result, o.itemsField) || result.items || result.data || result.results)) || [];
        var total = isObject(result) ? pathGet(result, o.totalField) : undefined;
        var more = isObject(result) ? pathGet(result, o.hasMoreField) : undefined;
        var items = list.map(this._norm, this);
        var hasMore;

        if (more !== undefined && more !== null) {
            hasMore = !!more;
        } else if (total !== undefined && total !== null) {
            hasMore = page * o.pageSize < Number(total);
        } else {
            hasMore = this._paged() && items.length >= o.pageSize;
        }

        return { items: items, total: total, hasMore: hasMore };
    },

    _load: function (append) {
        var self = this;
        var o = this.opts;
        var id = ++this.requestId;
        var extra = {};

        if (!this._isServer()) {
            return;
        }

        if (this._waitingParent) {
            this.items = [];
            this.loaded = false;
            this._render();
            return;
        }

        if (!append) {
            this.page = 1;
            this.items = [];
            this._limit = this._firstLimit();
        } else {
            this.page++;
        }

        if (this._paged()) {
            extra[o.pageParam || 'page'] = this.page;
            extra[o.pageSizeParam || 'pageSize'] = o.pageSize;
        }

        if (o.sort && o.serverSort) {
            extra.sortField = o.sortField || o.labelField;
            extra.sortDirection = this.sortDir;
        }

        if (this._isServerSearch() && this.query) {
            extra[o.searchParam || 'search'] = this.query;
        }

        this.loading = !append;
        this.loadingMore = !!append;
        this.error = null;
        this._render();

        return this._fetch(this._params(extra))
            .then(function (json) {
                var data;

                if (id !== self.requestId) {
                    return;
                }

                data = self._extract(json, self.page);
                if (append) {
                    var seen = new Set(
                        self.items.map(function (item) {
                            return String(self._val(item));
                        })
                    );
                    var fresh = data.items.filter(function (item) {
                        return !seen.has(String(self._val(item)));
                    });

                    // nothing new = the endpoint does not page (or this was the last page): stop asking
                    if (!fresh.length) {
                        data.hasMore = false;
                    }

                    self.items = self.items.concat(fresh);
                } else {
                    self.items = data.items;
                }

                self.hasMore = data.hasMore;
                self.total = data.total;

                if (!self.query) {
                    self._complete = !data.hasMore;
                }
                self._itemsShared = false;
                self._memo = null;
                self._remember(data.items);
                self.loaded = true;
                self.loading = false;
                self.loadingMore = false;
                self._render();
                self._emit('load', self.items, data.total);
            })
            .catch(function (error) {
                if (id !== self.requestId) {
                    return;
                }

                self.loading = false;
                self.loadingMore = false;
                self.error = error;
                self._render();
                self._emit('error', error);
            });
    },

    /** Fill labels for selected ids that are not loaded (server lists). opts.resolve(ids) or opts.resolveUrl. */
    _resolveMissing: function () {
        var self = this;
        var o = this.opts;
        var ids = this.selected
            .filter(function (s) {
                return s._ph;
            })
            .map(this._val, this);
        var request;

        if (!ids.length || !(o.resolve || o.resolveUrl)) {
            return;
        }

        request = o.resolve
            ? Promise.resolve(o.resolve(ids, this._state())).then(unwrapResponse)
            : this._request(o.resolveUrl, Object.assign({}, this._params(), { ids: ids.join(',') }));

        request
            .then(function (json) {
                var items = Array.isArray(json) ? json.map(self._norm, self) : self._extract(json, 1).items;

                self._remember(items);
                self._changed(true);
            })
            .catch(function (error) {
                self._emit('error', error);
            });
    },

    reload: function () {
        this._bust = true; // ask the server again, ignore the cached answer
        this._complete = false;
        this.loaded = false;
        this.items = [];

        if (this.isOpen) {
            if (this._isServer()) {
                this._load(false);
            } else {
                this.setOptions();
            }
        }
    },

    setParams: function (params) {
        this.opts.params = params || {};
        this.reload();
    },

    _onSearch: function (text) {
        var self = this;

        this.query = String(text || '').trim();
        this._limit = this._firstLimit();

        if (this.wrap) {
            this.wrap.scrollTop = 0; // a new search starts at the top
        }

        clearTimeout(this.timer);

        if (this._isServerSearch() && this._minPending()) {
            this.items = [];
            this._render();
            return;
        }

        if (this._isServerSearch()) {
            this.timer = setTimeout(function () {
                self._load(false);
            }, this.opts.searchDelay);
            return;
        }

        this.active = -1;
        this._render();
    },

    /** the small second line of an item ('' = none): subTextMap[value] first, then the subTextField */
    _subText: function (item) {
        var o = this.opts;
        var own;

        if (o.subText === false) {
            return '';
        }

        own = o.subTextMap && o.subTextMap[this._val(item)];

        if (own !== undefined && own !== null && own !== '') {
            return String(own);
        }

        return o.subTextField && item[o.subTextField] ? String(item[o.subTextField]) : '';
    },

    _hasSub: function () {
        var o = this.opts;

        return o.subText !== false && !!(o.subTextField || (o.subTextMap && Object.keys(o.subTextMap).length));
    },

    /** text the search looks at: the label (and the small second line when there is one), lower case */
    _searchText: function (item) {
        return (this._lbl(item) + (this._subText(item) ? ' ' + this._subText(item) : '')).toLowerCase();
    },

    _searchKey: function () {
        return (this._hasSub() ? this.opts.subTextField || '*' : '') + '|' + (this._subVer || 0);
    },

    /** lower-case search text of the shared items (built once, only when someone searches) */
    _lowerLabels: function (items) {
        var out = new Array(items.length);
        var i;

        for (i = 0; i < items.length; i++) {
            out[i] = this._searchText(items[i]);
        }

        return out;
    },

    /** "john card" -> ['john', 'card']: every word must match */
    _queryTokens: function () {
        return this.query ? this.query.toLowerCase().split(/\s+/).filter(Boolean) : [];
    },

    /** the rows of the Selected / Recent / Favourites tab */
    _viewSource: function (view) {
        var self = this;
        var mem;

        if (view === 'selected') {
            return this.selected.slice();
        }

        mem = this._mem();

        return (view === 'recent' ? mem.recent : mem.fav)
            .map(function (value) {
                return self._lookup(value);
            })
            .filter(Boolean);
    },

    _visible: function () {
        var q = this.query.toLowerCase();
        var tokens = this._queryTokens();
        var self = this;
        var o = this.opts;
        var serverSort = o.serverSort && this._isServer();
        var view = this.view || 'all';
        var key = view + '|' + (view === 'selected' ? this._selVer || 0 : '') + '|' + q + '|' + (o.sort && !serverSort ? this.sortDir + (o.sortField || o.labelField) : '') + '|' + (this._minPending() ? 1 : 0) + '|' + (this._isServerSearch() ? 1 : 0) + '|' + (this._memVer || 0);
        var memo = this._memo;
        var list = view === 'all' ? this.items : this._viewSource(view);
        var cache = this._cache;
        var lower;
        var out;
        var i;
        var field;
        var dir;

        // same input as last time -> same list (it is asked for several times per render and key press)
        if (memo && memo.items === list && memo.len === list.length && memo.key === key) {
            return memo.list;
        }

        if (q && !this._isServerSearch() && !this._minPending()) {
            if (cache && cache.items === list && !o.formatLabel) {
                lower = cache.lower && cache.subKey === this._searchKey() ? cache.lower : (cache.subKey = this._searchKey(), cache.lower = this._lowerLabels(list));
                out = [];

                for (i = 0; i < list.length; i++) {
                    if (matchesAll(lower[i], tokens)) {
                        out.push(list[i]);
                    }
                }

                list = out;
            } else {
                list = list.filter(function (item) {
                    return matchesAll(self._searchText(item), tokens);
                });
            }
        }

        if (o.sort && !serverSort) {
            field = o.sortField || o.labelField;
            dir = this.sortDir === 'desc' ? -1 : 1;
            list = list.slice().sort(function (a, b) {
                var x = a[field] === undefined || a[field] === null ? '' : a[field];
                var y = b[field] === undefined || b[field] === null ? '' : b[field];

                // natural order: 'Item 2' before 'Item 10', accents and case ignored
                if (typeof x === 'string' && typeof y === 'string') {
                    return x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' }) * dir;
                }

                return x < y ? -dir : x > y ? dir : 0;
            });
        }

        list = this._withMemory(list);
        this._memo = { items: this.items, len: this.items.length, key: key, list: list };
        return list;
    },
});

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
            // the default x is drawn as an icon (always centred); a custom clearIcon text is used as given
            this.clearBtn = el('span', 'bselect-clear', o.clearIcon === '×' ? '' : o.clearIcon);

            if (o.clearIcon === '×') {
                this.clearBtn.innerHTML = ICONS.close;
            }

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
            this.gearBtn = this.sortBtn = this.searchHolder = this.searchClear = null;

            this._validateIfTouched();
            this._emit('close');
        },
});

/* Panel UI (same structure and class names as the original AngularJS bselect.html) and its render pass */
var ICONS = {
    book: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M2.5 3.2c1.8-.6 3.7-.5 5.5.6 1.8-1.1 3.7-1.2 5.5-.6v9c-1.8-.6-3.7-.5-5.5.6-1.8-1.1-3.7-1.2-5.5-.6z M8 3.8v8.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 10 10" width="1em" height="1em" aria-hidden="true"><path d="M2 2l6 6M8 2L2 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    list: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M5 3.5h9M5 8h9M5 12.5h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="2" cy="3.5" r="1" fill="currentColor"/><circle cx="2" cy="8" r="1" fill="currentColor"/><circle cx="2" cy="12.5" r="1" fill="currentColor"/></svg>',
    data: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><ellipse cx="8" cy="3.5" rx="5.5" ry="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 3.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    search: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M10 10l4.5 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    cog: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><circle cx="8" cy="8" r="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    inbox: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M2 9l2-6h8l2 6v4H2zM2 9h4l1 2h2l1-2h4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    sliders: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="5" cy="4" r="1.7" fill="currentColor"/><circle cx="11" cy="8" r="1.7" fill="currentColor"/><circle cx="6" cy="12" r="1.7" fill="currentColor"/></svg>',
    image: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><rect x="1.8" y="2.8" width="12.4" height="10.4" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="5.6" cy="6.4" r="1.3" fill="currentColor"/><path d="M2.5 12l3.4-3.4 2.4 2.4 2-2 3.2 3.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    wand: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M3 13L11 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M11.5 1.5v2M10.5 2.5h2M13.5 6v1.6M12.7 6.8h1.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    code: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5M9 3l-2 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    button: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><rect x="1.5" y="4" width="13" height="8" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10 7.2l1.5 1.6 1.5-1.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    panel: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5 6h6M5 8.5h6M5 11h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    brush: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M3 13c0-2 1.2-2.6 2.4-2.6.2-1.8 1.6-2.8 3-2.8l5-5.2.4.4-4.6 5.4c.2 1.6-1 2.8-2.6 2.8C6 11 6.2 13 3 13z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
};

function icon(name, className) {
    var node = el('span', className || '');

    node.innerHTML = ICONS[name] || '';
    return node;
}

Object.assign(BSelect.prototype, {
    _isDisabled: function (item) {
        if (!item) {
            return true;
        }

        if (typeof this.opts.isOptionDisabled === 'function') {
            return !!this.opts.isOptionDisabled(item);
        }

        return !!item[this.opts.disabledField];
    },

    /** true while the search text is shorter than searchMinChars */
    _minPending: function () {
        var n = this.opts.searchMinChars;

        return !!(this.opts.search && n > 0 && this.query.length > 0 && this.query.length < n);
    },

    _skeletonRows: function (count, className, rowClass) {
        var box = el('div', className);
        var i;
        var row;

        for (i = 0; i < count; i++) {
            row = el('div', rowClass || '');
            row.appendChild(el('span'));
            row.appendChild(el('i'));
            box.appendChild(row);
        }

        return box;
    },

    _buildPanel: function () {
        var self = this;
        var o = this.opts;
        var panel = el('div', 'bselect-panel');
        var header;
        var wrap;
        var tools;
        var box;
        var clearBtn;
        var holder;
        var pagination;

        panel.addEventListener('click', function (event) {
            event.stopPropagation();
        });
        if (o.arrow) {
            panel.appendChild(el('span', 'bselect-panel-anchor'));
        }

        if (o.search || o.sort || o.settings) {
            header = el('div', 'bselect-header');
        }

        if (o.search) {
            box = el('div', 'bselect-search');
            box.appendChild(icon('search', 'bselect-search-icon'));
            this.input = el('input');
            this.input.type = 'text';
            this.input.autocomplete = 'off';
            this.input.setAttribute('aria-label', o.searchPlaceholder);
            this.input.setAttribute('aria-controls', this.id + '-list');
            holder = el('span', 'bselect-search-placeholder');
            holder.appendChild(el('span', 'bselect-item-label', o.searchPlaceholder));
            clearBtn = el('button', 'bselect-search-clear');
            clearBtn.innerHTML = ICONS.close;
            clearBtn.type = 'button';
            clearBtn.style.display = 'none';
            clearBtn.setAttribute('aria-label', 'Clear search');
            box.appendChild(this.input);
            box.appendChild(holder);
            box.appendChild(clearBtn);
            header.appendChild(box);
            this.searchHolder = holder;
            this.searchClear = clearBtn;

            this.input.addEventListener('input', function () {
                self._onSearch(self.input.value);
                holder.style.display = self.input.value ? 'none' : '';
                clearBtn.style.display = self.input.value ? '' : 'none';
            });
            this.input.addEventListener('keydown', function (event) {
                self._key(event);
            });
            clearBtn.addEventListener('click', function (event) {
                event.preventDefault();
                self._clearSearch();
            });
        }

        if (header) {
            this._toolsBuild(header);
            panel.appendChild(header);
            panel.classList.add('bselect-panel-has-header');
        }

        if (o.info) {
            this.viewInfo = el('div', 'bselect-infobar bselect-info-' + (o.infoAlign || 'right') + (o.infoPlace === 'bottom' ? ' bselect-info-bottom' : ''));

            if (o.infoPlace !== 'bottom') {
                panel.appendChild(this.viewInfo);
            }
        }

        this.viewBar = this._buildViewBar();

        if (this.viewBar) {
            panel.appendChild(this.viewBar);
        }

        // states that replace the list: min-characters hint, skeleton, error
        this.minBox = el('div', 'bselect-empty');
        this.skeleton = this._skeletonRows(9, 'bselect-skeleton', 'bselect-skeleton-row');
        this.errorBox = el('div', 'bselect-error');
        this.errorText = el('span');
        var retry = el('button', '', this._t('retry'));
        retry.type = 'button';
        retry.addEventListener('click', function () {
            self._load(false);
        });
        this.errorBox.appendChild(this.errorText);
        this.errorBox.appendChild(retry);
        [this.minBox, this.skeleton, this.errorBox].forEach(function (node) {
            node.style.display = 'none';
            panel.appendChild(node);
        });

        wrap = el('div', 'bselect-list-wrap' + (o.load === 'scroll' ? ' bselect-list-lazy' : ''));
        this.wrap = wrap;

        this.resultsHeader = el('div', 'bselect-results-header');
        this.resultsHeader.style.display = 'none';
        wrap.appendChild(this.resultsHeader);

        this.list = el('ul', 'bselect-list');
        this.list.setAttribute('role', 'listbox');
        this.list.id = this.id + '-list';
        this.list.setAttribute('aria-multiselectable', !!o.multiple);

        // ONE click / hover handler for the whole list (rows carry data-i)
        this.list.addEventListener('click', function (event) {
            var li = event.target.closest ? event.target.closest('li[data-i]') : null;
            var item;

            if (!li || !self.list.contains(li)) {
                return;
            }

            if (li.classList.contains('bselect-create')) {
                self._create();
                return;
            }

            item = self._shown && self._shown[parseInt(li.getAttribute('data-i'), 10)];

            // the star toggles a favourite without picking the row
            if (item && event.target.closest && event.target.closest('.bselect-star')) {
                event.stopPropagation();
                self._toggleFav(item);
                return;
            }

            if (item) {
                self._choose(item);
            }
        });
        this.list.addEventListener('mouseover', function (event) {
            var t = event.target.closest ? event.target.closest('.bselect-item-text') : null;

            if (t && t !== self._mq) {
                self._mqStop();
                self._mq = t;
                self._mqStart(t);
            }
        });
        this.list.addEventListener('mouseout', function (event) {
            var t = event.target.closest ? event.target.closest('.bselect-item-text') : null;

            if (t && (!event.relatedTarget || !t.contains(event.relatedTarget))) {
                self._mqStop();
            }
        });
        wrap.appendChild(this.list);

        // pagination: scroll hint, "show more" button, end marker
        this.hint = el('div', 'bselect-lazy-hint bselect-lazy-hint-sticky');
        this.hint.setAttribute('aria-live', 'polite');
        pagination = el('span', 'bselect-pagination-row bselect-pagination-status');
        pagination.appendChild(el('span', 'bselect-pagination-cue')).appendChild(el('i'));
        var hintLabel = el('span', 'bselect-pagination-label', 'Scroll to continue ');
        hintLabel.appendChild(el('small', '', 'More results below'));
        pagination.appendChild(hintLabel);
        this.hint.appendChild(pagination);
        this.hint.style.display = 'none';
        wrap.appendChild(this.hint);

        this.moreWrap = el('div', 'bselect-load-more');
        this.moreBtn = el('button', 'bselect-pagination-row bselect-pagination-status bselect-pagination-action');
        this.moreBtn.type = 'button';
        this.moreLabel = el('span', 'bselect-pagination-label');
        this.moreBtn.appendChild(this.moreLabel);
        this.morePulse = el('span', 'bselect-pagination-pulse');
        this.morePulse.appendChild(el('i'));
        this.morePulse.appendChild(el('i'));
        this.morePulse.appendChild(el('i'));
        this.moreArrow = el('span', 'bselect-pagination-arrow');
        this.moreArrow.appendChild(el('i'));
        this.moreBtn.appendChild(this.morePulse);
        this.moreBtn.appendChild(this.moreArrow);
        this.moreBtn.addEventListener('click', function () {
            self._more();
        });
        this.moreWrap.appendChild(this.moreBtn);
        this.moreWrap.style.display = 'none';
        wrap.appendChild(this.moreWrap);

        this.endBox = el('div', 'bselect-pagination-end');
        this.endBox.setAttribute('role', 'status');
        this.endBox.appendChild(el('span', 'bselect-pagination-end-icon')).appendChild(el('i'));
        var endCopy = el('span', 'bselect-pagination-end-copy');
        endCopy.appendChild(el('strong', '', 'All results loaded'));
        endCopy.appendChild(el('small', '', 'You’ve reached the end'));
        this.endBox.appendChild(endCopy);
        this.endBox.style.display = 'none';
        wrap.appendChild(this.endBox);

        panel.appendChild(wrap);
        this.lazyHintVisible = true;

        if (this.viewInfo && o.infoPlace === 'bottom') {
            panel.appendChild(this.viewInfo);
        }

        if (this._commitOn()) {
            this.footer = this._buildFooter();
            panel.appendChild(this.footer);
        }

        wrap.addEventListener('scroll', function () {
            var top = wrap.scrollTop;
            var down = top > (wrap._last || 0);
            var up = top < (wrap._last || 0);
            var nearEnd = top + wrap.clientHeight >= wrap.scrollHeight - 60;

            wrap._last = top;

            if (self._virtual) {
                self._virtualScroll();
            }

            // old behaviour: the "scroll to continue" hint hides while scrolling down and returns when scrolling up
            if (o.load === 'scroll' && o.lazyHint !== false) {
                if (down && self.lazyHintVisible) {
                    self.lazyHintVisible = false;
                    self.hint.style.display = 'none';
                } else if (up && !self.lazyHintVisible && self._hasMoreRows()) {
                    self.lazyHintVisible = true;
                    self.hint.style.display = '';
                }
            }

            self._updateFades(); // after the strip showed / hid, so the bottom fade ends where the list really ends

            if (nearEnd && o.load !== 'button') {
                self._more();
            }
        });

        this._rowH = 0; // measured again for this panel
        this.panel = panel;
        this._applyPanelAppearance();
        this._resizeInit(panel);
    },

    /** top / bottom edge fade of the list: only on the side that has more rows to scroll to; the sticky "scroll to continue" strip stays clear */
    _updateFades: function () {
        var wrap = this.wrap;
        var o = this.opts;
        var size = o.scrollFade === false ? 0 : Math.max(0, Number(o.fadeSize === null || o.fadeSize === undefined ? 14 : o.fadeSize));
        var strip;
        var hint = 0;

        if (!wrap) {
            return;
        }

        strip = wrap.querySelector('.bselect-lazy-hint-sticky, .bselect-load-more');

        if (strip && strip.offsetParent !== null && getComputedStyle(strip).display !== 'none') {
            hint = strip.offsetHeight;
        }

        wrap.classList.toggle('bselect-fade', size > 0);
        wrap.style.setProperty('--bselect-fade-t', size && wrap.scrollTop > 1 ? size + 'px' : '0px');
        wrap.style.setProperty('--bselect-fade-b', size && wrap.scrollTop + wrap.clientHeight < wrap.scrollHeight - hint - 1 ? size + 'px' : '0px');
        wrap.style.setProperty('--bselect-fade-h', hint + 'px');
    },

    /** multiple select only: [All | Selected (n)] tabs and the action of the tab (Select all / Clear all) */
    _buildViewBar: function () {
        var self = this;
        var o = this.opts;
        var bar;
        var tabs;

        if (!o.multiple || o.viewTabs === false) {
            return null;
        }

        bar = el('div', 'bselect-viewbar');
        tabs = el('div', 'bselect-viewtabs');
        tabs.setAttribute('role', 'tablist');
        this.viewButtons = {};

        ['all', 'selected'].forEach(function (id) {
            var button = el('button', 'bselect-viewtab');

            button.type = 'button';
            button.setAttribute('role', 'tab');
            button.addEventListener('click', function () {
                if (self.view === id) {
                    return;
                }

                self.view = id;
                self.active = -1;

                if (self.wrap) {
                    self.wrap.scrollTop = 0;
                }

                self._render();
            });
            self.viewButtons[id] = button;
            tabs.appendChild(button);
        });

        this.allBtn = el('button', 'bselect-viewaction');
        this.allBtn.type = 'button';
        this.allBtn.addEventListener('click', function () {
            if (self.view === 'selected') {
                self.clear();
            } else {
                self._toggleAll();
            }
        });
        bar.appendChild(tabs);
        bar.appendChild(this.allBtn);
        return bar;
    },

    /** keeps the tabs, the tab action and the count line current (called after every render) */
    _updateViewBar: function (visible, shown) {
        var self = this;
        var view = this.view || 'all';
        var n = this.selected.length;
        var all;
        var text = '';

        if (this.viewBar) {
            this.viewButtons.all.textContent = this._t('all');
            this.viewButtons.selected.textContent = this._t('selected') + (n ? ' (' + n + ')' : '');
            Object.keys(this.viewButtons).forEach(function (id) {
                self.viewButtons[id].classList.toggle('bselect-viewtab-on', id === view);
                self.viewButtons[id].setAttribute('aria-selected', id === view);
            });

            if (view === 'selected') {
                this.allBtn.textContent = this._t('clearAll');
                this.allBtn.classList.add('bselect-viewaction-danger');
                this.allBtn.style.display = n ? '' : 'none';
            } else {
                all =
                    visible.length &&
                    visible.every(function (item) {
                        return self._isSel(item);
                    });
                this.allBtn.textContent = this._t(all ? 'unselectAll' : 'selectAll');
                this.allBtn.classList.remove('bselect-viewaction-danger');
                this.allBtn.style.display = this.opts.selectAll === false || !visible.length ? 'none' : '';
            }
        }

        if (this.viewInfo) {
            if (visible.length) {
                text = this._t(this._isServer() && this._hasMoreRows() ? 'infoMore' : 'info', {
                    from: 1,
                    to: Math.min(shown.length, visible.length),
                    total: this.total && this._isServer() && view === 'all' ? this.total : visible.length,
                });
            }

            this.viewInfo.textContent = text;
            this.viewInfo.style.display = visible.length ? '' : 'none';
        }
    },

    /** Apply / Cancel bar (commit mode) */
    _buildFooter: function () {
        var self = this;
        var bar = el('div', 'bselect-footer');
        var cancel = el('button', 'bselect-footer-cancel', this._t('cancel'));
        var apply = el('button', 'bselect-footer-apply', this._t('apply'));

        this.footerCount = el('span', 'bselect-footer-count');
        cancel.type = apply.type = 'button';
        cancel.addEventListener('click', function () {
            self._cancel();
        });
        apply.addEventListener('click', function () {
            self._apply();
        });
        bar.appendChild(this.footerCount);
        bar.appendChild(cancel);
        bar.appendChild(apply);
        return bar;
    },

    _clearSearch: function () {
        if (this.input) {
            this.input.value = '';
            this.input.focus();
        }

        if (this.searchHolder) {
            this.searchHolder.style.display = '';
            this.searchClear.style.display = 'none';
        }

        this._onSearch('');
    },

    _emptyState: function (iconName, title, hint, action) {
        var self = this;
        var li = el('li', 'bselect-empty bselect-search-empty');
        var btn;

        li.setAttribute('role', 'status');
        li.appendChild(icon(iconName, 'bselect-search-empty-icon'));
        li.appendChild(el('strong', '', title));
        li.appendChild(el('small', '', hint));

        if (action) {
            btn = el('button', '', 'Clear search');
            btn.type = 'button';
            btn.addEventListener('click', function (event) {
                event.preventDefault();
                self._clearSearch();
            });
            li.appendChild(btn);
        }

        return li;
    },

    _render: function () {
        var self = this;
        var o = this.opts;
        var n = this.selected.length;
        var visible;
        var shown;
        var frag;
        var group;
        var current;
        var li;
        var minPending;
        var showList;
        var moreBusy;
        var total;
        var paged = o.load === 'scroll' || o.load === 'button';

        this._renderTrigger();
        this.trigger.setAttribute('aria-expanded', !!this.isOpen);

        if (!this.isOpen || !this.panel) {
            return;
        }

        minPending = this._minPending();
        visible = minPending ? [] : this._visible();
        this._virtual = !minPending && this._useVirtual(visible.length);
        shown = this._virtual || this._serverPaged() || (this.view && this.view !== 'all') ? visible : visible.slice(0, this._limit || this._firstLimit());
        this._shown = shown;
        this._total = this._hasMoreRows() ? 0 : visible.length; // aria-setsize only when the whole list is known
        showList = !this.loading && !this.error && !minPending;

        this.skeleton.style.display = this.loading ? '' : 'none';
        this.errorBox.style.display = this.error && !this.loading ? '' : 'none';
        this.errorText.textContent = (this.error && this.error.message) || 'Unable to load data.';
        this.minBox.style.display = minPending && !this.loading ? '' : 'none';
        this.minBox.textContent = 'Enter at least ' + o.searchMinChars + ' characters';
        this.wrap.style.display = showList ? '' : 'none';

        if (!showList) {
            return;
        }

        frag = document.createDocumentFragment();

        if (this._virtual) {
            frag.appendChild(this._virtualFragment(visible));
        }

        (this._virtual ? [] : shown).forEach(function (item, index) {
            current = o.groupField ? item[o.groupField] : null;

            if (current && current !== group) {
                frag.appendChild(el('li', 'bselect-group', String(current)));
            }

            group = current;

            // favourites / recent / all headers
            if (self._sections) {
                if (index === 0 && self._sections.fav) {
                    frag.appendChild(el('li', 'bselect-group', 'Favourites'));
                } else if (index === self._sections.fav && self._sections.rec) {
                    frag.appendChild(el('li', 'bselect-group', 'Recent'));
                } else if (index === self._sections.fav + self._sections.rec) {
                    frag.appendChild(el('li', 'bselect-group', 'All'));
                }
            }

            frag.appendChild(self._renderItem(item, index, self._isSel(item)));
        });

        if (this._canCreate()) {
            li = el('li', 'bselect-item bselect-create' + (this.active === visible.length ? ' bselect-focused' : ''));
            li.setAttribute('data-i', visible.length);
            li.appendChild(el('span', 'bselect-control', '+'));
            li.appendChild(el('span', 'bselect-item-text', 'Create "' + this.query + '"'));
            frag.appendChild(li);
        }

        if (!shown.length && !this._canCreate()) {
            frag.appendChild(
                this.query
                    ? this._emptyState('search', 'No matches found', 'Try a different keyword', true)
                    : this.view === 'selected'
                      ? this._emptyState('inbox', this._t('emptySelected'), this._t('emptySelectedHint'))
                      : this.view === 'recent'
                        ? this._emptyState('inbox', this._t('emptyRecent'), this._t('emptyRecentHint'))
                        : this.view === 'favorites'
                          ? this._emptyState('inbox', this._t('emptyFav'), this._t('emptyFavHint'))
                    : this._waitingParent
                      ? this._emptyState('inbox', o.dependsMessage || 'Select the parent field first', '')
                      : this._emptyState('inbox', 'No data available', 'There are no records available to display.')
            );
        }

        if (this.loadingMore) {
            li = el('li', 'bselect-more-skeleton');
            li.appendChild(this._skeletonRows(3, '', ''));
            frag.appendChild(li);
        }

        this.list.innerHTML = '';
        this.list.appendChild(frag);

        if (this._virtual) {
            this._measureRows();
        }

        this._updateViewBar(visible, shown);
        this._updateFades();

        if (this.footerCount) {
            this.footerCount.textContent = this._dirty ? this._t('pending') : '';
        }

        // "Results for ..." header
        if (this.query) {
            total = this._serverPaged() && this.total !== undefined && this.total !== null ? Number(this.total) : visible.length;
            this.resultsHeader.innerHTML = '';
            var query = el('span', 'bselect-results-query');
            query.appendChild(icon('search'));
            query.appendChild(el('span', '', 'Results for'));
            query.appendChild(el('strong', '', '“' + this.query + '”'));
            var count = el('span', 'bselect-results-count');
            count.appendChild(el('strong', '', total + (this.hasMore && this.total === undefined && this._serverPaged() ? '+' : '')));
            count.appendChild(el('small', '', 'total'));
            this.resultsHeader.appendChild(query);
            this.resultsHeader.appendChild(count);
            this.resultsHeader.style.display = '';
        } else {
            this.resultsHeader.style.display = 'none';
        }


        // pagination footer
        moreBusy = this.loadingMore;
        this.hint.style.display = o.load === 'scroll' && o.lazyHint !== false && this._hasMoreRows() && this.lazyHintVisible ? '' : 'none';
        this.moreWrap.style.display = o.load === 'button' && (this._hasMoreRows() || moreBusy) ? '' : 'none';
        this.moreBtn.disabled = !!moreBusy;
        this.moreLabel.innerHTML = '';
        this.moreLabel.appendChild(document.createTextNode(moreBusy ? 'Loading results...' : 'Show next results'));
        this.moreLabel.appendChild(el('small', '', moreBusy ? 'Almost ready' : 'Continue browsing'));
        this.morePulse.style.display = moreBusy ? '' : 'none';
        this.moreArrow.style.display = moreBusy ? 'none' : '';
        // screen readers: how many results, or why there are none
        this._announce(
            this.loading
                ? 'Loading'
                : this.error
                  ? 'Unable to load data'
                  : !visible.length
                    ? 'No results'
                    : visible.length + (this._hasMoreRows() ? '+' : '') + (visible.length === 1 && !this._hasMoreRows() ? ' result' : ' results') + (this.query ? ' for ' + this.query : '')
        );
        this.endBox.style.display = paged && !this._hasMoreRows() && shown.length >= o.pageSize && !this.loading && !moreBusy ? '' : 'none';
    },
});

/* Pictures for options: custom image / emoji / icon per option, or a default avatar (initials + stable random colour) */
function hashHue(text) {
    var h = 0;
    var i;

    for (i = 0; i < text.length; i++) {
        h = (h * 31 + text.charCodeAt(i)) | 0;
    }

    return Math.abs(h) % 360;
}

function initialsOf(text) {
    var words = String(text || '').trim().split(/\s+/).filter(Boolean);

    if (!words.length) {
        return '?';
    }

    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }

    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

var IMG_RE = /^(https?:|\/|\.\/|\.\.\/|data:image|blob:)/i;
var CLASS_RE = /^[a-z][\w-]*(\s+[a-z][\w-]*)+$|^(fa|fas|far|fab|bi|icon|mdi)[-\s]/i;
var EMOJI_RE = null;

try {
    EMOJI_RE = new RegExp('\\p{Extended_Pictographic}', 'u');
} catch (e) {
    EMOJI_RE = /[←-⯿\ud83c-\ud83e][\s\S]?/;
}

Object.assign(BSelect.prototype, {
    /** images: 'auto' (default) = on when imageField / iconField / imageFor / avatar is configured */
    _showImages: function () {
        var o = this.opts;

        if (o.images === false) {
            return false;
        }

        return o.images === true || !!(o.imageField || o.iconField || o.imageFor || o.avatar !== 'none' || (o.imageMap && Object.keys(o.imageMap).length));
    },

    _avatarColor: function (item) {
        var o = this.opts;
        var mode = o.avatarColor;
        var fixed;

        if (o.colorField && item && item[o.colorField]) {
            return String(item[o.colorField]);
        }

        if (typeof mode === 'function') {
            return mode(item);
        }

        if (mode === 'accent') {
            return 'var(--bselect-color)';
        }

        if (mode && mode !== 'random') {
            return String(mode);
        }

        fixed = hashHue(this._lbl(item));
        return 'hsl(' + fixed + ' 55% 42%)';
    },

    /** What to show for an option: { kind: 'img'|'class'|'emoji'|'text'|'initials', value, color } or null */
    _pictureFor: function (item) {
        var o = this.opts;
        var custom;
        var avatar;

        if (!item || !this._showImages()) {
            return null;
        }

        custom = o.imageMap && o.imageMap[this._val(item)];

        if (custom === undefined || custom === null || custom === '') {
            custom = o.imageFor ? o.imageFor(item) : (o.imageField && item[o.imageField]) || (o.iconField && item[o.iconField]);
        }

        if (custom !== undefined && custom !== null && custom !== '') {
            custom = String(custom);

            if (IMG_RE.test(custom)) {
                return { kind: 'img', value: custom };
            }

            if (CLASS_RE.test(custom)) {
                return { kind: 'class', value: custom };
            }

            return { kind: EMOJI_RE && EMOJI_RE.test(custom) ? 'emoji' : 'text', value: custom };
        }

        avatar = o.avatar === 'none' && o.images === true ? 'initials' : o.avatar;

        if (avatar === 'initials') {
            return { kind: 'initials', value: initialsOf(this._lbl(item)), color: this._avatarColor(item) };
        }

        if (avatar === 'icon') {
            return { kind: 'person', value: '', color: this._avatarColor(item) };
        }

        return null;
    },

    /** Fill `node` with the picture of `item` (hides the node when there is none). `base` = its fixed class. */
    _fillPicture: function (node, item, base) {
        var p = this._pictureFor(item);
        var img;

        node.innerHTML = '';
        node.style.background = '';
        node.className = base + (p ? ' bselect-pic bselect-pic-' + p.kind : '');
        node.style.display = p ? '' : 'none';

        if (!p) {
            return false;
        }

        if (p.kind === 'img') {
            img = Object.assign(el('img', 'bselect-pic-img-el'), { alt: '', loading: 'lazy' });

            // a broken image falls back to initials instead of a broken-image icon
            img.addEventListener('error', function () {
                var self = this;
                var initials = { kind: 'initials', value: initialsOf(self._lbl(item)), color: self._avatarColor(item) };

                node.innerHTML = '';
                node.className = base + ' bselect-pic bselect-pic-initials';
                node.textContent = initials.value;
                node.style.background = initials.color;
            }.bind(this));
            img.src = p.value;
            node.appendChild(img);
        } else if (p.kind === 'class') {
            node.appendChild(el('i', p.value));
        } else if (p.kind === 'person') {
            node.style.background = p.color;
            node.innerHTML = '<svg viewBox="0 0 24 24" width="62%" height="62%" aria-hidden="true"><circle cx="12" cy="8.5" r="4" fill="currentColor"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="currentColor"/></svg>';
        } else {
            node.textContent = p.value;

            if (p.color) {
                node.style.background = p.color;
            }
        }

        return true;
    },
});

/* Rendering of trigger + list (groups, icons, sub-text, create row, load-more) and keyboard handling */
Object.assign(BSelect.prototype, {
    /** Fill an element with an icon/image/text: css class (fa fa-user), image url, or short text/emoji. */
    _fillIcon: function (node, value) {
        var v = String(value || '');

        node.innerHTML = '';
        node.style.display = v ? '' : 'none';

        if (!v) {
            return;
        }

        if (/^(https?:|\/|\.\/|\.\.\/|data:)/i.test(v)) {
            node.appendChild(Object.assign(el('img', 'bselect-lead-img'), { src: v, alt: '' }));
        } else if (/^[a-z][\w-]*(\s+[a-z][\w-]*)+$|^(fa|fas|far|fab|bi|icon|mdi)[-\s]/i.test(v)) {
            node.appendChild(el('i', v));
        } else {
            node.textContent = v;
        }
    },

    _renderChips: function () {
        var self = this;
        var o = this.opts;
        var shown = this.selected.slice(0, Math.max(1, o.maxChips));
        var rest = this.selected.length - shown.length;

        this.chipsEl.innerHTML = '';
        shown.forEach(function (item) {
            var chip = el('span', 'bselect-chip');
            var x = el('button', 'bselect-chip-x', '\u00d7');
            var holder = el('span');

            if (self._fillPicture(holder, item, 'bselect-chip-pic')) {
                chip.appendChild(holder);
            }

            chip.appendChild(el('span', 'bselect-chip-text', self._lbl(item)));
            x.type = 'button';
            x.setAttribute('aria-label', 'Remove ' + self._lbl(item));
            x.addEventListener('click', function (event) {
                event.stopPropagation();

                if (!self.disabled) {
                    self._choose(item);
                }
            });

            if (!self.disabled) {
                chip.appendChild(x);
            }

            self.chipsEl.appendChild(chip);
        });

        if (rest > 0) {
            this.chipsEl.appendChild(el('span', 'bselect-chip bselect-chip-more', '+' + rest));
        }
    },

    _renderTrigger: function () {
        var o = this.opts;
        var n = this.selected.length;
        var chips = o.multiple && o.display === 'chips' && n > 0;
        var lead = o.icon;
        var text;

        this.root.classList.toggle('bselect-disabled', this.disabled);
        this.root.classList.toggle('bselect-has-value', n > 0);
        this.root.classList.toggle('bselect-has-chips', chips);
        this.trigger.disabled = this.disabled;
        this.clearBtn.style.display = o.clearable && n && !this.disabled ? '' : 'none';
        this.textBox.classList.toggle('bselect-placeholder', !n);

        if (!o.multiple && n && o.showSelectedImage && this._fillPicture(this.leadEl, this.selected[0], 'bselect-lead')) {
            lead = null;
        } else {
            this.leadEl.className = 'bselect-lead';
            this.leadEl.style.background = '';
            this._fillIcon(this.leadEl, lead);
        }

        this.prefixEl.textContent = o.prefix;
        this.prefixEl.style.display = o.prefix ? '' : 'none';
        this.suffixEl.textContent = o.suffix;
        this.suffixEl.style.display = o.suffix ? '' : 'none';

        if (!n) {
            text = this._waitingParent && o.dependsPlaceholder ? o.dependsPlaceholder : o.placeholder;
        } else if (!o.multiple || n === 1) {
            text = this._lbl(this.selected[0]);
        } else if (o.display === 'count') {
            text = n + ' selected';
        } else {
            text = n <= 3 ? this.selected.map(this._lbl, this).join(', ') : n + ' selected';
        }

        this.label.textContent = text;
        this.trigger.setAttribute('aria-label', (o.label || o.placeholder || 'Select') + (n ? ': ' + text : ''));
        this.label.style.display = chips ? 'none' : '';
        this.chipsEl.style.display = chips ? '' : 'none';

        if (chips) {
            this._renderChips();
        }

        if (this.labelEl) {
            this.labelEl.classList.toggle('bselect-label-required', !!o.required);
        }
    },

    /** text with the searched words wrapped in <mark> (built with text nodes, never innerHTML) */
    _markText: function (parent, text) {
        var tokens = this.opts.highlight === false ? [] : this._queryTokens();
        var key = tokens.join(' ');
        var re;
        var parts;
        var i;
        var mark;

        if (!tokens.length) {
            parent.textContent = text;
            return;
        }

        if (this._markKey !== key) {
            this._markKey = key;
            this._markRe = new RegExp(
                '(' +
                    tokens
                        .slice()
                        .sort(function (a, b) {
                            return b.length - a.length;
                        })
                        .map(function (t) {
                            return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        })
                        .join('|') +
                    ')',
                'gi'
            );
        }

        re = this._markRe;
        parts = String(text).split(re);

        for (i = 0; i < parts.length; i++) {
            if (!parts[i]) {
                continue;
            }

            if (i % 2) {
                mark = el('mark', 'bselect-mark');
                mark.textContent = parts[i];
                parent.appendChild(mark);
            } else {
                parent.appendChild(document.createTextNode(parts[i]));
            }
        }
    },

    _renderItem: function (item, index, selected) {
        var self = this;
        var o = this.opts;
        var li = el(
            'li',
            'bselect-item' +
                (selected ? ' bselect-active' : '') +
                (index === this.active ? ' bselect-focused' : '') +
                (this._isDisabled(item) ? ' bselect-disabled-item' : '')
        );
        var control = el('span', 'bselect-control');
        var box = el('span', o.multiple ? 'bselect-checkbox' : 'bselect-radio');
        var text = el('span', 'bselect-item-text');
        var custom;
        var pic;
        var holder;
        var sub;
        var main = el('span', 'bselect-item-label');

        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', selected);
        li.setAttribute('data-i', index);
        li.id = this._optionId(index);

        if (this._total) {
            li.setAttribute('aria-setsize', this._total);
            li.setAttribute('aria-posinset', index + 1);
        }

        if (this._isDisabled(item)) {
            li.setAttribute('aria-disabled', 'true');
        }

        if (selected) {
            box.classList.add('bselect-checked');
        }

        box.appendChild(o.multiple ? document.createTextNode(selected ? '✓' : '') : el('span'));
        control.appendChild(box);
        li.appendChild(control);

        holder = el('span');

        if (this._fillPicture(holder, item, 'bselect-item-pic')) {
            li.appendChild(holder);
        }

        custom = o.renderItem ? o.renderItem(item) : null;

        if (custom && custom.nodeType) {
            main.appendChild(custom);
        } else {
            this._markText(main, custom !== null && custom !== undefined ? String(custom) : this._lbl(item));
        }

        text.appendChild(main);

        if (this._subText(item)) {
            sub = el('small', 'bselect-item-sub');
            this._markText(sub, this._subText(item));
            text.appendChild(sub);

            if (o.subTextPlace === 'beside') {
                text.classList.add('bselect-sub-beside');
            }
        }

        li.appendChild(text);

        if (selected && o.checkStyle !== 'box') {
            li.appendChild(el('span', 'bselect-selected-mark', '✓'));
        }

        if (o.favorites) {
            var star = el('button', 'bselect-star' + (this._isFav(item) ? ' bselect-star-on' : ''), this._isFav(item) ? '\u2605' : '\u2606');

            star.type = 'button';
            star.tabIndex = -1;
            star.setAttribute('aria-label', (this._isFav(item) ? 'Remove from favourites: ' : 'Add to favourites: ') + this._lbl(item));
            li.appendChild(star);
        }

        return li;
    },

    /** Selection changed while open: update the trigger, the changed rows and the counters only. */
    _renderLight: function () {
        var self = this;
        var o = this.opts;
        var set = new Set(
            this.selected.map(function (item) {
                return String(self._val(item));
            })
        );
        var visible;

        this._renderTrigger();

        [].forEach.call(this.list.children, function (li) {
            var index = li.getAttribute('data-i');
            var item;
            var on;
            var box;
            var mark;

            if (index === null || li.classList.contains('bselect-create')) {
                return;
            }

            item = self._shown[parseInt(index, 10)];

            if (!item) {
                return;
            }

            on = set.has(String(self._val(item)));
            li.classList.toggle('bselect-active', on);
            li.setAttribute('aria-selected', on);
            box = li.querySelector('.bselect-checkbox, .bselect-radio');

            if (box) {
                box.classList.toggle('bselect-checked', on);

                if (o.multiple) {
                    box.textContent = on ? '\u2713' : '';
                }
            }

            if (o.checkStyle !== 'box') {
                mark = li.querySelector('.bselect-selected-mark');

                if (on && !mark) {
                    li.appendChild(el('span', 'bselect-selected-mark', '\u2713'));
                } else if (!on && mark) {
                    li.removeChild(mark);
                }
            }
        });

        visible = this._visible();
        this._updateViewBar(visible, this._shown);

        if (this.footerCount) {
            this.footerCount.textContent = this._dirty ? this._t('pending') : '';
        }

    },

    // ----------------------------------------------------------------- virtual scrolling
    /** true when the list is long and every row has the same height */
    _useVirtual: function (count) {
        var o = this.opts;

        if (o.virtual === false) {
            return false;
        }

        if (o.virtual === true) {
            return count > 0;
        }

        return count > (o.virtualFrom || 150) && !o.groupField && !this._hasSub() && !o.renderItem && !o.creatable && !this._sections;
    },

    _guessRowH: function () {
        var h = parseFloat(getComputedStyle(this.root).getPropertyValue('--bselect-item-height')) || 31;

        return h + (this.root.classList.contains('bselect-rows-inset') ? 1 : 0);
    },

    /** y of the first row, inside the scrolling wrapper */
    _rowsTop: function () {
        var list = this.list;

        return list.getBoundingClientRect().top - this.wrap.getBoundingClientRect().top + this.wrap.scrollTop + (parseFloat(getComputedStyle(list).paddingTop) || 0);
    },

    /** spacer - rows in view (+ a few above and below) - spacer */
    _virtualFragment: function (visible) {
        var rowH = this._rowH || this._guessRowH();
        var viewH = this.wrap.clientHeight || 280;
        var st = Math.max(0, this.wrap.scrollTop - this._rowsTop());
        var over = 8;
        var start = Math.max(0, Math.floor(st / rowH) - over);
        var end = Math.min(visible.length, Math.ceil((st + viewH) / rowH) + over);
        var frag = document.createDocumentFragment();
        var spacer;
        var i;

        function gap(height) {
            var li = el('li', 'bselect-vspacer');

            li.setAttribute('aria-hidden', 'true');
            li.style.height = Math.max(0, height) + 'px';
            return li;
        }

        frag.appendChild(gap(start * rowH));

        for (i = start; i < end; i++) {
            frag.appendChild(this._renderItem(visible[i], i, this._isSel(visible[i])));
        }

        spacer = gap((visible.length - end) * rowH);
        frag.appendChild(spacer);
        this._vwin = [start, end];
        return frag;
    },

    /** the real row pitch (height + spacing) - rows are drawn once with a guess, then corrected */
    _measureRows: function () {
        var rows = this.list.querySelectorAll('.bselect-item');
        var pitch;

        if (this._rowH || rows.length < 2) {
            return;
        }

        pitch = rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top;

        if (pitch > 0) {
            this._rowH = pitch;

            if (Math.abs(pitch - this._guessRowH()) > 0.4) {
                this._render(); // draw again with the exact size
            }
        }
    },

    _virtualScroll: function () {
        var self = this;

        if (this._vraf) {
            return;
        }

        this._vraf = requestAnimationFrame(function () {
            var rowH;
            var st;
            var first;
            var last;
            var win;

            self._vraf = null;

            if (!self._virtual || !self.list || !self._shown) {
                return;
            }

            rowH = self._rowH || self._guessRowH();
            st = Math.max(0, self.wrap.scrollTop - self._rowsTop());
            first = Math.floor(st / rowH);
            last = Math.ceil((st + self.wrap.clientHeight) / rowH);
            win = self._vwin || [0, 0];

            // redraw only when the view gets close to the edge of what is drawn
            if ((win[0] > 0 && first - win[0] < 3) || (win[1] < self._shown.length && win[1] - last < 3)) {
                self._render();
            }
        });
    },

    /** bring row `index` into view (keyboard, type-ahead) */
    _scrollToIndex: function (index) {
        var rowH = this._rowH || this._guessRowH();
        var top = this._rowsTop() + index * rowH;
        var bottom = top + rowH;
        var stickyH = 0;
        var wrap = this.wrap;

        if (top - stickyH < wrap.scrollTop) {
            wrap.scrollTop = top - stickyH;
        } else if (bottom > wrap.scrollTop + wrap.clientHeight) {
            wrap.scrollTop = bottom - wrap.clientHeight;
        }
    },

    /** say something to screen readers (debounced, only when it changed) */
    _announce: function (text) {
        var self = this;

        if (!this._sr || text === this._lastSaid) {
            return;
        }

        this._lastSaid = text;
        clearTimeout(this._srTimer);
        this._srTimer = setTimeout(function () {
            if (self._sr) {
                self._sr.textContent = text;
            }
        }, 220);
    },

    /** Next enabled index in direction, or -1. Index `visible.length` is the "create" row when shown. */
    _step: function (from, dir, visible) {
        var max = visible.length - 1 + (this._canCreate() ? 1 : 0);
        var i = from + dir;

        while (i >= 0 && i <= max) {
            if (i >= visible.length || !this._isDisabled(visible[i])) {
                return i;
            }

            i += dir;
        }

        return -1;
    },

    _setActive: function (index) {
        var node;

        if (index < 0) {
            return;
        }

        this.active = index;

        if (this._virtual && this.wrap) {
            this._scrollToIndex(index);
        }

        if (!this._virtual && this._shown && index >= this._shown.length && !this._serverPaged()) {
            this._limit = Math.max(this._limit || 0, index + 1);
        }

        this._render();
        this._ariaActive();
        node = this.list.querySelector('[data-i="' + index + '"]');

        if (node && node.scrollIntoView) {
            node.scrollIntoView({ block: 'nearest' });
        }
    },

    _typeahead: function (char, visible) {
        var self = this;
        var i;

        this._typed = (this._typed || '') + char.toLowerCase();
        clearTimeout(this._typedTimer);
        this._typedTimer = setTimeout(function () {
            self._typed = '';
        }, 700);

        for (i = 0; i < visible.length; i++) {
            if (!this._isDisabled(visible[i]) && this._lbl(visible[i]).toLowerCase().indexOf(this._typed) === 0) {
                this._setActive(i);
                return;
            }
        }
    },

    _key: function (event) {
        var visible = this._visible();
        var key = event.key;
        var next;

        if (key === 'Escape') {
            if (this.isOpen) {
                event.stopPropagation();
                this.close();
                this.trigger.focus();
            }
        } else if (key === 'Tab') {
            this.close();
        } else if (key === 'ArrowDown' || key === 'ArrowUp') {
            event.preventDefault();

            if (!this.isOpen) {
                return this.open();
            }

            next = this._step(this.active, key === 'ArrowDown' ? 1 : -1, visible);

            this._setActive(next);
        } else if (key === 'PageDown' || key === 'PageUp') {
            if (this.isOpen) {
                event.preventDefault();
                this._page(key === 'PageDown' ? 1 : -1);
            }
        } else if (key === 'Home' || key === 'End') {
            if (this.isOpen && event.target !== this.input) {
                event.preventDefault();
                next = key === 'Home' ? this._step(-1, 1, visible) : this._step(visible.length + (this._canCreate() ? 1 : 0), -1, visible);
                this._setActive(next);
            }
        } else if (key === 'Enter') {
            event.preventDefault();

            if (!this.isOpen) {
                this.open();
            } else if (this.active >= 0 && this.active < visible.length) {
                this._choose(visible[this.active]);
            } else if (this.active === visible.length && this._canCreate()) {
                this._create();
            }
        } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.target !== this.input) {
            if (!this.isOpen && key !== ' ') {
                this.open();
            }

            if (this.isOpen && !(key === ' ' && !this._typed)) {
                this._typeahead(key, visible);
            }
        }
    },
});

/* Click ripple, aria wiring, PageUp/PageDown, animated hand-over between two dropdowns (same behaviour as the original) */
Object.assign(BSelect.prototype, {
    _rippleInit: function () {
        var root = this.root;

        root.addEventListener('pointerdown', function (event) {
            var node = event.target;
            var rect;
            var size;
            var ripple;

            while (node && node !== root) {
                if (node.matches && node.matches('button:not(:disabled), .bselect-item:not(.bselect-selected-item):not(.bselect-disabled-item), .bselect-clear, .bselect-settings-body label')) {
                    break;
                }

                node = node.parentNode;
            }

            if (!node || node === root) {
                return;
            }

            rect = node.getBoundingClientRect();
            size = Math.max(rect.width, rect.height) * 1.6;
            ripple = el('span', 'bselect-click-ripple');
            node.classList.add('bselect-ripple-host');

            if (getComputedStyle(node).position === 'static') {
                node.classList.add('bselect-ripple-host-positioned');
            }

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = event.clientX - rect.left - size / 2 + 'px';
            ripple.style.top = event.clientY - rect.top - size / 2 + 'px';
            node.appendChild(ripple);
            setTimeout(function () {
                if (ripple.parentNode) {
                    ripple.parentNode.removeChild(ripple);
                }
            }, 620);
        });
    },

    _optionId: function (index) {
        return this.id + '-opt-' + index;
    },

    _ariaActive: function () {
        var id = this.isOpen && this.active >= 0 ? this._optionId(this.active) : '';

        [this.trigger, this.input].forEach(function (node) {
            if (!node) {
                return;
            }

            if (id) {
                node.setAttribute('aria-activedescendant', id);
            } else {
                node.removeAttribute('aria-activedescendant');
            }
        });
    },

    /** PageUp / PageDown: move the active row by one visible page. */
    _page: function (dir) {
        var visible = this._visible();
        var first = this.list.querySelector('.bselect-item');
        var rowHeight = Math.max(1, first ? first.offsetHeight : 31);
        var length = Math.max(1, Math.floor(this.wrap.clientHeight / rowHeight));
        var start = this.active < 0 || this.active >= visible.length ? (dir > 0 ? -1 : visible.length) : this.active;
        var target = Math.max(0, Math.min(visible.length - 1, start + dir * length));
        var index = target;

        while (index >= 0 && index < visible.length && this._isDisabled(visible[index])) {
            index += dir;
        }

        if (index < 0 || index >= visible.length) {
            index = this._step(target, -dir, visible);
        }

        this._setActive(index);

        if (dir > 0 && this.opts.load === 'scroll' && index >= visible.length - 1) {
            this._more();
        }
    },

    /** Slide the panel in from the previously open dropdown (css variables are read by bselect.css). */
    _switchFrom: function (prev) {
        var self = this;
        var cur = this.root.getBoundingClientRect();
        var style = this.root.style;
        var x = prev && window.innerWidth > 576 ? Math.max(-180, Math.min(180, Math.round(prev.left - cur.left))) : 0;
        var y = prev ? Math.max(-120, Math.min(120, Math.round(prev.top - cur.top))) : 0;
        var distance = Math.sqrt(x * x + y * y);

        if (!prev || this.opts.animation === false) {
            return;
        }

        style.setProperty('--bselect-switch-x', x + 'px');
        style.setProperty('--bselect-switch-y', y + 'px');
        style.setProperty('--bselect-switch-nudge-x', x === 0 ? '0px' : (x > 0 ? -4 : 4) + 'px');
        style.setProperty('--bselect-switch-nudge-y', y === 0 ? '0px' : (y > 0 ? -3 : 3) + 'px');
        style.setProperty('--bselect-switch-duration', Math.round(380 + Math.min(140, distance * 0.5)) + 'ms');
        this.root.classList.add('bselect-switching');
        clearTimeout(this._switchTimer);
        this._switchTimer = setTimeout(function () {
            self.root.classList.remove('bselect-switching');
        }, 700);
    },
});

/* Panel auto-position (up/down, start/end inside card or viewport) and drag-to-resize */
Object.assign(BSelect.prototype, {
    _bounds: function () {
        var node = this.root.parentElement;
        var bounds = { left: 8, right: Math.max(8, window.innerWidth - 8) };
        var rect;

        while (node && node !== document.body) {
            if (node.matches && node.matches('[data-bselect-boundary], .bselect-boundary, .card, .panel-wrap')) {
                rect = node.getBoundingClientRect();
                bounds.left = Math.max(bounds.left, rect.left + 7);
                bounds.right = Math.min(bounds.right, rect.right - 7);
                break;
            }

            node = node.parentElement;
        }

        if (bounds.right <= bounds.left) {
            bounds.left = 8;
            bounds.right = Math.max(8, window.innerWidth - 8);
        }

        bounds.width = bounds.right - bounds.left;
        return bounds;
    },

    _position: function () {
        var rect = this.root.getBoundingClientRect();
        var panel = this.panel;
        var height = Math.min(430, window.innerHeight * 0.65);
        var below = window.innerHeight - rect.bottom;
        var bounds;
        var min;
        var width;
        var toEnd;
        var toStart;
        var left;

        if (!panel) {
            return;
        }

        this.root.classList.toggle('bselect-up', below < height && rect.top > below);

        if (window.innerWidth <= 576) {
            panel.style.width = panel.style.minWidth = panel.style.left = panel.style.right = '';
            return;
        }

        bounds = this._bounds();
        min = Math.min(240, bounds.width);
        width = Math.min(350, bounds.width, Math.max(min, this.panelWidth || rect.width));
        toEnd = bounds.right - rect.left;
        toStart = rect.right - bounds.left;
        this.align = width <= toEnd ? 'start' : width <= toStart ? 'end' : toEnd >= toStart ? 'start' : 'end';
        left = this.align === 'end' ? rect.right - width : rect.left;
        left = Math.max(bounds.left, Math.min(left, bounds.right - width));

        panel.style.width = Math.round(width) + 'px';
        panel.style.minWidth = Math.round(min) + 'px';
        panel.style.left = Math.round(left - rect.left) + 'px';
        panel.style.right = 'auto';
        this.root.classList.toggle('bselect-end', this.align === 'end');

        if (this.handle) {
            this.handle.className = 'bselect-resize-handle bselect-resize-handle-' + (this.align === 'end' ? 'left' : 'right');
        }
    },

    _resizeInit: function (panel) {
        var self = this;

        if (this.opts.resizable === false) {
            return;
        }

        this.handle = el('span', 'bselect-resize-handle bselect-resize-handle-right');
        panel.appendChild(this.handle);

        this.handle.addEventListener('mousedown', function (event) {
            var rect;
            var bounds;
            var trigger;
            var dir;
            var max;
            var min;
            var startX = event.clientX;
            var startWidth;
            var anchorRight;

            if (window.innerWidth <= 576) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            rect = self.panel.getBoundingClientRect();
            bounds = self._bounds();
            trigger = self.root.getBoundingClientRect();
            dir = self.align === 'end' ? -1 : 1;
            startWidth = rect.width;
            anchorRight = rect.right;
            max = Math.min(350, dir === -1 ? rect.right - bounds.left : bounds.right - rect.left);
            min = Math.min(240, max);
            self.root.classList.add('bselect-resizing');

            function move(e) {
                var width = Math.max(min, Math.min(max, startWidth + (e.clientX - startX) * dir));

                self.panelWidth = Math.round(width);
                self.panel.style.width = self.panelWidth + 'px';

                if (dir === -1) {
                    self.panel.style.left = Math.round(anchorRight - width - trigger.left) + 'px';
                }
            }

            function up() {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
                self.root.classList.remove('bselect-resizing');
                self._suppressUntil = Date.now() + 300;
            }

            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
        });
    },

    _bindWindow: function (on) {
        var self = this;

        if (on && !this._onResize) {
            this._onResize = function () {
                if (self.isOpen) {
                    self._position();
                }
            };
            window.addEventListener('resize', this._onResize);
        } else if (!on && this._onResize) {
            window.removeEventListener('resize', this._onResize);
            this._onResize = null;
        }
    },
});

/* Sort button, settings gear + popup, optional saved preferences (localStorage) */
var PREF_KEYS = ['search', 'sort', 'multiple', 'load', 'pageSize', 'clearable', 'color', 'borderColor', 'borderWidth', 'mode', 'size', 'shape', 'variant', 'display', 'popover', 'lazyHint', 'density', 'palette', 'background', 'images', 'avatar', 'avatarColor', 'imageShape', 'imageSize', 'radius', 'fontSize', 'rowHeight', 'panelWidth', 'listHeight', 'textColor', 'hoverColor', 'selectedColor', 'panelBackground', 'fontFamily', 'shadow', 'style', 'imageMap', 'rowStyle', 'fieldHeight', 'maxChips', 'fieldBackground', 'fieldTextColor', 'fieldColor', 'panelMode', 'panelPalette', 'panelTextColor', 'panelBorderColor', 'panelShape', 'panelRadius', 'panelColor', 'rowFontSize', 'arrow', 'chevron', 'info', 'commit', 'subText', 'subTextField', 'subTextMap', 'subTextPlace', 'scrollFade', 'fadeSize', 'viewTabs', 'selectAll', 'commitClose', 'infoPlace', 'infoAlign', 'imageField', 'serverSearch', 'searchMinChars', 'recent', 'favorites', 'highlight', 'preload', 'cache', 'virtual', 'virtualFrom', 'groupField'];

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
        } else if (key === 'images') {
            // images on without a default picture shows initials; the previous choice comes back when images go off and on again
            if (!value) {
                this._avatarBefore = o.avatar;
            } else if (this._avatarBefore) {
                o.avatar = this._avatarBefore;
                this._avatarBefore = null;
            } else if (o.avatar === 'none') {
                o.avatar = 'initials';
            }
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
        var guide = el('a', 'bselect-settings-guide');
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
            head.appendChild(guide);
            head.appendChild(find);
            head.appendChild(closeBtn);
        }

        // Guide: opens the full feature guide in a new tab, at the section of the open tab
        guide.href = o.guideUrl || GUIDE_URL;
        guide.target = '_blank';
        guide.rel = 'noopener';
        guide.title = 'Open the guide in a new tab';
        guide.setAttribute('aria-label', 'Open the guide in a new tab');
        guide.appendChild(icon('book'));
        guide.appendChild(el('span', '', 'Guide'));
        guide.style.display = o.guideButton === false ? 'none' : '';

        if (drawer) {
            guide.className += ' bselect-settings-guide-drawer';
            head.insertBefore(guide, closeBtn);
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
                guide.href = (o.guideUrl || GUIDE_URL) + '#tab-' + (id === 'custom' || id === 'export' ? 'advanced' : id);

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

/* Export: turn the current settings into text you can paste into another js file (global, per dropdown), JSON or data-attributes */
function jsLiteral(value, indent) {
    var pad = indent || '';
    var keys;

    if (typeof value === 'string') {
        return "'" + value.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
        keys = Object.keys(value);

        if (keys.length > 1) {
            return (
                '{\n' +
                keys
                    .map(function (key) {
                        return pad + '    ' + (/^[a-z_$][\w$]*$/i.test(key) ? key : "'" + key + "'") + ': ' + jsLiteral(value[key], pad + '    ') + ',';
                    })
                    .join('\n') +
                '\n' +
                pad +
                '}'
            );
        }
    }

    if (value && typeof value === 'object') {
        return JSON.stringify(value).replace(/"([\w-]+)":/g, function (m, key) {
            return /^[a-z_$][\w$]*$/i.test(key) ? key + ':' : "'" + key + "':";
        }).replace(/"/g, "'");
    }

    return String(value);
}

function kebab(name) {
    return name.replace(/[A-Z]/g, function (c) {
        return '-' + c.toLowerCase();
    });
}

/** flat settings -> { ...shared, field: {...}, panel: {...} } using the same short names as the config */
function nestSettings(data) {
    var fieldOf = {};
    var panelOf = {};
    var out = {};
    var field = {};
    var panel = {};

    Object.keys(FIELD_MAP).forEach(function (short) {
        fieldOf[FIELD_MAP[short]] = short;
    });
    Object.keys(PANEL_MAP).forEach(function (short) {
        panelOf[PANEL_MAP[short]] = short;
    });

    Object.keys(data).forEach(function (key) {
        if (fieldOf[key]) {
            field[fieldOf[key]] = data[key];
        } else if (panelOf[key]) {
            panel[panelOf[key]] = data[key];
        } else {
            out[key] = data[key];
        }
    });

    if (Object.keys(field).length) {
        out.field = field;
    }

    if (Object.keys(panel).length) {
        out.panel = panel;
    }

    return out;
}

Object.assign(BSelect.prototype, {
    /** Settings object: scope 'changed' = differs from what the dropdown started with, 'all' = every non-empty setting */
    _exportData: function (scope) {
        var out = {};
        var self = this;

        PREF_KEYS.forEach(function (key) {
            var value = self.opts[key];
            var empty = value === '' || value === null || value === undefined || (isObject(value) && !Object.keys(value).length);

            if (scope === 'changed') {
                if (JSON.stringify(value) === JSON.stringify(self._base ? self._base[key] : undefined)) {
                    return;
                }

                if (empty) {
                    return;
                }
            } else if (empty) {
                return;
            }

            out[key] = value;
        });

        return out;
    },

    _exportText: function (format, scope) {
        var data = this._exportData(scope);
        var keys = Object.keys(data);
        var body;
        var id;

        if (!keys.length) {
            return scope === 'changed' ? '// Nothing changed yet. Change a setting, or choose "All settings".' : '// No settings.';
        }

        if (format === 'json') {
            return JSON.stringify(nestSettings(data), null, 2);
        }

        if (format === 'html') {
            return keys
                .map(function (key) {
                    var value = data[key];

                    if (value === true) {
                        return 'data-' + kebab(key);
                    }

                    return 'data-' + kebab(key) + '=' + (typeof value === 'object' ? "'" + JSON.stringify(value) + "'" : '"' + String(value).replace(/"/g, '&quot;') + '"');
                })
                .join('\n');
        }

        data = nestSettings(data);
        body =
            '{\n' +
            Object.keys(data)
                .map(function (key) {
                    return '    ' + key + ': ' + jsLiteral(data[key], '    ') + ',';
                })
                .join('\n') +
            '\n}';

        if (format === 'dropdown') {
            id = this.source.id ? '#' + this.source.id : this.source.getAttribute('data-name') || this.source.getAttribute('name') || '#your-dropdown-id';
            return "// per dropdown (any js file, before the page builds it)\nbselect.defaults('" + id + "', " + body + ');';
        }

        return '// global: every dropdown\nbselect.defaults(' + body + ');';
    },

    /** Where each setting comes from: default, global, theme, preset, dropdown (per dropdown defaults) or own. */
    explain: function () {
        var o = this.opts;
        var out = {};

        Object.keys(o._sources || {}).forEach(function (key) {
            out[key] = { value: o[key], from: o._sources[key] };
        });
        return out;
    },

    getConfig: function () {
        var copy = Object.assign({}, this.opts);

        delete copy._sources;
        return copy;
    },
});

/* Hover popover with the full selected values (after 2s) and marquee scrolling for overflowing text */
Object.assign(BSelect.prototype, {
    /** Marquee on hover/focus for any container holding a .bselect-item-label. */
    _marquee: function (node) {
        var label = node.querySelector('.bselect-item-label');

        function start() {
            var distance = Math.ceil(label.scrollWidth - (label.parentElement || node).clientWidth);

            if (distance > 2) {
                node.classList.add('bselect-overflow-active');
                distance = Math.ceil(label.scrollWidth - (label.parentElement || node).clientWidth);
                node.style.setProperty('--bselect-marquee-distance', '-' + distance + 'px');
                node.style.setProperty('--bselect-marquee-duration', Math.max(2.5, Math.min(9, distance / 28)) + 's');
            }
        }

        function stop() {
            node.classList.remove('bselect-overflow-active');
        }

        node.addEventListener('mouseenter', start);
        node.addEventListener('mouseleave', stop);
    },

    _mqStart: function (node) {
        var label = node.querySelector('.bselect-item-label');
        var distance;

        if (!label) {
            return;
        }

        distance = Math.ceil(label.scrollWidth - (label.parentElement || node).clientWidth);

        if (distance > 2) {
            node.classList.add('bselect-overflow-active');
            node.style.setProperty('--bselect-marquee-distance', '-' + distance + 'px');
            node.style.setProperty('--bselect-marquee-duration', Math.max(2.5, Math.min(9, distance / 28)) + 's');
        }
    },

    _mqStop: function () {
        if (this._mq) {
            this._mq.classList.remove('bselect-overflow-active');
            this._mq = null;
        }
    },

    _popoverInit: function () {
        var self = this;

        function cancel() {
            clearTimeout(self._popTimer);
            self._popTimer = null;
        }

        this._marquee(this.textBox);
        this.textBox.addEventListener('mouseenter', function () {
            cancel();

            if (self.opts.popover === false || self.isOpen || !self.selected.length) {
                return;
            }

            self._popTimer = setTimeout(function () {
                self._popoverShow();
            }, 2000);
        });
        this.textBox.addEventListener('mouseleave', function () {
            cancel();
            self._popTimer = setTimeout(function () {
                self._popoverHide();
            }, 140);
        });
    },

    _popoverShow: function () {
        var self = this;
        var pop;
        var header;
        var count;
        var list;
        var rect;
        var box;
        var left;
        var top;

        this._popoverHide();

        if (this.isOpen || !this.selected.length) {
            return;
        }

        pop = el('div', 'bselect-value-popover');
        pop.setAttribute('role', 'tooltip');

        if (this.root.classList.contains('bselect-dark')) {
            pop.classList.add('bselect-pop-dark');
        }

        header = el('div', 'bselect-value-popover-header');
        header.appendChild(el('span', 'bselect-value-popover-caption', 'Selected values'));
        count = el('span', 'bselect-value-popover-count', String(this.selected.length));
        header.appendChild(count);
        pop.appendChild(header);
        list = el('div', 'bselect-value-popover-list');
        this.selected.forEach(function (item) {
            var row = el('div', 'bselect-value-popover-item');
            row.appendChild(el('span', '', self._lbl(item)));
            list.appendChild(row);
        });
        pop.appendChild(list);
        pop.style.setProperty('--bselect-popover-color', getComputedStyle(this.root).getPropertyValue('--bselect-color').trim() || '#47a0ec');
        document.body.appendChild(pop);
        pop.addEventListener('mouseenter', function () {
            clearTimeout(self._popTimer);
        });
        pop.addEventListener('mouseleave', function () {
            self._popoverHide();
        });

        rect = this.root.getBoundingClientRect();
        box = pop.getBoundingClientRect();
        left = Math.max(8, Math.min(rect.left, window.innerWidth - box.width - 8));
        top = rect.bottom + 7;

        if (top + box.height > window.innerHeight - 8) {
            top = Math.max(8, rect.top - box.height - 7);
            pop.classList.add('bselect-value-popover-up');
        }

        pop.style.left = left + 'px';
        pop.style.top = top + 'px';
        this._pop = pop;
    },

    _popoverHide: function () {
        clearTimeout(this._popTimer);

        if (this._pop && this._pop.parentNode) {
            this._pop.parentNode.removeChild(this._pop);
        }

        this._pop = null;
    },
});

/* Recent picks and favourites: listed first when there is no search. Remembered in localStorage per memoryKey. */
Object.assign(BSelect.prototype, {
    _memKey: function () {
        var o = this.opts;
        var name = o.memoryKey || this.source.id || this.source.getAttribute('name') || this.source.getAttribute('data-name');

        return name ? 'bselect:mem:' + name : null;
    },

    _mem: function () {
        var key;
        var saved;

        if (this._memory) {
            return this._memory;
        }

        key = this._memKey();

        try {
            saved = key ? JSON.parse(localStorage.getItem(key) || 'null') : null;
        } catch (e) {
            saved = null;
        }

        this._memory = { recent: (saved && saved.recent) || [], fav: (saved && saved.fav) || [] };
        return this._memory;
    },

    _memSave: function () {
        var key = this._memKey();

        this._memVer = (this._memVer || 0) + 1;

        try {
            if (key) {
                localStorage.setItem(key, JSON.stringify(this._memory));
            }
        } catch (e) {
            /* storage blocked - keep it in memory */
        }
    },

    /** called when an item is picked */
    _memPicked: function (item) {
        var o = this.opts;
        var value = String(this._val(item));
        var mem;

        if (!o.recent) {
            return;
        }

        mem = this._mem();
        mem.recent = [value].concat(
            mem.recent.filter(function (v) {
                return v !== value;
            })
        ).slice(0, o.recent);
        this._memSave();
    },

    _isFav: function (item) {
        return this._mem().fav.indexOf(String(this._val(item))) >= 0;
    },

    _toggleFav: function (item) {
        var mem = this._mem();
        var value = String(this._val(item));
        var at = mem.fav.indexOf(value);

        if (at >= 0) {
            mem.fav.splice(at, 1);
        } else {
            mem.fav.push(value);
        }

        this._memSave();
        this._announce(at >= 0 ? this._lbl(item) + ' removed from favourites' : this._lbl(item) + ' added to favourites');
        this._render();
    },

    /** favourites, then recent picks, then the rest (only when nobody is searching) */
    _withMemory: function (list) {
        var o = this.opts;
        var mem;
        var favSet;
        var recentOrder;
        var favs = [];
        var recs = [];
        var rest = [];
        var self = this;

        this._sections = null;

        if ((this.view && this.view !== 'all') || this.query || (!o.recent && !o.favorites) || o.sort) {
            return list;
        }

        mem = this._mem();

        if (!mem.fav.length && !mem.recent.length) {
            return list;
        }

        favSet = new Set(o.favorites ? mem.fav : []);
        recentOrder = new Map();
        (o.recent ? mem.recent : []).forEach(function (v, i) {
            recentOrder.set(v, i);
        });

        list.forEach(function (item) {
            var v = String(self._val(item));

            if (favSet.has(v)) {
                favs.push(item);
            } else if (recentOrder.has(v)) {
                recs.push(item);
            } else {
                rest.push(item);
            }
        });

        if (!favs.length && !recs.length) {
            return list;
        }

        recs.sort(function (a, b) {
            return recentOrder.get(String(self._val(a))) - recentOrder.get(String(self._val(b)));
        });
        this._sections = { fav: favs.length, rec: recs.length };
        return favs.concat(recs, rest);
    },
});

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

    // ---------- public factory ----------
    function bselect(target, options) {
        var node = typeof target === 'string' ? document.querySelector(target) : target;

        if (!node) {
            return null;
        }

        if (node._bselect) {
            node._bselect.destroy();
        }

        node._bselect = new BSelect(node, options);
        return node._bselect;
    }

    // bselect.preset('users', {url:..., labelField:...})  then  bselect('#x', {preset:'users'})
    bselect.preset = function (name, config) {
        PRESETS[name] = Object.assign(PRESETS[name] || {}, config || {});
    };

    // bselect.theme('hospital', { color:'#0f766e', shape:'pill', size:'lg' })  then  bselect('#x', { theme:'hospital' })
    bselect.theme = function (name, definition) {
        THEMES[name] = Object.assign(THEMES[name] || {}, definition || {});
    };

    bselect.themes = function () {
        return Object.keys(THEMES);
    };

    /**
     * Defaults. Order of precedence (later wins):   built-in default  ->  global  ->  per dropdown  ->  own options
     *
     *   bselect.defaults({ mode: 'dark', size: 'lg' })              // GLOBAL: every dropdown
     *   bselect.defaults('#ward', { color: '#0f766e' })             // PER DROPDOWN: by selector, id or name (set from any js file)
     *   bselect.defaults('.report-filter', { size: 'sm' })
     *   bselect('#ward', { size: 'md' })                            // OWN options win over both
     *   bselect.defaults()                                          // read the current global defaults
     */
    bselect.defaults = function (a, b) {
        if (a === undefined) {
            return Object.assign({}, PROJECT);
        }

        if (typeof a === 'string') {
            var found = REGISTRY.filter(function (entry) {
                return entry.match === a;
            })[0];

            if (!found) {
                found = { match: a, config: {} };
                REGISTRY.push(found);
            }

            Object.assign(found.config, b || {});
            return;
        }

        Object.assign(PROJECT, a || {});
    };

    /** every live dropdown */
    bselect.all = function () {
        return INSTANCES.slice();
    };

    /**
     * Switch the whole page: bselect.setMode('dark' | 'light' | 'auto').
     * Sets the global default (dropdowns created later) and updates every dropdown that exists now.
     */
    bselect.setMode = function (mode) {
        PROJECT.mode = mode;

        INSTANCES.slice().forEach(function (instance) {
            instance.setAppearance({ mode: mode });
        });
    };

    /**
     * Change settings on every live dropdown at once (and make them the global default for new ones), e.g. for a test toggle:
     *   bselect.apply({ mode: 'dark', settings: false, arrow: true, size: 'lg' });
     * Optional second argument = selector to limit which dropdowns change.
     */
    bselect.apply = function (changes, selector) {
        Object.assign(PROJECT, changes || {});

        INSTANCES.slice().forEach(function (instance) {
            if (selector && !(instance.source.matches && instance.source.matches(selector))) {
                return;
            }

            Object.keys(changes || {}).forEach(function (key) {
                instance._setting(key, changes[key]);
            });
        });
    };

    /**
     * Name an array once, use the name everywhere: no option JSON repeated in every loop row.
     *   bselect.data('staff', staffArray);   <div data-bselect data-options="staff"></div>   or   bselect(el, { options: 'staff' })
     * Call it again after the array changed in place (push/splice); a new array or a new length is noticed automatically.
     */
    bselect.data = function (name, array) {
        if (array === undefined) {
            return DATA[name];
        }

        if (OPTION_CACHE && DATA[name]) {
            OPTION_CACHE.delete(DATA[name]);
        }

        DATA[name] = array;
    };

    /** drop cached server answers: bselect.clearCache() = all, bselect.clearCache('/api/staff') = urls starting with that */
    bselect.clearCache = function (prefix) {
        REQ_CACHE.forEach(function (value, key) {
            if (!prefix || key.split(' ')[1].indexOf(prefix) === 0) {
                REQ_CACHE.delete(key);
            }
        });
    };

    /** forget the shared normalised copy of an array (after changing it in place) */
    bselect.invalidate = function (array) {
        if (OPTION_CACHE && array) {
            OPTION_CACHE.delete(array);
        }
    };

    /** build many dropdowns in one call: bselect.many('.js-staff', { options: staff }) or bselect.many(list, function (el, i) { return {...}; }) */
    bselect.many = function (selector, options) {
        var nodes = typeof selector === 'string' ? document.querySelectorAll(selector) : selector;

        return [].map.call(nodes, function (node, index) {
            return bselect(node, typeof options === 'function' ? options(node, index) : options);
        });
    };

    bselect.resetDefaults = function (match) {
        if (match === undefined) {
            Object.keys(PROJECT).forEach(function (key) {
                delete PROJECT[key];
            });
            REGISTRY.length = 0;
        } else {
            REGISTRY = REGISTRY.filter(function (entry) {
                return entry.match !== match;
            });
        }
    };

    // Read data-* attributes (any option, kebab-case): data-url, data-multiple, data-load="scroll", data-border-color="#f00" ...
    var FN_KEYS = ['handler', 'renderItem', 'imageFor', 'resolve', 'beforeChange', 'onCreate', 'transform', 'formatLabel', 'isOptionDisabled', 'avatarColor_fn'];
    var NUMERIC_NULL = ['radius', 'fontSize', 'borderWidth', 'panelWidth', 'listHeight', 'rowHeight', 'imageSize'];

    function coerce(key, raw) {
        var def = DEFAULTS[key] !== undefined ? DEFAULTS[key] : NAMES[key] ? DEFAULTS[NAMES[key]] : undefined;

        if (key === 'options' && !/^\s*[\[{]/.test(raw)) {
            return raw; // a name from bselect.data()
        }

        if (['options', 'params', 'headers', 'style', 'vars', 'imageMap', 'subTextMap'].indexOf(key) >= 0) {
            try {
                return JSON.parse(raw);
            } catch (e) {
                return key === 'options' ? [] : {};
            }
        }

        if (typeof def === 'boolean' || ['lazy', 'loadMore', 'noSearch', 'required', 'serverSearch'].indexOf(key) >= 0) {
            return raw !== 'false' && raw !== '0';
        }

        if (typeof def === 'number' || (NUMERIC_NULL.indexOf(key) >= 0 && /^-?\d+(\.\d+)?$/.test(raw))) {
            return parseFloat(raw);
        }

        return raw;
    }

    function fromData(node) {
        var d = node.dataset;
        var options = {};
        var keys = Object.keys(DEFAULTS).concat(Object.keys(NAMES), ['searchMode', 'sortMode', 'lazy', 'loadMore', 'preset', 'noSearch']);

        keys.forEach(function (key) {
            if (FN_KEYS.indexOf(key) >= 0) {
                return;
            }

            if (d[key] !== undefined) {
                options[key] = coerce(key, d[key]);
            }
        });

        if (d.bselect) {
            options.preset = d.bselect;
        }

        if (options.noSearch) {
            options.search = false;
        }

        delete options.noSearch;

        if (d.value !== undefined) {
            options.value = options.multiple ? d.value.split(',') : d.value;
        }

        return options;
    }

    // for wrappers: option names + coercion of string values (data-* / html attributes)
    bselect.optionKeys = function () {
        return Object.keys(DEFAULTS).concat(Object.keys(NAMES), ['searchMode', 'sortMode', 'lazy', 'loadMore', 'preset', 'noun']);
    };
    bselect.coerce = coerce;
    bselect.fromElement = fromData;

    bselect.scan = function (root) {
        [].forEach.call((root || document).querySelectorAll('[data-bselect]'), function (node) {
            if (!node._bselect) {
                bselect(node, fromData(node));
            }
        });
    };

    // Optional jQuery plugin: $('#x').bselect({...}) -> instance;  $('#x').bselect('getValue')
    if (window.jQuery) {
        window.jQuery.fn.bselect = function (arg) {
            var args = Array.prototype.slice.call(arguments, 1);
            var result;

            this.each(function () {
                var instance = this._bselect;

                if (typeof arg === 'string') {
                    if (instance && result === undefined) {
                        result = instance[arg].apply(instance, args);
                    }
                } else {
                    bselect(this, arg);
                }
            });

            return result === undefined ? this : result;
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            bselect.scan();
        });
    } else {
        bselect.scan();
    }

    bselect.version = '1.0.0';

    window.bselect = bselect;
})(window, document);
