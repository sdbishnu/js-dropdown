/* Hover popover with the full selected values (after 2s) and marquee scrolling for overflowing text */
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

            self._popTimer = setTimeout(function () {
                self._popoverShow();
            }, 2000);
        });
        this.textBox.addEventListener('mouseleave', function () {
            cancel();
            self._popTimer = setTimeout(function () {
                self._popoverHide();
            }, 140);
        });
    },

    _popoverShow: function () {
        var self = this;
        var pop;
        var header;
        var count;
        var list;
        var rect;
        var box;
        var left;
        var top;

        this._popoverHide();

        if (this.isOpen || !this.selected.length) {
            return;
        }

        pop = el('div', 'bselect-value-popover');
        pop.setAttribute('role', 'tooltip');

        if (this.root.classList.contains('bselect-dark')) {
            pop.classList.add('bselect-pop-dark');
        }

        header = el('div', 'bselect-value-popover-header');
        header.appendChild(el('span', 'bselect-value-popover-caption', 'Selected values'));
        count = el('span', 'bselect-value-popover-count', String(this.selected.length));
        header.appendChild(count);
        pop.appendChild(header);
        list = el('div', 'bselect-value-popover-list');
        this.selected.forEach(function (item) {
            var row = el('div', 'bselect-value-popover-item');
            row.appendChild(el('span', '', self._lbl(item)));
            list.appendChild(row);
        });
        pop.appendChild(list);
        pop.style.setProperty('--bselect-popover-color', getComputedStyle(this.root).getPropertyValue('--bselect-color').trim() || '#47a0ec');
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
        top = rect.bottom + 7;

        if (top + box.height > window.innerHeight - 8) {
            top = Math.max(8, rect.top - box.height - 7);
            pop.classList.add('bselect-value-popover-up');
        }

        pop.style.left = left + 'px';
        pop.style.top = top + 'px';
        this._pop = pop;
    },

    _popoverHide: function () {
        clearTimeout(this._popTimer);

        if (this._pop && this._pop.parentNode) {
            this._pop.parentNode.removeChild(this._pop);
        }

        this._pop = null;
    },
});
