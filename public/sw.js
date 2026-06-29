const CACHE = "schorahub-v2";
const ASSETS = ["/", "/index.html", "/favicon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  // Only handle GET requests to same-origin or CDN resources
  if (e.request.method !== "GET") return;

  // Skip cross-origin requests that aren't navigations (e.g. Supabase API calls)
  const url = new URL(e.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = e.request.mode === "navigate";

  // For Supabase API calls — let them go straight to network, never cache
  if (!isSameOrigin && !isNavigation) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // For navigation requests, try network first so the app always loads fresh
      if (isNavigation) {
        return fetch(e.request)
          .then(res => {
            if (res && res.status === 200) {
              const clone = res.clone();
              caches.open(CACHE).then(c => c.put(e.request, clone));
            }
            return res;
          })
          .catch(() => cached || caches.match("/index.html"));
      }

      // For assets: serve cache-first
      if (cached) {
        // Refresh cache in background
        fetch(e.request)
          .then(res => {
            if (res && res.status === 200 && res.type !== "opaque") {
              caches.open(CACHE).then(c => c.put(e.request, res));
            }
          })
          .catch(() => {/* ignore */});
        return cached;
      }

      // Not in cache — fetch and cache it
      return fetch(e.request)
        .then(res => {
          if (res && res.status === 200 && res.type !== "opaque") {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => {
          // Offline fallback for navigation
          if (isNavigation) return caches.match("/index.html");
        });
    })
  );
});
