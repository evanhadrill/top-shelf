// Top Shelf service worker: app shell works offline; cover art and fonts are cached as you see them.
// Bump VERSION whenever you change index.html so phones pick up the new copy.
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`, RUNTIME = 'runtime-v1';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App pages: network first so updates show up, cached copy when offline
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  // Cover art and fonts: cache first
  const isAsset = req.destination === 'image' || req.destination === 'font' || req.destination === 'style' ||
    /mzstatic\.com|image\.tmdb\.org|covers\.openlibrary\.org|fonts\.(googleapis|gstatic)\.com/.test(url.host);
  if (isAsset) {
    e.respondWith(caches.open(RUNTIME).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }))));
  }
  // Search APIs: always live (default network handling)
});
