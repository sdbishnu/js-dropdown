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
