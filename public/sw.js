// HelloQR service worker. Deliberately narrow: it only keeps "Show my QR" usable offline.
// It caches that one page and the hashed static files it needs, and leaves every other request alone.
const CACHE = "helloqr-show-v1";
const SHOW = "/dashboard/show";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(SHOW))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== CACHE) {
          await caches.delete(key);
        }
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // The page itself: always try the network first so it stays current.
  if (request.mode === "navigate" && url.pathname === SHOW) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(SHOW, copy));
          }
          return response;
        })
        .catch(() => caches.match(SHOW).then((hit) => hit || Response.error())),
    );
    return;
  }

  // Hashed build files never change, so a cached copy is always correct.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/pwa-icon/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
