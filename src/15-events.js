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
