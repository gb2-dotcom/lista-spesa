const CACHE_NAME = 'lista-spesa-v15';
const ASSET_DA_CACHARE = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/registra-sw.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSET_DA_CACHARE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomiCache) =>
      Promise.all(
        nomiCache
          .filter((nome) => nome !== CACHE_NAME)
          .map((nome) => caches.delete(nome))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((risposta) => {
      if (risposta) {
        return risposta;
      }

      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('index.html');
        }
        return Response.error();
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SALTA_ATTESA') {
    self.skipWaiting();
  }
});