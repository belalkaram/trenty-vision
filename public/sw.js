const CACHE_NAME = 'trenty-vision-crm-shell-v1';
const STATIC_ASSETS = [
  '/',
  '/public/css/app.css',
  '/public/js/app.js',
  '/public/manifest.json',
  '/public/icons/icon-192.png',
  '/public/icons/icon-512.png',
  '/login'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn('[SW] Failed to cache:', asset, e);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first for dynamic API, cache-first only for safe static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API or authenticated sensitive requests
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).catch(() => {
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
        })
      );
    })
  );
});
