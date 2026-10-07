/* Panel UI (same structure and class names as the original AngularJS bselect.html) and its render pass */
var ICONS = {
    close: '<svg viewBox="0 0 10 10" width="1em" height="1em" aria-hidden="true"><path d="M2 2l6 6M8 2L2 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    list: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M5 3.5h9M5 8h9M5 12.5h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="2" cy="3.5" r="1" fill="currentColor"/><circle cx="2" cy="8" r="1" fill="currentColor"/><circle cx="2" cy="12.5" r="1" fill="currentColor"/></svg>',
    data: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><ellipse cx="8" cy="3.5" rx="5.5" ry="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 3.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    search: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M10 10l4.5 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    cog: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><circle cx="8" cy="8" r="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    inbox: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M2 9l2-6h8l2 6v4H2zM2 9h4l1 2h2l1-2h4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    sliders: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="5" cy="4" r="1.7" fill="currentColor"/><circle cx="11" cy="8" r="1.7" fill="currentColor"/><circle cx="6" cy="12" r="1.7" fill="currentColor"/></svg>',
    image: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><rect x="1.8" y="2.8" width="12.4" height="10.4" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="5.6" cy="6.4" r="1.3" fill="currentColor"/><path d="M2.5 12l3.4-3.4 2.4 2.4 2-2 3.2 3.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    wand: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M3 13L11 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M11.5 1.5v2M10.5 2.5h2M13.5 6v1.6M12.7 6.8h1.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    code: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5M9 3l-2 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    button: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><rect x="1.5" y="4" width="13" height="8" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10 7.2l1.5 1.6 1.5-1.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    panel: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5 6h6M5 8.5h6M5 11h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    brush: '<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M3 13c0-2 1.2-2.6 2.4-2.6.2-1.8 1.6-2.8 3-2.8l5-5.2.4.4-4.6 5.4c.2 1.6-1 2.8-2.6 2.8C6 11 6.2 13 3 13z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
};

function icon(name, className) {
    var node = el('span', className || '');

    node.innerHTML = ICONS[name] || '';
    return node;
}

Object.assign(BSelect.prototype, {
    _isDisabled: function (item) {
        if (!item) {
            return true;
        }

        if (typeof this.opts.isOptionDisabled === 'function') {
            return !!this.opts.isOptionDisabled(item);
        }

        return !!item[this.opts.disabledField];
    },

    /** true while the search text is shorter than searchMinChars */
    _minPending: function () {
        var n = this.opts.searchMinChars;

        return !!(this.opts.search && n > 0 && this.query.length > 0 && this.query.length < n);
    },

    _skeletonRows: function (count, className, rowClass) {
        var box = el('div', className);
        var i;
        var row;

        for (i = 0; i < count; i++) {
            row = el('div', rowClass || '');
            row.appendChild(el('span'));
            row.appendChild(el('i'));
            box.appendChild(row);
        }

        return box;
    },

    _buildPanel: function () {
        var self = this;
        var o = this.opts;
        var panel = el('div', 'bselect-panel');
        var header;
        var wrap;
        var tools;
        var box;
        var clearBtn;
        var holder;
        var pagination;

        panel.addEventListener('click', function (event) {
            event.stopPropagation();
        });
        if (o.arrow) {
            panel.appendChild(el('span', 'bselect-panel-anchor'));
        }

        if (o.search || o.sort || o.settings) {
            header = el('div', 'bselect-header');
        }

        if (o.search) {
            box = el('div', 'bselect-search');
            box.appendChild(icon('search', 'bselect-search-icon'));
            this.input = el('input');
            this.input.type = 'text';
            this.input.autocomplete = 'off';
            this.input.setAttribute('aria-label', o.searchPlaceholder);
            this.input.setAttribute('aria-controls', this.id + '-list');
            holder = el('span', 'bselect-search-placeholder');
            holder.appendChild(el('span', 'bselect-item-label', o.searchPlaceholder));
            clearBtn = el('button', 'bselect-search-clear');
            clearBtn.innerHTML = ICONS.close;
            clearBtn.type = 'button';
            clearBtn.style.display = 'none';
            clearBtn.setAttribute('aria-label', 'Clear search');
            box.appendChild(this.input);
            box.appendChild(holder);
            box.appendChild(clearBtn);
            header.appendChild(box);
            this.searchHolder = holder;
            this.searchClear = clearBtn;

            this.input.addEventListener('input', function () {
                self._onSearch(self.input.value);
                holder.style.display = self.input.value ? 'none' : '';
                clearBtn.style.display = self.input.value ? '' : 'none';
            });
            this.input.addEventListener('keydown', function (event) {
                self._key(event);
            });
            clearBtn.addEventListener('click', function (event) {
                event.preventDefault();
                self._clearSearch();
            });
        }

        if (header) {
            this._toolsBuild(header);
            panel.appendChild(header);
            panel.classList.add('bselect-panel-has-header');
        }

        if (o.info) {
            this.viewInfo = el('div', 'bselect-infobar bselect-info-' + (o.infoAlign || 'right') + (o.infoPlace === 'bottom' ? ' bselect-info-bottom' : ''));

            if (o.infoPlace !== 'bottom') {
                panel.appendChild(this.viewInfo);
            }
        }

        this.viewBar = this._buildViewBar();

        if (this.viewBar) {
            panel.appendChild(this.viewBar);
        }

        // states that replace the list: min-characters hint, skeleton, error
        this.minBox = el('div', 'bselect-empty');
        this.skeleton = this._skeletonRows(9, 'bselect-skeleton', 'bselect-skeleton-row');
        this.errorBox = el('div', 'bselect-error');
        this.errorText = el('span');
        var retry = el('button', '', this._t('retry'));
        retry.type = 'button';
        retry.addEventListener('click', function () {
            self._load(false);
        });
        this.errorBox.appendChild(this.errorText);
        this.errorBox.appendChild(retry);
        [this.minBox, this.skeleton, this.errorBox].forEach(function (node) {
            node.style.display = 'none';
            panel.appendChild(node);
        });

        wrap = el('div', 'bselect-list-wrap' + (o.load === 'scroll' ? ' bselect-list-lazy' : ''));
        this.wrap = wrap;

        this.resultsHeader = el('div', 'bselect-results-header');
        this.resultsHeader.style.display = 'none';
        wrap.appendChild(this.resultsHeader);

        this.list = el('ul', 'bselect-list');
        this.list.setAttribute('role', 'listbox');
        this.list.id = this.id + '-list';
        this.list.setAttribute('aria-multiselectable', !!o.multiple);

        // ONE click / hover handler for the whole list (rows carry data-i)
        this.list.addEventListener('click', function (event) {
            var li = event.target.closest ? event.target.closest('li[data-i]') : null;
            var item;

            if (!li || !self.list.contains(li)) {
                return;
            }

            if (li.classList.contains('bselect-create')) {
                self._create();
                return;
            }

            item = self._shown && self._shown[parseInt(li.getAttribute('data-i'), 10)];

            // the star toggles a favourite without picking the row
            if (item && event.target.closest && event.target.closest('.bselect-star')) {
                event.stopPropagation();
                self._toggleFav(item);
                return;
            }

            if (item) {
                self._choose(item);
            }
        });
        this.list.addEventListener('mouseover', function (event) {
            var t = event.target.closest ? event.target.closest('.bselect-item-text') : null;

            if (t && t !== self._mq) {
                self._mqStop();
                self._mq = t;
                self._mqStart(t);
            }
        });
        this.list.addEventListener('mouseout', function (event) {
            var t = event.target.closest ? event.target.closest('.bselect-item-text') : null;

            if (t && (!event.relatedTarget || !t.contains(event.relatedTarget))) {
                self._mqStop();
            }
        });
        wrap.appendChild(this.list);

        // pagination: scroll hint, "show more" button, end marker
        this.hint = el('div', 'bselect-lazy-hint bselect-lazy-hint-sticky');
        this.hint.setAttribute('aria-live', 'polite');
        pagination = el('span', 'bselect-pagination-row bselect-pagination-status');
        pagination.appendChild(el('span', 'bselect-pagination-cue')).appendChild(el('i'));
        var hintLabel = el('span', 'bselect-pagination-label', 'Scroll to continue ');
        hintLabel.appendChild(el('small', '', 'More results below'));
        pagination.appendChild(hintLabel);
        this.hint.appendChild(pagination);
        this.hint.style.display = 'none';
        wrap.appendChild(this.hint);

        this.moreWrap = el('div', 'bselect-load-more');
        this.moreBtn = el('button', 'bselect-pagination-row bselect-pagination-status bselect-pagination-action');
        this.moreBtn.type = 'button';
        this.moreLabel = el('span', 'bselect-pagination-label');
        this.moreBtn.appendChild(this.moreLabel);
        this.morePulse = el('span', 'bselect-pagination-pulse');
        this.morePulse.appendChild(el('i'));
        this.morePulse.appendChild(el('i'));
        this.morePulse.appendChild(el('i'));
        this.moreArrow = el('span', 'bselect-pagination-arrow');
        this.moreArrow.appendChild(el('i'));
        this.moreBtn.appendChild(this.morePulse);
        this.moreBtn.appendChild(this.moreArrow);
        this.moreBtn.addEventListener('click', function () {
            self._more();
        });
        this.moreWrap.appendChild(this.moreBtn);
        this.moreWrap.style.display = 'none';
        wrap.appendChild(this.moreWrap);

        this.endBox = el('div', 'bselect-pagination-end');
        this.endBox.setAttribute('role', 'status');
        this.endBox.appendChild(el('span', 'bselect-pagination-end-icon')).appendChild(el('i'));
        var endCopy = el('span', 'bselect-pagination-end-copy');
        endCopy.appendChild(el('strong', '', 'All results loaded'));
        endCopy.appendChild(el('small', '', 'You’ve reached the end'));
        this.endBox.appendChild(endCopy);
        this.endBox.style.display = 'none';
        wrap.appendChild(this.endBox);

        panel.appendChild(wrap);
        this.lazyHintVisible = true;

        if (this.viewInfo && o.infoPlace === 'bottom') {
            panel.appendChild(this.viewInfo);
        }

        if (this._commitOn()) {
            this.footer = this._buildFooter();
            panel.appendChild(this.footer);
        }

        wrap.addEventListener('scroll', function () {
            var top = wrap.scrollTop;
            var down = top > (wrap._last || 0);
            var up = top < (wrap._last || 0);
            var nearEnd = top + wrap.clientHeight >= wrap.scrollHeight - 60;

            wrap._last = top;

            if (self._virtual) {
                self._virtualScroll();
            }

            // old behaviour: the "scroll to continue" hint hides while scrolling down and returns when scrolling up
            if (o.load === 'scroll' && o.lazyHint !== false) {
                if (down && self.lazyHintVisible) {
                    self.lazyHintVisible = false;
                    self.hint.style.display = 'none';
                } else if (up && !self.lazyHintVisible && self._hasMoreRows()) {
                    self.lazyHintVisible = true;
                    self.hint.style.display = '';
                }
            }

            if (nearEnd && o.load !== 'button') {
                self._more();
            }
        });

        this._rowH = 0; // measured again for this panel
        this.panel = panel;
        this._applyPanelAppearance();
        this._resizeInit(panel);
    },

    /** multiple select only: [All | Selected (n)] tabs and the action of the tab (Select all / Clear all) */
    _buildViewBar: function () {
        var self = this;
        var o = this.opts;
        var bar;
        var tabs;

        if (!o.multiple || o.viewTabs === false) {
            return null;
        }

        bar = el('div', 'bselect-viewbar');
        tabs = el('div', 'bselect-viewtabs');
        tabs.setAttribute('role', 'tablist');
        this.viewButtons = {};

        ['all', 'selected'].forEach(function (id) {
            var button = el('button', 'bselect-viewtab');

            button.type = 'button';
            button.setAttribute('role', 'tab');
            button.addEventListener('click', function () {
                if (self.view === id) {
                    return;
                }

                self.view = id;
                self.active = -1;

                if (self.wrap) {
                    self.wrap.scrollTop = 0;
                }

                self._render();
            });
            self.viewButtons[id] = button;
            tabs.appendChild(button);
        });

        this.allBtn = el('button', 'bselect-viewaction');
        this.allBtn.type = 'button';
        this.allBtn.addEventListener('click', function () {
            if (self.view === 'selected') {
                self.clear();
            } else {
                self._toggleAll();
            }
        });
        bar.appendChild(tabs);
        bar.appendChild(this.allBtn);
        return bar;
    },

    /** keeps the tabs, the tab action and the count line current (called after every render) */
    _updateViewBar: function (visible, shown) {
        var self = this;
        var view = this.view || 'all';
        var n = this.selected.length;
        var all;
        var text = '';

        if (this.viewBar) {
            this.viewButtons.all.textContent = this._t('all');
            this.viewButtons.selected.textContent = this._t('selected') + (n ? ' (' + n + ')' : '');
            Object.keys(this.viewButtons).forEach(function (id) {
                self.viewButtons[id].classList.toggle('bselect-viewtab-on', id === view);
                self.viewButtons[id].setAttribute('aria-selected', id === view);
            });

            if (view === 'selected') {
                this.allBtn.textContent = this._t('clearAll');
                this.allBtn.classList.add('bselect-viewaction-danger');
                this.allBtn.style.display = n ? '' : 'none';
            } else {
                all =
                    visible.length &&
                    visible.every(function (item) {
                        return self._isSel(item);
                    });
                this.allBtn.textContent = this._t(all ? 'unselectAll' : 'selectAll');
                this.allBtn.classList.remove('bselect-viewaction-danger');
                this.allBtn.style.display = this.opts.selectAll === false || !visible.length ? 'none' : '';
            }
        }

        if (this.viewInfo) {
            if (visible.length) {
                text = this._t(this._isServer() && this._hasMoreRows() ? 'infoMore' : 'info', {
                    from: 1,
                    to: Math.min(shown.length, visible.length),
                    total: this.total && this._isServer() && view === 'all' ? this.total : visible.length,
                });
            }

            this.viewInfo.textContent = text;
            this.viewInfo.style.display = visible.length ? '' : 'none';
        }
    },

    /** Apply / Cancel bar (commit mode) */
    _buildFooter: function () {
        var self = this;
        var bar = el('div', 'bselect-footer');
        var cancel = el('button', 'bselect-footer-cancel', this._t('cancel'));
        var apply = el('button', 'bselect-footer-apply', this._t('apply'));

        this.footerCount = el('span', 'bselect-footer-count');
        cancel.type = apply.type = 'button';
        cancel.addEventListener('click', function () {
            self._cancel();
        });
        apply.addEventListener('click', function () {
            self._apply();
        });
        bar.appendChild(this.footerCount);
        bar.appendChild(cancel);
        bar.appendChild(apply);
        return bar;
    },

    _clearSearch: function () {
        if (this.input) {
            this.input.value = '';
            this.input.focus();
        }

        if (this.searchHolder) {
            this.searchHolder.style.display = '';
            this.searchClear.style.display = 'none';
        }

        this._onSearch('');
    },

    _emptyState: function (iconName, title, hint, action) {
        var self = this;
        var li = el('li', 'bselect-empty bselect-search-empty');
        var btn;

        li.setAttribute('role', 'status');
        li.appendChild(icon(iconName, 'bselect-search-empty-icon'));
        li.appendChild(el('strong', '', title));
        li.appendChild(el('small', '', hint));

        if (action) {
            btn = el('button', '', 'Clear search');
            btn.type = 'button';
            btn.addEventListener('click', function (event) {
                event.preventDefault();
                self._clearSearch();
            });
            li.appendChild(btn);
        }

        return li;
    },

    _render: function () {
        var self = this;
        var o = this.opts;
        var n = this.selected.length;
        var visible;
        var shown;
        var frag;
        var group;
        var current;
        var li;
        var minPending;
        var showList;
        var moreBusy;
        var total;
        var paged = o.load === 'scroll' || o.load === 'button';

        this._renderTrigger();
        this.trigger.setAttribute('aria-expanded', !!this.isOpen);

        if (!this.isOpen || !this.panel) {
            return;
        }

        minPending = this._minPending();
        visible = minPending ? [] : this._visible();
        this._virtual = !minPending && this._useVirtual(visible.length);
        shown = this._virtual || this._serverPaged() || (this.view && this.view !== 'all') ? visible : visible.slice(0, this._limit || this._firstLimit());
        this._shown = shown;
        this._total = this._hasMoreRows() ? 0 : visible.length; // aria-setsize only when the whole list is known
        showList = !this.loading && !this.error && !minPending;

        this.skeleton.style.display = this.loading ? '' : 'none';
        this.errorBox.style.display = this.error && !this.loading ? '' : 'none';
        this.errorText.textContent = (this.error && this.error.message) || 'Unable to load data.';
        this.minBox.style.display = minPending && !this.loading ? '' : 'none';
        this.minBox.textContent = 'Enter at least ' + o.searchMinChars + ' characters';
        this.wrap.style.display = showList ? '' : 'none';

        if (!showList) {
            return;
        }

        frag = document.createDocumentFragment();

        if (this._virtual) {
            frag.appendChild(this._virtualFragment(visible));
        }

        (this._virtual ? [] : shown).forEach(function (item, index) {
            current = o.groupField ? item[o.groupField] : null;

            if (current && current !== group) {
                frag.appendChild(el('li', 'bselect-group', String(current)));
            }

            group = current;

            // favourites / recent / all headers
            if (self._sections) {
                if (index === 0 && self._sections.fav) {
                    frag.appendChild(el('li', 'bselect-group', 'Favourites'));
                } else if (index === self._sections.fav && self._sections.rec) {
                    frag.appendChild(el('li', 'bselect-group', 'Recent'));
                } else if (index === self._sections.fav + self._sections.rec) {
                    frag.appendChild(el('li', 'bselect-group', 'All'));
                }
            }

            frag.appendChild(self._renderItem(item, index, self._isSel(item)));
        });

        if (this._canCreate()) {
            li = el('li', 'bselect-item bselect-create' + (this.active === visible.length ? ' bselect-focused' : ''));
            li.setAttribute('data-i', visible.length);
            li.appendChild(el('span', 'bselect-control', '+'));
            li.appendChild(el('span', 'bselect-item-text', 'Create "' + this.query + '"'));
            frag.appendChild(li);
        }

        if (!shown.length && !this._canCreate()) {
            frag.appendChild(
                this.query
                    ? this._emptyState('search', 'No matches found', 'Try a different keyword', true)
                    : this.view === 'selected'
                      ? this._emptyState('inbox', this._t('emptySelected'), this._t('emptySelectedHint'))
                      : this.view === 'recent'
                        ? this._emptyState('inbox', this._t('emptyRecent'), this._t('emptyRecentHint'))
                        : this.view === 'favorites'
                          ? this._emptyState('inbox', this._t('emptyFav'), this._t('emptyFavHint'))
                    : this._waitingParent
                      ? this._emptyState('inbox', o.dependsMessage || 'Select the parent field first', '')
                      : this._emptyState('inbox', 'No data available', 'There are no records available to display.')
            );
        }

        if (this.loadingMore) {
            li = el('li', 'bselect-more-skeleton');
            li.appendChild(this._skeletonRows(3, '', ''));
            frag.appendChild(li);
        }

        this.list.innerHTML = '';
        this.list.appendChild(frag);

        if (this._virtual) {
            this._measureRows();
        }

        this._updateViewBar(visible, shown);

        if (this.footerCount) {
            this.footerCount.textContent = this._dirty ? this._t('pending') : '';
        }

        // "Results for ..." header
        if (this.query) {
            total = this._serverPaged() && this.total !== undefined && this.total !== null ? Number(this.total) : visible.length;
            this.resultsHeader.innerHTML = '';
            var query = el('span', 'bselect-results-query');
            query.appendChild(icon('search'));
            query.appendChild(el('span', '', 'Results for'));
            query.appendChild(el('strong', '', '“' + this.query + '”'));
            var count = el('span', 'bselect-results-count');
            count.appendChild(el('strong', '', total + (this.hasMore && this.total === undefined && this._serverPaged() ? '+' : '')));
            count.appendChild(el('small', '', 'total'));
            this.resultsHeader.appendChild(query);
            this.resultsHeader.appendChild(count);
            this.resultsHeader.style.display = '';
        } else {
            this.resultsHeader.style.display = 'none';
        }


        // pagination footer
        moreBusy = this.loadingMore;
        this.hint.style.display = o.load === 'scroll' && o.lazyHint !== false && this._hasMoreRows() && this.lazyHintVisible ? '' : 'none';
        this.moreWrap.style.display = o.load === 'button' && (this._hasMoreRows() || moreBusy) ? '' : 'none';
        this.moreBtn.disabled = !!moreBusy;
        this.moreLabel.innerHTML = '';
        this.moreLabel.appendChild(document.createTextNode(moreBusy ? 'Loading results...' : 'Show next results'));
        this.moreLabel.appendChild(el('small', '', moreBusy ? 'Almost ready' : 'Continue browsing'));
        this.morePulse.style.display = moreBusy ? '' : 'none';
        this.moreArrow.style.display = moreBusy ? 'none' : '';
        // screen readers: how many results, or why there are none
        this._announce(
            this.loading
                ? 'Loading'
                : this.error
                  ? 'Unable to load data'
                  : !visible.length
                    ? 'No results'
                    : visible.length + (this._hasMoreRows() ? '+' : '') + (visible.length === 1 && !this._hasMoreRows() ? ' result' : ' results') + (this.query ? ' for ' + this.query : '')
        );
        this.endBox.style.display = paged && !this._hasMoreRows() && shown.length >= o.pageSize && !this.loading && !moreBusy ? '' : 'none';
    },
});
