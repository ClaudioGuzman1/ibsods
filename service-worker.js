const CACHE = "offline-v3-fast";
const RUNTIME_CACHE = "runtime-v3";

const basePath = self.location.pathname.replace(/\/[^\/]*$/, '') || '/';

const CRITICAL_ASSETS = [
  basePath,
  basePath + 'index.html',
  basePath + 'manifest.json',
  basePath + 'favicon.ico',
];

// Cachear agresivamente en install
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(CRITICAL_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(names => 
      Promise.all(names.map(name => 
        !name.startsWith('offline-v') && !name.startsWith('runtime-v') 
          ? caches.delete(name) 
          : Promise.resolve()
      ))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  
  // ⚡ ESTRATEGIA 1: Cache INMEDIATO para assets estáticos
  if (/\.(js|css|png|jpg|jpeg|gif|ico|woff2|woff)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        // Devolver caché al instante
        if (cached) return cached;
        
        // En background, actualizar caché sin bloquear
        return fetch(e.request)
          .then(response => {
            if (!response || response.status !== 200) return response;
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(e.request, clone));
            return response;
          })
          .catch(() => cached || new Response('Offline'));
      })
    );
    return;
  }

  // ⚡ ESTRATEGIA 2: Network timeout (esperar máx 3 segundos)
  e.respondWith(
    Promise.race([
      fetch(e.request).then(r => {
        if (r.ok) {
          caches.open(RUNTIME_CACHE).then(c => c.put(e.request, r.clone()));
        }
        return r;
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000)
      )
    ])
    .catch(() => 
      caches.match(e.request)
        .then(cached => cached || caches.match(basePath + 'index.html'))
    )
  );
});
