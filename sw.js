// The cache name comes from the version in index.html (APP_VERSION),
// passed in when the page registers "sw.js?v=<version>".
// So you only bump the version in ONE place: index.html.
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = 'uld-tools-' + VERSION;

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './qrcode.min.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('uld-tools-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only handle our own files; Google Apps Script links go straight to the network.
  if (url.origin !== self.location.origin) return;

  // Page: network-first so link changes show up immediately; cached copy when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Version check from the page: always go to the network.
  if (req.cache === 'no-store') return;

  // Static assets: cache-first.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
