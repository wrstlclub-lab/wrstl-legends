// WRSTL Legends — service worker.
// Keeps the whole game on the device so it works with no signal, and quietly
// picks up new versions in the background.
const VERSION = 'wrstl-eca4ce336f';
const CORE = 'core-' + VERSION;
const FONTS = 'fonts-' + VERSION;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
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
    e.respondWith((async () => {
      const hit = await caches.match(key);
      if (hit) return hit;
      try {
        const r = await fetch(req);
        if (r && r.ok) { const c = await caches.open(CORE); c.put(key, r.clone()); }
        return r;
      } catch (err) {
        return new Response('', {status: 504});
      }
    })());
  }
});
