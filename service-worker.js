const CACHE = "offline-v2";

// Detectar la ruta base donde está alojada la app
const basePath = self.location.pathname.replace(/\/[^\/]*$/, '') || '/';

const OFFLINE_ASSETS = [
  basePath,
  basePath + 'index.html',
  basePath + 'manifest.json',
  basePath + 'styles.css',
  basePath + 'icon-192.png',
  basePath + 'icon-256.png',
  basePath + 'icon-512.png',
  basePath + 'favicon.ico',
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(OFFLINE_ASSETS).catch(error => {
        console.warn('Error cacheando assets:', error);
        // Cachear solo los que se puedan, no fallar si uno no existe
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  // No cachear requests POST, PUT, DELETE, etc.
  if (e.request.method !== 'GET') {
    return;
  }

  // Network first para mejor compatibilidad con datos móviles
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Clonar la respuesta para guardarla en caché
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        
        const responseToCache = response.clone();
        caches.open(CACHE).then(cache => {
          cache.put(e.request, responseToCache);
        });
        
        return response;
      })
      .catch(() => {
        // Si falla la red, usar caché
        return caches.match(e.request)
          .then(response => {
            return response || caches.match(basePath + 'index.html');
          });
      })
  );
});
