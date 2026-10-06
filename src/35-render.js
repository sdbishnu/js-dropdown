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
    /** split like String.split(re) but find the matches in the accent-free copy of the text */
    _markFolded: function (text, re) {
        var plain = '';
        var parts = [];
        var last = 0;
        var m;
        var c;
        var i;

        for (i = 0; i < text.length; i++) {
            c = fold(text.charAt(i));
            plain += c.length === 1 ? c : text.charAt(i);
        }

        re.lastIndex = 0;

        while ((m = re.exec(plain)) && m[0]) {
            parts.push(text.slice(last, m.index), text.slice(m.index, m.index + m[0].length));
            last = m.index + m[0].length;
        }

        parts.push(text.slice(last));
        return parts;
    },

    /** status colour names the statusField / badgeColorField understand */
    _tone: function (value) {
        var tones = { ok: '#16a34a', success: '#16a34a', active: '#16a34a', warn: '#f59e0b', warning: '#f59e0b', error: '#dc2626', danger: '#dc2626', info: '#3b82f6', off: '#94a3b8', inactive: '#94a3b8' };

        return tones[String(value).toLowerCase()] || String(value);
    },

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
        text = String(text);

        if (this.opts.accentInsensitive !== false) {
            parts = this._markFolded(text, re);
        } else {
            parts = text.split(re);
        }


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

        if (o.statusField && item[o.statusField]) {
            var dot = el('span', 'bselect-status-dot');

            dot.style.background = this._tone(item[o.statusField]);
            main.insertBefore(dot, main.firstChild);
        }

        if (o.disabledReasonField && item[o.disabledReasonField] && this._isDisabled(item)) {
            var why = el('small', 'bselect-item-reason');

            why.textContent = String(item[o.disabledReasonField]);
            text.appendChild(why);
            li.title = why.textContent;
        }

        li.appendChild(text);

        if (o.badgeField && item[o.badgeField]) {
            var badge = el('span', 'bselect-badge');

            badge.textContent = String(item[o.badgeField]);

            if (o.badgeColorField && item[o.badgeColorField]) {
                badge.style.setProperty('--bselect-badge', this._tone(item[o.badgeColorField]));
            }

            li.appendChild(badge);
        }

        if (o.metaField && item[o.metaField] !== undefined && item[o.metaField] !== null && item[o.metaField] !== '') {
            li.appendChild(el('span', 'bselect-item-meta', String(item[o.metaField])));
        }

        if (selected && o.checkStyle !== 'box' && o.checkStyle !== 'switch') {
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

            if (o.checkStyle !== 'box' && o.checkStyle !== 'switch') {
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
            if (i >= visible.length || (!this._isDisabled(visible[i]) && !(this.opts.groupField && visible[i][this.opts.groupField] && this._groupFolded(String(visible[i][this.opts.groupField]))))) {
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
        } else if ((key === 'a' || key === 'A') && (event.ctrlKey || event.metaKey) && this.isOpen && this.opts.multiple && this.opts.rangeSelect !== false && (event.target !== this.input || !this.input.value)) {
            event.preventDefault();
            this._selectAllListed();
        } else if (key === 'ArrowDown' || key === 'ArrowUp') {
            event.preventDefault();

            if (!this.isOpen) {
                return this.open();
            }

            next = this._step(this.active, key === 'ArrowDown' ? 1 : -1, visible);

            // Shift+arrow extends the selection from the anchor row
            if (event.shiftKey && this.opts.multiple && this.opts.rangeSelect !== false && next >= 0 && next < visible.length) {
                if (this._anchorValue === undefined && this.active >= 0 && this.active < visible.length) {
                    this._anchorValue = this._val(visible[this.active]);
                    this._selectItems([visible[this.active]]);
                }

                this._setActive(next);
                this._selectRange(next);
                return;
            }

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
