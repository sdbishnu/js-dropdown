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
