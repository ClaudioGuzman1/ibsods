// ============================================================
// SERVICE WORKER - Soy IDC
// GitHub Pages / PWA
// ============================================================

const CACHE_NAME = 'soy-idc-v3';

// ------------------------------------------------------------
// Obtener correctamente la carpeta de la aplicación
// ------------------------------------------------------------

// Ejemplo GitHub Pages:
// https://claudioguzman1.github.io/ibsods/
//                      ^^^^^^^
// basePath = /ibsods/

const BASE_PATH = new URL('./', self.registration.scope).pathname;

// ------------------------------------------------------------
// Archivos propios de la aplicación que sí queremos cachear
// ------------------------------------------------------------

const APP_SHELL = [
    BASE_PATH,
    BASE_PATH + 'index.html',
    BASE_PATH + 'styles.css',
    BASE_PATH + 'manifest.json',
    BASE_PATH + 'icon-192.png',
    BASE_PATH + 'icon-256.png',
    BASE_PATH + 'icon-512.png',
    BASE_PATH + 'favicon.ico'
];

// ============================================================
// INSTALL
// ============================================================

self.addEventListener('install', event => {

    console.log('[SW] Instalando:', CACHE_NAME);
    console.log('[SW] Base:', BASE_PATH);

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {

                // No hacemos que la instalación falle si alguno
                // de los iconos no existe.
                return Promise.allSettled(
                    APP_SHELL.map(url =>
                        cache.add(url).catch(error => {
                            console.warn(
                                '[SW] No se pudo cachear:',
                                url,
                                error
                            );
                        })
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// ============================================================
// ACTIVATE
// ============================================================

self.addEventListener('activate', event => {

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {

                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => {
                            console.log(
                                '[SW] Eliminando caché antigua:',
                                name
                            );

                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// ============================================================
// FETCH
// ============================================================

self.addEventListener('fetch', event => {

    const request = event.request;

    // Solo nos interesan peticiones GET
    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    // --------------------------------------------------------
    // NO INTERCEPTAR:
    //
    // - Supabase
    // - APIs externas
    // - CDN
    // - Google
    // - Font Awesome
    // - jsPDF
    // - Tailwind
    // - cualquier dominio externo
    // --------------------------------------------------------

    if (url.origin !== self.location.origin) {
        return;
    }

    // --------------------------------------------------------
    // Solo trabajar con URLs dentro de nuestra aplicación
    // --------------------------------------------------------

    if (!url.pathname.startsWith(BASE_PATH)) {
        return;
    }

    // --------------------------------------------------------
    // Navegación HTML
    //
    // Primero intenta Internet.
    // Si no hay Internet, utiliza index.html de la caché.
    // --------------------------------------------------------

    if (request.mode === 'navigate') {

        event.respondWith(

            fetch(request)
                .then(response => {

                    // Guardar una copia actualizada de index.html
                    if (response.ok) {

                        const copy = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(
                                    BASE_PATH + 'index.html',
                                    copy
                                );
                            });
                    }

                    return response;
                })
                .catch(() => {

                    return caches.match(
                        BASE_PATH + 'index.html'
                    );
                })
        );

        return;
    }

    // --------------------------------------------------------
    // Archivos estáticos
    //
    // Network First:
    // 1. Internet
    // 2. Caché si no hay Internet
    // --------------------------------------------------------

    event.respondWith(

        fetch(request)
            .then(response => {

                if (response.ok) {

                    const copy = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(request, copy);
                        });
                }

                return response;
            })
            .catch(() => {

                return caches.match(request);
            })
    );
});