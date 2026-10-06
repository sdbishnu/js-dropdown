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

/** "José" -> "Jose" (search and highlight ignore accents) */
function fold(text) {
    return text.normalize ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : text;
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

        var ttl = o.cache === true ? 30000 : Number(o.cache) || 0;
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
        var o = this.opts;

        var fields = this._searchFields();
        var text;

        if (fields) {
            text = fields
                .map(function (name) {
                    return item[name] === undefined || item[name] === null ? '' : item[name];
                })
                .join(' ');
        } else {
            text = this._lbl(item) + (this._subText(item) ? ' ' + this._subText(item) : '');
        }

        text = text.toLowerCase();
        return o.accentInsensitive === false ? text : fold(text);
    },

    _searchKey: function () {
        return (this._hasSub() ? this.opts.subTextField || '*' : '') + '|' + (this._subVer || 0) + '|' + String(this.opts.searchFields || '') + '|' + (this.opts.accentInsensitive === false ? 0 : 1);
    },

    /** searchFields as an array (accepts 'name,code' too), or null */
    _searchFields: function () {
        var f = this.opts.searchFields;

        if (!f) {
            return null;
        }

        return typeof f === 'string' ? f.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : f;
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
        var q = this.query ? this.query.toLowerCase() : '';

        if (this.opts.accentInsensitive !== false) {
            q = fold(q);
        }

        return q.split(/\s+/).filter(Boolean);
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

                if (typeof x === 'string') x = x.toLowerCase();
                if (typeof y === 'string') y = y.toLowerCase();

                return x < y ? -dir : x > y ? dir : 0;
            });
        }

        list = this._withMemory(list);
        this._memo = { items: this.items, len: this.items.length, key: key, list: list };
        return list;
    },
});
