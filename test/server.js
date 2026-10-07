// node test/server.js  -> http://localhost:8765/  (static files + mock API for server-mode tests)
const http = require('http'), fs = require('fs'), path = require('path'), { URL } = require('url');
const root = path.join(__dirname, '..');
const makeItems = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, name: 'Item ' + (i + 1), group: i % 2 ? 'Odd' : 'Even', sub: 'code-' + (1000 + i) }));
const ITEMS = makeItems(95);
const DEPTS = [{ id: 1, name: 'Surgery' }, { id: 2, name: 'Medicine' }];
const WARDS = { 1: [{ id: 11, name: 'Surgery Ward 1' }, { id: 12, name: 'Surgery Ward 2' }], 2: [{ id: 21, name: 'Medicine Ward 1' }] };
const log = [];
function body(req) { return new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => r(d)); }); }
http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname.startsWith('/api/')) {
        const p = Object.fromEntries(new URLSearchParams(req.method === 'POST' ? await body(req) : u.search));
        log.push({ path: u.pathname, method: req.method, params: p });
        let out;
        if (u.pathname === '/api/log') out = log;
        else if (u.pathname === '/api/depts') out = +p.n ? Array.from({ length: +p.n }, (_, i) => ({ id: i + 1, name: DEPTS[i] ? DEPTS[i].name : 'Department ' + (i + 1) })) : DEPTS;
        else if (u.pathname === '/api/wards') out = +p.n ? Array.from({ length: +p.n }, (_, i) => ({ id: p.parent * 1000 + i + 1, name: (WARDS[p.parent] && WARDS[p.parent][i] ? WARDS[p.parent][i].name : 'Dept ' + p.parent + ' Ward ' + (i + 1)) })) : WARDS[p.parent] || [];
        else if (u.pathname === '/api/resolve') out = { items: ITEMS.filter((i) => String(p.ids).split(',').includes(String(i.id))) };
        else if (u.pathname === '/api/fail') { res.writeHead(500); return res.end('x'); }
        else {
            const all = +p.total ? makeItems(+p.total) : ITEMS;
            let list = all.filter((i) => !p.search || i.name.toLowerCase().includes(p.search.toLowerCase()));
            if (p.sortField) list = list.slice().sort((a, b) => (a[p.sortField] > b[p.sortField] ? 1 : -1) * (p.sortDirection === 'desc' ? -1 : 1));
            if (p.page) { const s = (p.page - 1) * p.pageSize; out = { items: list.slice(s, s + +p.pageSize), total: list.length }; }
            else out = { items: list };
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return setTimeout(() => res.end(JSON.stringify(out)), u.pathname === '/api/items' ? 250 : 0);
    }
    const rel = decodeURIComponent(u.pathname === '/' ? '/demo.html' : u.pathname);
    // /old/* = the existing AngularJS version in common/dropdown, for side-by-side comparison
    const f = rel.startsWith('/old/') ? path.join('D:/xampp/htdocs/dev/common/dropdown', rel.slice(5)) : path.join(root, rel);
    fs.readFile(f, (e, d) => {
        if (e) { res.writeHead(404); return res.end('nf'); }
        res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html' });
        res.end(d);
    });
}).listen(8765, () => console.log('http://localhost:8765/'));
