// The string below is replaced at build time (see vite.config.ts
// swBuildIdPlugin) with a unique value per deploy. This guarantees every
// new deploy gets its own cache namespace, so the activate handler always
// purges the previous deploy's cache instead of an installed PWA silently
// reusing a shell that references deleted hashed asset filenames.
const BUILD_ID = "BUILD_ID_PLACEHOLDER";
const CACHE = `schorahub-${BUILD_ID}`;
const API_CACHE = `schorahub-api-${BUILD_ID}`;

const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE && k !== API_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = request.mode === "navigate";

  // ── Supabase REST API reads (any *.supabase.co /rest/v1/... GET) ──────
  // Stale-while-revalidate: serve the cached response instantly if we have
  // one, refresh it in the background from the network. This is what makes
  // Higher Education / E-BookStore / Adverts tabs work even if the app's own
  // IndexedDB cache were ever unavailable — a second, SW-level safety net.
  const isSupabaseRest = url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/v1/");
  if (isSupabaseRest) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => undefined);

        if (cached) {
          networkFetch.catch(() => {});
          return cached;
        }
        return networkFetch.then((response) => response || new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      })
    );
    return;
  }

  // Cross-origin, non-navigation requests other than Supabase REST (storage
  // downloads, Mux, analytics, etc.) are never intercepted — straight to network.
  if (!isSameOrigin && !isNavigation) return;

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match("/index.html");
        })
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response("", { status: 504, statusText: "Offline" });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== "opaque") {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => undefined);

      if (cached) {
        networkFetch.catch(() => {});
        return cached;
      }
      return networkFetch.then((response) => response || new Response("", { status: 504, statusText: "Offline" }));
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "SchoraHub", body: "You have a new update.", url: "/" };
  try { data = { ...data, ...event.data.json() }; } catch { /* non-JSON payload, use defaults */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-maskable-192.png",
      data: { url: data.url },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.startsWith(self.location.origin));
        if (existing) {
          existing.focus();
          existing.navigate(targetUrl);
          return;
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});