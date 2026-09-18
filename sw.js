// WRSTL Legends — service worker.
// Keeps the whole game on the device so it works with no signal, and quietly
// picks up new versions in the background.
const VERSION = 'wrstl-abdf41e7ab';
const CORE = 'core-' + VERSION;
const FONTS = 'fonts-' + VERSION;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './intro.mp4',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-64.png',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CORE);
    // one at a time so a single 404 can't fail the whole install
    await Promise.all(SHELL.map(u => c.add(new Request(u, {cache:'reload'})).catch(()=>{})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CORE && k !== FONTS).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // never touch the tracker's POSTs
  const url = new URL(req.url);

  // the tracker and the owner dashboard always go to the network
  if (url.hostname.endsWith('script.google.com')) return;

  // page loads: serve the cached game instantly, refresh it in the background
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cached = await caches.match('./index.html');
      const fresh = fetch(req).then(r => {
        if (r && r.ok) caches.open(CORE).then(c => c.put('./index.html', r.clone()));
        return r;
      }).catch(() => null);
      return cached || (await fresh) || new Response('<h1>WRSTL Legends is offline</h1><p>Open it once with a connection and it will work offline after that.</p>', {headers:{'Content-Type':'text/html'}});
    })());
    return;
  }

  // fonts: keep a copy so the game looks right offline too
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith((async () => {
      const c = await caches.open(FONTS);
      const hit = await c.match(req);
      if (hit) return hit;
      try { const r = await fetch(req); if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }
      catch (err) { return new Response('', {status: 504}); }
    })());
    return;
  }

  // everything else on our own site: cache first, then network.
  // Keyed without the query string so ?utm=… style links don't pile up copies.
  if (url.origin === self.location.origin) {
    const key = new Request(url.origin + url.pathname, {headers: req.headers});
    const range = req.headers.get('range');
    e.respondWith((async () => {
      const hit = await caches.match(key);
      // Video players ask for byte ranges. Safari in particular insists on a 206,
      // so serve the slice ourselves rather than handing back the whole file.
      if (hit && range) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
        if (m) {
          const buf = await hit.arrayBuffer();
          const total = buf.byteLength;
          let start = m[1] === '' ? total - Number(m[2]) : Number(m[1]);
          let end = (m[1] === '' || m[2] === '') ? total - 1 : Number(m[2]);
          start = Math.max(0, Math.min(start, total - 1));
          end = Math.max(start, Math.min(end, total - 1));
          return new Response(buf.slice(start, end + 1), {
            status: 206,
            statusText: 'Partial Content',
            headers: {
              'Content-Type': hit.headers.get('Content-Type') || 'application/octet-stream',
              'Content-Length': String(end - start + 1),
              'Content-Range': `bytes ${start}-${end}/${total}`,
              'Accept-Ranges': 'bytes',
            },
          });
        }
      }
      if (hit) return hit;
      try {
        const r = await fetch(req);
        // only a whole file is worth storing — never a 206 slice under the full key
        if (r && r.status === 200) { const c = await caches.open(CORE); c.put(key, r.clone()); }
        return r;
      } catch (err) {
        return new Response('', {status: 504});
      }
    })());
  }
});
