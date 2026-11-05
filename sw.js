const CACHE = 'sport-r26.1.0'; // cambiare a ogni pubblicazione: è ciò che fa comparire il banner
const PLAN = 'allenamenti.json';
const FILES = ['./', 'index.html', 'style.css', 'logic.js', 'app.js', PLAN, 'manifest.webmanifest', 'vendor/bricolage.woff2', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Il piano arriva dalla rete quando c'è, così cambiarlo non richiede una nuova versione dell'app.
  if (new URL(e.request.url).pathname.endsWith('/' + PLAN)) {
    e.respondWith(caches.open(CACHE).then(c => fetch(e.request).then(r => { if (r.ok) c.put(PLAN, r.clone()); return r; }).catch(() => c.match(PLAN))));
    return;
  }
  e.respondWith(caches.open(CACHE).then(c => c.match(e.request, { ignoreSearch: true })).then(hit => hit || fetch(e.request)));
});
