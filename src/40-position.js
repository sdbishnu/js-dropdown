/* Panel auto-position (up/down, start/end inside card or viewport) and drag-to-resize */
Object.assign(BSelect.prototype, {
    _bounds: function () {
        var node = this.root.parentElement;
        var bounds = { left: 8, right: Math.max(8, window.innerWidth - 8) };
        var rect;

        while (node && node !== document.body) {
            if (node.matches && node.matches('[data-bselect-boundary], .bselect-boundary, .card, .panel-wrap')) {
                rect = node.getBoundingClientRect();
                bounds.left = Math.max(bounds.left, rect.left + 7);
                bounds.right = Math.min(bounds.right, rect.right - 7);
                break;
            }

            node = node.parentElement;
        }

        if (bounds.right <= bounds.left) {
            bounds.left = 8;
            bounds.right = Math.max(8, window.innerWidth - 8);
        }

        bounds.width = bounds.right - bounds.left;
        return bounds;
    },

    _position: function () {
        var rect = this.root.getBoundingClientRect();
        var panel = this.panel;
        var height = Math.min(430, window.innerHeight * 0.65);
        var below = window.innerHeight - rect.bottom;
        var bounds;
        var min;
        var width;
        var toEnd;
        var toStart;
        var left;

        if (!panel) {
            return;
        }

        this.root.classList.toggle('bselect-up', below < height && rect.top > below);

        if (window.innerWidth <= 576) {
            panel.style.width = panel.style.minWidth = panel.style.left = panel.style.right = '';
            return;
        }

        bounds = this._bounds();
        min = Math.min(240, bounds.width);
        width = Math.min(350, bounds.width, Math.max(min, this.panelWidth || rect.width));
        toEnd = bounds.right - rect.left;
        toStart = rect.right - bounds.left;
        this.align = width <= toEnd ? 'start' : width <= toStart ? 'end' : toEnd >= toStart ? 'start' : 'end';
        left = this.align === 'end' ? rect.right - width : rect.left;
        left = Math.max(bounds.left, Math.min(left, bounds.right - width));

        panel.style.width = Math.round(width) + 'px';
        panel.style.minWidth = Math.round(min) + 'px';
        panel.style.left = Math.round(left - rect.left) + 'px';
        panel.style.right = 'auto';
        this.root.classList.toggle('bselect-end', this.align === 'end');

        if (this.handle) {
            this.handle.className = 'bselect-resize-handle bselect-resize-handle-' + (this.align === 'end' ? 'left' : 'right');
        }
    },

    _resizeInit: function (panel) {
        var self = this;

        if (this.opts.resizable === false) {
            return;
        }

        this.handle = el('span', 'bselect-resize-handle bselect-resize-handle-right');
        panel.appendChild(this.handle);

        this.handle.addEventListener('mousedown', function (event) {
            var rect;
            var bounds;
            var trigger;
            var dir;
            var max;
            var min;
            var startX = event.clientX;
            var startWidth;
            var anchorRight;

            if (window.innerWidth <= 576) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            rect = self.panel.getBoundingClientRect();
            bounds = self._bounds();
            trigger = self.root.getBoundingClientRect();
            dir = self.align === 'end' ? -1 : 1;
            startWidth = rect.width;
            anchorRight = rect.right;
            max = Math.min(350, dir === -1 ? rect.right - bounds.left : bounds.right - rect.left);
            min = Math.min(240, max);
            self.root.classList.add('bselect-resizing');

            function move(e) {
                var width = Math.max(min, Math.min(max, startWidth + (e.clientX - startX) * dir));

                self.panelWidth = Math.round(width);
                self.panel.style.width = self.panelWidth + 'px';

                if (dir === -1) {
                    self.panel.style.left = Math.round(anchorRight - width - trigger.left) + 'px';
                }
            }

            function up() {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
                self.root.classList.remove('bselect-resizing');
                self._suppressUntil = Date.now() + 300;
            }

            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
        });
    },

    _bindWindow: function (on) {
        var self = this;

        if (on && !this._onResize) {
            this._onResize = function () {
                if (self.isOpen) {
                    self._position();
                }
            };
            window.addEventListener('resize', this._onResize);
        } else if (!on && this._onResize) {
            window.removeEventListener('resize', this._onResize);
            this._onResize = null;
        }
    },
});
