/* Hover preview of the selected values (5 styles: card | chips | list | tooltip | details) and marquee scrolling for overflowing text */
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

            self._popTimer = setTimeout(
                function () {
                    self._popoverShow();
                },
                Number(self.opts.previewDelay === null || self.opts.previewDelay === undefined ? 500 : self.opts.previewDelay)
            );
        });
        this.textBox.addEventListener('mouseleave', function () {
            cancel();
            self._popTimer = setTimeout(function () {
                self._popoverHide();
            }, 140);
        });
    },

    /** one value as a row: picture + label + sub text (the card style) */
    _pvRow: function (item, big) {
        var row = el('div', 'bselect-pv-row' + (big ? ' bselect-pv-row-big' : ''));
        var pic = el('span');
        var text = el('span', 'bselect-pv-text');
        var sub = this._subText(item);

        if (this._fillPicture(pic, item, 'bselect-pv-pic')) {
            row.appendChild(pic);
        }

        text.appendChild(el('strong', '', this._lbl(item)));

        if (sub) {
            text.appendChild(el('small', '', sub));
        }

        row.appendChild(text);
        return row;
    },

    /** the preview body for one of the styles: card | chips | list | tooltip | details */
    _pvBody: function (style, items, max, sample) {
        var self = this;
        var shown = items.slice(0, max);
        var more = items.length - shown.length;
        var body = el('div', 'bselect-pv-body');
        var head;
        var wrap;

        function moreRow() {
            return more > 0 ? el('div', 'bselect-pv-more', '+ ' + more + ' more') : document.createTextNode('');
        }

        if (style === 'tooltip') {
            if (items.length === 1) {
                body.appendChild(el('strong', '', this._lbl(items[0])));

                if (this._subText(items[0])) {
                    body.appendChild(el('small', '', this._subText(items[0])));
                }
            } else {
                body.appendChild(
                    el(
                        'span',
                        '',
                        shown
                            .map(function (i) {
                                return self._lbl(i);
                            })
                            .join('  ·  ') + (more > 0 ? '  ·  +' + more : '')
                    )
                );
            }

            return body;
        }

        head = el('div', 'bselect-pv-head');
        head.appendChild(el('span', 'bselect-pv-title', sample ? 'Preview (sample)' : items.length > 1 || this.opts.multiple ? 'Selected values' : 'Selected value'));
        head.appendChild(el('span', 'bselect-pv-count', String(items.length)));

        if (style === 'chips') {
            body.appendChild(head);
            wrap = el('div', 'bselect-pv-chips');
            shown.forEach(function (item) {
                var chip = el('span', 'bselect-pv-chip');
                var pic = el('span');

                if (self._fillPicture(pic, item, 'bselect-pv-pic')) {
                    chip.appendChild(pic);
                }

                chip.appendChild(el('span', '', self._lbl(item)));
                wrap.appendChild(chip);
            });

            if (more > 0) {
                wrap.appendChild(el('span', 'bselect-pv-chip bselect-pv-chip-more', '+' + more));
            }

            body.appendChild(wrap);
            return body;
        }

        if (style === 'list') {
            body.appendChild(head);
            wrap = el('ol', 'bselect-pv-ol');
            shown.forEach(function (item) {
                wrap.appendChild(el('li', '', self._lbl(item)));
            });
            body.appendChild(wrap);
            body.appendChild(moreRow());
            return body;
        }

        if (style === 'details') {
            body.appendChild(head);
            wrap = el('div', 'bselect-pv-table');
            shown.forEach(function (item) {
                var r = el('div', 'bselect-pv-tr');
                var sub = self._subText(item);

                r.appendChild(el('span', 'bselect-pv-k', self._lbl(item)));
                r.appendChild(el('span', 'bselect-pv-v', (sub ? sub + '  ·  ' : '') + String(self._val(item))));
                wrap.appendChild(r);
            });
            body.appendChild(wrap);
            body.appendChild(moreRow());
            return body;
        }

        // card (default): one value = one big card, several = header + rich rows
        if (items.length === 1 && !this.opts.multiple) {
            body.appendChild(this._pvRow(items[0], true));
            return body;
        }

        body.appendChild(head);
        shown.forEach(function (item) {
            body.appendChild(self._pvRow(item, false));
        });
        body.appendChild(moreRow());
        return body;
    },

    /** show the preview of the selected values; sample === true (settings "Show preview") uses the first rows when nothing is selected */
    _popoverShow: function (sample) {
        var self = this;
        var o = this.opts;
        var style = ['card', 'chips', 'list', 'tooltip', 'details'].indexOf(o.previewStyle) >= 0 ? o.previewStyle : 'card';
        var items = this.selected;
        var max = Math.max(1, Number(o.previewMax === null || o.previewMax === undefined ? 8 : o.previewMax));
        var forced = false;
        var pop;
        var cs;
        var rect;
        var box;
        var left;
        var top;

        this._popoverHide();

        if (!items.length && sample === true) {
            items = (this.items && this.items.length ? this.items : this.known).slice(0, 3);
            forced = true;
        }

        if ((this.isOpen && sample !== true) || !items.length) {
            return;
        }

        pop = el('div', 'bselect-pv bselect-pv-' + style);
        pop.setAttribute('role', 'tooltip');
        pop.appendChild(this._pvBody(style, items, max, forced));

        // the colours of the field it belongs to (light, dark, custom background, accent)
        cs = getComputedStyle(this.root);
        ['--bselect-bg', '--bselect-text', '--bselect-muted', '--bselect-line', '--bselect-border', '--bselect-color', '--bselect-surface-2', '--bselect-surface-3', '--bselect-hover', '--bselect-panel-radius', '--bselect-img-radius'].forEach(function (name) {
            var v = cs.getPropertyValue(name);

            if (v && v.trim()) {
                pop.style.setProperty(name, v.trim());
            }
        });
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
        top = rect.bottom + 9;

        if (this.isOpen || top + box.height > window.innerHeight - 8) {
            top = Math.max(8, rect.top - box.height - 9);
            pop.classList.add('bselect-pv-up');
        }

        pop.style.left = left + 'px';
        pop.style.top = top + 'px';
        pop.style.setProperty('--bselect-pv-arrow', Math.max(14, Math.min(rect.left + 22 - left, box.width - 22)) + 'px');
        this._pop = pop;

        // a preview asked for from the settings is only a demonstration: it never blocks the pointer and goes away by itself
        if (sample === true) {
            pop.classList.add('bselect-pv-demo');
            this._popTimer = setTimeout(function () {
                self._popoverHide();
            }, 2800);
        }
    },

    _popoverHide: function () {
        clearTimeout(this._popTimer);

        if (this._pop && this._pop.parentNode) {
            this._pop.parentNode.removeChild(this._pop);
        }

        this._pop = null;
    },
});
