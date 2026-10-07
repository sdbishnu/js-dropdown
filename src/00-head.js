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
                ? currentScript.src.replace(/bselect[\w.-]*\.js(\?.*)?$/i, /\.min\.js/i.test(currentScript.src) ? 'bselect.min.css?v=__BSELECT_VERSION__' : 'bselect.css?v=__BSELECT_VERSION__')
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
