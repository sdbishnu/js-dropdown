/*
 * Demo helper: a Light / Dark / Auto switch for the whole page and every bselect on it.
 * Include it right after bselect.bundle.js (before the dropdowns are created):
 *     <link rel="stylesheet" href="demo-theme.css">
 *     <script src="dist/bselect.bundle.js"></script>
 *     <script src="demo-theme.js"></script>
 */
(function (window, document) {
    'use strict';

    var KEY = 'bselect-demo-mode';
    var query = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    var buttons = {};
    var mode = 'light'; // the demos start light; Auto follows the operating system

    try {
        mode = localStorage.getItem(KEY) || 'light';
    } catch (e) {
        mode = 'light';
    }

    function effective(value) {
        return value === 'auto' ? (query && query.matches ? 'dark' : 'light') : value;
    }

    function apply(value, save) {
        mode = value;
        document.documentElement.setAttribute('data-demo-theme', effective(value));

        if (window.bselect) {
            window.bselect.setMode(value);
        }

        Object.keys(buttons).forEach(function (name) {
            buttons[name].classList.toggle('on', name === value);
            buttons[name].setAttribute('aria-pressed', name === value);
        });

        if (save) {
            try {
                localStorage.setItem(KEY, value);
            } catch (e) {
                /* storage blocked */
            }
        }
    }

    // before any dropdown is built: page theme + the global default for bselect
    document.documentElement.setAttribute('data-demo-theme', effective(mode));

    if (window.bselect) {
        window.bselect.defaults({ mode: mode });
    }

    function build() {
        var bar = document.createElement('div');

        bar.className = 'demo-theme-switch';
        bar.setAttribute('role', 'group');
        bar.setAttribute('aria-label', 'Colour mode');

        [['light', '☀ Light'], ['dark', '☾ Dark'], ['auto', 'Auto']].forEach(function (item) {
            var button = document.createElement('button');

            button.type = 'button';
            button.textContent = item[1];
            button.addEventListener('click', function () {
                apply(item[0], true);
            });
            buttons[item[0]] = button;
            bar.appendChild(button);
        });
        document.body.appendChild(bar);
        apply(mode, false);
    }

    if (query && query.addEventListener) {
        query.addEventListener('change', function () {
            if (mode === 'auto') {
                apply('auto', false);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})(window, document);
