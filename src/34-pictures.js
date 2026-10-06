/* Pictures for options: custom image / emoji / icon per option, or a default avatar (initials + stable random colour) */
function hashHue(text) {
    var h = 0;
    var i;

    for (i = 0; i < text.length; i++) {
        h = (h * 31 + text.charCodeAt(i)) | 0;
    }

    return Math.abs(h) % 360;
}

function initialsOf(text) {
    var words = String(text || '').trim().split(/\s+/).filter(Boolean);

    if (!words.length) {
        return '?';
    }

    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }

    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

var IMG_RE = /^(https?:|\/|\.\/|\.\.\/|data:image|blob:)/i;
var CLASS_RE = /^[a-z][\w-]*(\s+[a-z][\w-]*)+$|^(fa|fas|far|fab|bi|icon|mdi)[-\s]/i;
var EMOJI_RE = null;

try {
    EMOJI_RE = new RegExp('\\p{Extended_Pictographic}', 'u');
} catch (e) {
    EMOJI_RE = /[←-⯿\ud83c-\ud83e][\s\S]?/;
}

Object.assign(BSelect.prototype, {
    /** images: 'auto' (default) = on when imageField / iconField / imageFor / avatar is configured */
    _showImages: function () {
        var o = this.opts;

        if (o.images === false) {
            return false;
        }

        return o.images === true || !!(o.imageField || o.iconField || o.imageFor || o.avatar !== 'none' || (o.imageMap && Object.keys(o.imageMap).length));
    },

    _avatarColor: function (item) {
        var o = this.opts;
        var mode = o.avatarColor;
        var fixed;

        if (o.colorField && item && item[o.colorField]) {
            return String(item[o.colorField]);
        }

        if (typeof mode === 'function') {
            return mode(item);
        }

        if (mode === 'accent') {
            return 'var(--bselect-color)';
        }

        if (mode && mode !== 'random') {
            return String(mode);
        }

        fixed = hashHue(this._lbl(item));
        return 'hsl(' + fixed + ' 55% 42%)';
    },

    /** What to show for an option: { kind: 'img'|'class'|'emoji'|'text'|'initials', value, color } or null */
    _pictureFor: function (item) {
        var o = this.opts;
        var custom;
        var avatar;

        if (!item || !this._showImages()) {
            return null;
        }

        custom = o.imageMap && o.imageMap[this._val(item)];

        if (custom === undefined || custom === null || custom === '') {
            custom = o.imageFor ? o.imageFor(item) : (o.imageField && item[o.imageField]) || (o.iconField && item[o.iconField]);
        }

        if (custom !== undefined && custom !== null && custom !== '') {
            custom = String(custom);

            if (IMG_RE.test(custom)) {
                return { kind: 'img', value: custom };
            }

            if (CLASS_RE.test(custom)) {
                return { kind: 'class', value: custom };
            }

            return { kind: EMOJI_RE && EMOJI_RE.test(custom) ? 'emoji' : 'text', value: custom };
        }

        avatar = o.avatar === 'none' && o.images === true ? 'initials' : o.avatar;

        if (avatar === 'initials') {
            return { kind: 'initials', value: initialsOf(this._lbl(item)), color: this._avatarColor(item) };
        }

        if (avatar === 'icon') {
            return { kind: 'person', value: '', color: this._avatarColor(item) };
        }

        return null;
    },

    /** Fill `node` with the picture of `item` (hides the node when there is none). `base` = its fixed class. */
    _fillPicture: function (node, item, base) {
        var p = this._pictureFor(item);
        var img;

        node.innerHTML = '';
        node.style.background = '';
        node.className = base + (p ? ' bselect-pic bselect-pic-' + p.kind : '');
        node.style.display = p ? '' : 'none';

        if (!p) {
            return false;
        }

        if (p.kind === 'img') {
            img = Object.assign(el('img', 'bselect-pic-img-el'), { alt: '', loading: 'lazy' });

            // a broken image falls back to initials instead of a broken-image icon
            img.addEventListener('error', function () {
                var self = this;
                var initials = { kind: 'initials', value: initialsOf(self._lbl(item)), color: self._avatarColor(item) };

                node.innerHTML = '';
                node.className = base + ' bselect-pic bselect-pic-initials';
                node.textContent = initials.value;
                node.style.background = initials.color;
            }.bind(this));
            img.src = p.value;
            node.appendChild(img);
        } else if (p.kind === 'class') {
            node.appendChild(el('i', p.value));
        } else if (p.kind === 'person') {
            node.style.background = p.color;
            node.innerHTML = '<svg viewBox="0 0 24 24" width="62%" height="62%" aria-hidden="true"><circle cx="12" cy="8.5" r="4" fill="currentColor"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="currentColor"/></svg>';
        } else {
            node.textContent = p.value;

            if (p.color) {
                node.style.background = p.color;
            }
        }

        return true;
    },
});
