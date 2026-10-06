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

    bselect.version = '__BSELECT_VERSION__';

    window.bselect = bselect;
})(window, document);
