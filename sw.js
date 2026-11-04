const CACHE_NAME = "myanmar-astrology-shell-v1";
const APP_SHELL = [
  "./app.html",
  "./calendar.html",
  "./calendar-100-years.html",
  "./anga-vijja.html",
  "./day.html",
  "./graha-pariyaya.html",
  "./graha-nine.html",
  "./css/app.css",
  "./js/mm-calendar-core.js",
  "./js/calendar-app.js",
  "./js/day-astrology.js",
  "./js/pwa-install.js",
  "./manifest.webmanifest",
  "./assets/app-icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(request);
        return cached || caches.match("./app.html");
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});