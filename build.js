// node build.js  ->  dist/bselect.bundle.js, dist/bselect.bundle.min.js, dist/bselect.css, dist/bselect.min.css
// The minified files need terser (npm install terser); without it only the readable files are written.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const root = __dirname;
const srcDir = path.join(root, 'src');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version || '0.0.0';
const parts = ['00-head.js', '05-theme.js', '15-events.js', '10-select.js', '20-data.js', '30-panel.js', '32-panel-ui.js', '34-pictures.js', '35-render.js', '38-polish.js', '40-position.js', '60-settings.js', '62-settings-ui.js', '64-export.js', '70-popover.js', '72-memory.js', '85-features.js', '99-index.js'];
const missing = parts.filter((f) => !fs.existsSync(path.join(srcDir, f)));

if (missing.length) {
    throw new Error('Missing source file(s): ' + missing.join(', '));
}

const stamp = new Date().toISOString().slice(0, 10);
const banner = '/* BSelect v' + version + ' - built ' + stamp + ' - do not edit, edit src/ and run node build.js */\n';
const out = (banner + parts.map((f) => fs.readFileSync(path.join(srcDir, f), 'utf8')).join('\n')).split('__BSELECT_VERSION__').join(version);
const cssIn = fs.readFileSync(path.join(root, 'skin.css'), 'utf8');
const kb = (text) => (Buffer.byteLength(text) / 1024).toFixed(1) + ' KB (' + (zlib.gzipSync(text).length / 1024).toFixed(1) + ' KB gzip)';

// conservative css minifier: comments, whitespace around braces / semicolons
const cssMin = '/* BSelect v' + version + ' */' + cssIn.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};])\s*/g, '$1').replace(/;}/g, '}').trim();

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'bselect.bundle.js'), out);
fs.writeFileSync(path.join(root, 'dist', 'bselect.css'), cssIn);
fs.writeFileSync(path.join(root, 'dist', 'bselect.min.css'), cssMin);
if (fs.existsSync(path.join(root, 'guide.html'))) {
    fs.writeFileSync(path.join(root, 'dist', 'guide.html'), fs.readFileSync(path.join(root, 'guide.html'), 'utf8').split('__BSELECT_VERSION__').join(version));
}
console.log('v' + version, 'dist/bselect.bundle.js', kb(out));
console.log('v' + version, 'dist/bselect.min.css   ', kb(cssMin));

try {
    const terser = require('terser');

    terser.minify(out, { compress: { passes: 2 }, mangle: true, format: { comments: /^! |BSelect v/ } }).then((result) => {
        if (result.error) {
            throw result.error;
        }

        fs.writeFileSync(path.join(root, 'dist', 'bselect.bundle.min.js'), result.code);
        console.log('v' + version, 'dist/bselect.bundle.min.js', kb(result.code));
    });
} catch (e) {
    console.log('(terser not installed - skipped bselect.bundle.min.js: run  npm install terser )');
}
