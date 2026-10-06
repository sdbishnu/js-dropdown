/*
 * AngularJS 1.x wrapper for BSelect.  Needs dist/bselect.bundle.js (+ bselect.css) loaded first.
 * All dropdown logic is in the plain-JS core; this file only connects it to ng-model, scope and digest.
 *
 *   <bselect ng-model="f.user" preset="users"></bselect>
 *   <bselect ng-model="f.users" url="php/user.php?action=dropdown" load="scroll" multiple placeholder="Pick users"
 *            options="wardList" params="{active:1}" depends-on="f.dept" on-change="changed($value, $items)"></bselect>
 *   <bselect ng-model="x" config="myConfig"></bselect>      (flat options, or the old grouped config)
 *
 * Settings layers (later wins):  built-in default -> bselect.defaults({}) (global) -> bselect.defaults('f.user', {}) (per dropdown)
 *                                -> own (attributes / config="")
 * The per-dropdown key can be the dropdown's id, name, or its ng-model expression.
 *
 * The old API is supported too (bselect.bind, bselect.server/local/serverHandler/api, bselect.refresh, bselect.toParam,
 * grouped data/server/selection/search/sort/display configs, selection.model:'object'), so existing pages only
 * need the new script tags.
 */
(function (angular) {
    'use strict';

    var core = window.bselect;

    function isObject(value) {
        return value !== null && typeof value === 'object' && !angular.isArray(value) && !angular.isFunction(value);
    }

    function isEmptyValue(value) {
        return value === undefined || value === null || value === '' || String(value) === '0' || (angular.isArray(value) && !value.length);
    }

    // ------------------------------------------------------------------ old grouped config -> flat core options
    function isLegacy(config) {
        return !!config && (isObject(config.data) || isObject(config.server) || isObject(config.selection) || isObject(config.display) || isObject(config.search) || isObject(config.sort));
    }

    function fromLegacy(config) {
        var out = {};
        var data = (config && config.data) || {};
        var server = (config && config.server) || {};
        var selection = (config && config.selection) || {};
        var search = isObject(config && config.search) ? config.search : {};
        var sort = isObject(config && config.sort) ? config.sort : {};
        var display = (config && config.display) || {};
        var source = data.source;
        var load = data.load;
        var mode;

        function put(key, value) {
            if (value !== undefined) {
                out[key] = value;
            }
        }

        if (isObject(source)) {
            put('params', source.params);

            if (angular.isFunction(source.handler)) {
                put('handler', source.handler);
            }

            if (source.handlers) {
                put('handler', source.handlers.loadPage);
                put('resolve', source.handlers.resolveSelected);
            }

            if (source.options !== undefined) {
                put('options', source.options);
            }
        }

        if (data.options !== undefined && out.options === undefined) {
            put('options', data.options);
        }

        put('url', server.url);

        if (angular.isFunction(server.handler)) {
            put('handler', server.handler);
        }

        put('method', server.method);
        put('headers', server.headers);

        if (server.params !== undefined) {
            put('params', server.params);
        }

        put('pageParam', server.pageParam);
        put('pageSizeParam', server.pageSizeParam);
        put('valueField', data.valueField);
        put('labelField', data.labelField);
        put('disabledField', data.disabledField);
        put('itemsField', data.itemsField);
        put('totalField', data.totalField);
        put('hasMoreField', data.hasMoreField);
        put('transform', data.transformResponse);
        put('formatLabel', data.formatLabel);
        put('isOptionDisabled', data.isOptionDisabled);
        put('pageSize', data.pageSize);

        if (isObject(load)) {
            put('loadOn', load.trigger === 'immediate' ? 'init' : 'open');
            put('pageSize', load.pageSize);
            put('load', load.nextPage === 'button' ? 'button' : load.nextPage === 'onScroll' ? 'scroll' : 'all');
        } else if (load !== undefined) {
            put('load', load === 'lazy' ? 'scroll' : load === 'loadMore' ? 'button' : 'all');
        }

        mode = selection.mode || selection.selection;

        if (mode) {
            put('multiple', ['multiple', 'checkbox'].indexOf(mode) >= 0);
        }

        put('modelType', selection.model === 'object' ? 'object' : undefined);
        put('clearable', selection.clearable);
        put('selectAll', selection.selectAll);

        put('search', search.enabled);
        put('searchPlaceholder', search.placeholder);
        put('searchMinChars', search.minCharacters);
        put('searchDelay', search.debounce);
        put('searchParam', search.param);

        put('sort', sort.enabled);
        put('serverSort', sort.server);
        put('sortField', sort.field);

        put('settings', display.showSettings);
        put('lazyHint', display.lazyLoadHint);
        put('popover', display.textPopover);
        put('color', display.color);
        put('borderColor', display.borderColor);
        put('borderWidth', display.borderWidth);
        put('placeholder', display.placeholder);
        put('disabled', display.disabled);

        return out;
    }

    function mergeDeep(base, extra) {
        var out = angular.copy(base || {});

        angular.forEach(extra || {}, function (value, key) {
            out[key] = isObject(value) && isObject(out[key]) ? mergeDeep(out[key], value) : angular.isFunction(value) ? value : angular.copy(value);
        });
        return out;
    }

    // what bselect.bind() used to start from
    var LEGACY_PRESETS = {
        serverLazyMulti: {
            data: { load: 'lazy', pageSize: 10, valueField: 'id', labelField: 'name' },
            selection: { mode: 'checkbox', clearable: true, selectAll: true, panel: true },
            search: { enabled: true, debounce: 350 },
            sort: { enabled: true, server: false },
            display: { showSettings: true, lazyLoadHint: false, textPopover: true },
        },
    };

    angular
        .module('bselect', [])

        .constant('bselectLib', core)

        .factory('bselect', function () {
            var service = {
                lib: core,
                defaults: core.defaults,
                resetDefaults: core.resetDefaults,
                preset: core.preset,
                theme: core.theme,
                themes: core.themes,

                /** old API: bselect.bind($scope, { modelName: config }, sharedConfig, presetName) */
                bind: function (scope, definitions, shared, preset) {
                    var base = mergeDeep(LEGACY_PRESETS[preset || 'serverLazyMulti'] || {}, shared || {});
                    var configs = {};

                    angular.forEach(definitions || {}, function (definition, name) {
                        configs[name] = mergeDeep(base, definition || {});
                    });

                    if (scope) {
                        scope.bselectConfigs = angular.extend({}, scope.bselectConfigs || {}, configs);
                        configs = scope.bselectConfigs;
                    }

                    return configs;
                },

                server: function (url, params, label) {
                    return { data: { source: 'server' }, server: { url: url, params: params || {} }, search: { placeholder: 'Search ' + label }, display: { placeholder: 'Select ' + label } };
                },

                serverHandler: function (handler, params, label) {
                    return { data: { source: 'server' }, server: { handler: handler, params: params || {} }, search: { placeholder: 'Search ' + label }, display: { placeholder: 'Select ' + label } };
                },

                local: function (options, label) {
                    return { data: { source: 'local', load: 'all', options: options || [] }, search: { placeholder: 'Search ' + label }, display: { placeholder: 'Select ' + label } };
                },

                api: function (baseUrl) {
                    return {
                        server: function (action, params, label) {
                            return service.server(baseUrl + action, params, label);
                        },
                    };
                },

                /** old API: reload the dropdowns that were created from these configs */
                refresh: function (configs) {
                    angular.forEach(configs || {}, function (config) {
                        if (config && config._bselectInstance) {
                            config._bselectInstance.reload();
                        }
                    });
                },

                clearCache: angular.noop,

                toParam: function (value) {
                    if (angular.isArray(value)) {
                        return value.join(',');
                    }

                    if (isObject(value)) {
                        return value.id === undefined || value.id === null ? '' : value.id;
                    }

                    return value === undefined || value === null ? '' : value;
                },
            };

            return service;
        })

        .directive('bselect', function () {
            return {
                restrict: 'E',
                require: 'ngModel',
                scope: false,

                link: function (scope, element, attrs, ngModel) {
                    var host = element[0];
                    var registered = findRegistered();
                    var own = {};
                    var configAttr = attrs.config ? scope.$eval(attrs.config) : null;
                    var legacyConfig = registered || (isLegacy(configAttr) ? configAttr : null);
                    var flatConfig = configAttr && !isLegacy(configAttr) ? configAttr : null;
                    var optionKeys = core.optionKeys();
                    var skip = { options: 1, params: 1, dependsOn: 1, value: 1, disabled: 1, config: 1, modelType: 1 };
                    var instance;
                    var internal = false;
                    var parentWaiting = false;
                    var userDisabled = false;
                    var optionsProvider = null;
                    var baseParams;

                    function findRegistered() {
                        var parent = scope;

                        while (parent) {
                            if (parent.bselectConfigs && Object.prototype.hasOwnProperty.call(parent.bselectConfigs, attrs.ngModel)) {
                                return parent.bselectConfigs[attrs.ngModel];
                            }

                            parent = parent.$parent;
                        }

                        return null;
                    }

                    function modelType() {
                        return own.modelType === 'object' ? 'object' : 'value';
                    }

                    // ---- own options: legacy/flat config first, then attributes win
                    if (legacyConfig) {
                        angular.extend(own, fromLegacy(legacyConfig));
                    }

                    if (flatConfig) {
                        angular.extend(own, flatConfig);
                    }

                    angular.forEach(optionKeys, function (key) {
                        if (attrs[key] !== undefined && !skip[key]) {
                            own[key] = core.coerce(key, attrs[key]);
                        }
                    });

                    if (attrs.modelType) {
                        own.modelType = attrs.modelType;
                    }

                    if (attrs.options) {
                        own.options = scope.$eval(attrs.options) || [];
                    }

                    // local options given as a provider function: read the latest array, watch it for later changes
                    if (angular.isFunction(own.options)) {
                        optionsProvider = own.options;
                        own.options = optionsProvider() || [];
                    }

                    function parentValue() {
                        return attrs.dependsOn ? scope.$eval(attrs.dependsOn) : undefined;
                    }

                    // params: attribute expression + parent value, evaluated on every request
                    baseParams = own.params;

                    if (attrs.params || attrs.dependsOn || angular.isFunction(baseParams)) {
                        own.params = function (state) {
                            var result = angular.extend({}, angular.isFunction(baseParams) ? baseParams(state) : baseParams || {}, attrs.params ? scope.$eval(attrs.params) || {} : {});

                            if (attrs.dependsOn) {
                                result[attrs.dependsParam || 'parent'] = parentValue();
                            }

                            return result;
                        };
                    }

                    own.onChange = function (value, selected) {
                        var model;
                        var empty;
                        var legacyHandler = legacyConfig && legacyConfig.selection && legacyConfig.selection.onChange;

                        if (angular.isFunction(legacyHandler)) {
                            legacyHandler(value, selected);
                        }

                        if (modelType() === 'object') {
                            if (own.multiple) {
                                model = selected || [];
                            } else if (selected) {
                                model = selected;
                            } else {
                                empty = {};
                                empty[instance.opts.valueField] = '0';
                                model = empty;
                            }
                        } else {
                            model = value;
                        }

                        internal = true;
                        scope.$applyAsync(function () {
                            ngModel.$setViewValue(model);
                            ngModel.$setTouched();
                            internal = false;

                            if (attrs.onChange) {
                                scope.$eval(attrs.onChange, { $value: value, $items: selected });
                            }
                        });
                    };

                    // matching key for bselect.defaults('f.user', {...}) = id, name or the ng-model expression
                    if (!host.getAttribute('name')) {
                        host.setAttribute('name', attrs.ngModel);
                    }

                    element.css('display', 'block');
                    instance = core(host, own);

                    if (legacyConfig) {
                        legacyConfig._bselectInstance = instance;
                    }

                    // ---- model <-> dropdown
                    function toCore(view) {
                        var field = instance.opts.valueField;
                        var items;
                        var values;

                        if (modelType() === 'object') {
                            items = (own.multiple ? (angular.isArray(view) ? view : []) : [view]).filter(isObject);
                            values = items
                                .map(function (item) {
                                    return item[field];
                                })
                                .filter(function (v) {
                                    return !isEmptyValue(v);
                                });
                            return { values: own.multiple ? values : values[0], items: items };
                        }

                        if (own.multiple) {
                            return {
                                values: angular.isArray(view)
                                    ? view.filter(function (v) {
                                          return !isEmptyValue(v);
                                      })
                                    : [],
                                items: null,
                            };
                        }

                        return { values: isEmptyValue(view) ? '' : view, items: null };
                    }

                    ngModel.$render = function () {
                        var converted;

                        if (internal) {
                            return;
                        }

                        converted = toCore(ngModel.$viewValue);
                        instance.setValue(converted.values, converted.items, true);
                    };

                    ngModel.$isEmpty = function (value) {
                        return isEmptyValue(modelType() === 'object' ? toCore(value).values : value);
                    };

                    // red border follows the form validity
                    scope.$watch(
                        function () {
                            return ngModel.$invalid && (ngModel.$touched || ngModel.$dirty);
                        },
                        function (invalid) {
                            instance.root.classList.toggle('bselect-invalid', !!invalid);
                        }
                    );

                    // ---- data that changes from the controller
                    // cheap watchers (array reference + length): $watchCollection would copy a 2000-item array per dropdown per digest
                    function watchList(getList) {
                        function update() {
                            instance.setOptions(getList() || []);
                        }

                        scope.$watch(getList, function (value, old) {
                            if (value !== old) {
                                update();
                            }
                        });
                        scope.$watch(
                            function () {
                                var list = getList();

                                return list ? list.length : -1;
                            },
                            function (value, old) {
                                if (value !== old) {
                                    core.invalidate(getList());
                                    update();
                                }
                            }
                        );
                    }

                    if (attrs.options) {
                        watchList(function () {
                            return scope.$eval(attrs.options);
                        });
                    }

                    if (optionsProvider) {
                        watchList(optionsProvider);
                    }

                    if (attrs.params) {
                        scope.$watch(
                            attrs.params,
                            function (value, old) {
                                if (value !== old && !angular.equals(value, old)) {
                                    instance.reload();
                                }
                            },
                            true
                        );
                    }

                    // ---- depends-on: a scope expression for the parent value
                    if (attrs.dependsOn) {
                        scope.$watch(
                            attrs.dependsOn,
                            function (value, old) {
                                parentWaiting = own.dependsRequired !== false && isEmptyValue(value);
                                instance.disable(parentWaiting || userDisabled);

                                if (value !== old) {
                                    instance.clear();
                                    instance.reload();
                                }
                            },
                            true
                        );
                    }

                    if (attrs.ngDisabled || attrs.disabled !== undefined) {
                        scope.$watch(attrs.ngDisabled || attrs.disabled, function (value) {
                            userDisabled = !!value;
                            instance.disable(userDisabled || parentWaiting);
                        });
                    }

                    scope.$on('$destroy', function () {
                        if (legacyConfig && legacyConfig._bselectInstance === instance) {
                            delete legacyConfig._bselectInstance;
                        }

                        instance.destroy();
                    });

                    element.data('$bselect', instance);
                },
            };
        });
})(window.angular);
