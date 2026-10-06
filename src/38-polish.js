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
