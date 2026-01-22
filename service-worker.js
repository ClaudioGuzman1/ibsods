const CACHE = "offline-v1";

const OFFLINE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/styles.css",
  "/icons/icon-192.png",
  "/icons/icon-256.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(OFFLINE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
