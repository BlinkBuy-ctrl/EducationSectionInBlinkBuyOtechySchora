// The string below is replaced at build time (see vite.config.ts
// swBuildIdPlugin) with a unique value per deploy. This guarantees every
// new deploy gets its own cache namespace, so the activate handler always
// purges the previous deploy's cache instead of an installed PWA silently
// reusing a shell that references deleted hashed asset filenames.
const BUILD_ID = "BUILD_ID_PLACEHOLDER";
const CACHE = `schorahub-${BUILD_ID}`;

// Only the navigation shell and static (non-hashed) public assets are
// precached. Hashed bundle filenames under /assets/* are NEVER hardcoded
// here — they change every build and this file has no way to know them in
// advance. Those are handled by the runtime fetch handler below instead.
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
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
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

  // Cross-origin, non-navigation requests (Supabase API/storage calls,
  // analytics, etc.) are never intercepted — straight to network.
  if (!isSameOrigin && !isNavigation) return;

  // Navigation requests (loading the app shell itself): always try the
  // network first. This is what makes "update behaves correctly" true —
  // a user with connectivity always gets the latest index.html, which
  // references the current deploy's correctly-hashed asset filenames.
  // Cache is only a fallback for genuinely offline use.
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

  // Hashed build assets (/assets/*.js, /assets/*.css, etc.) are
  // content-addressed and immutable per deploy — but this service
  // worker's cache can outlive a deploy. Network-first with a cache
  // fallback ensures that if the network has the file, we always use
  // the live (correct) version, and we only fall back to cache when
  // truly offline. This prevents ever serving a 404'd stale asset
  // reference as if it were valid.
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
          // No cached copy and offline — let it fail naturally rather
          // than throwing inside the SW, which can otherwise surface
          // as a generic page load failure.
          return new Response("", { status: 504, statusText: "Offline" });
        })
    );
    return;
  }

  // Everything else (images, manifest, favicon): cache-first with a
  // background revalidation, since these rarely change and cache-first
  // gives the best offline/slow-network experience.
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
        // Serve cached immediately, refresh in background.
        networkFetch.catch(() => {});
        return cached;
      }
      return networkFetch.then((response) => response || new Response("", { status: 504, statusText: "Offline" }));
    })
  );
});

// Allow the page to trigger an immediate SW update check + activation,
// used by the update-prompt flow in main.tsx.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── E-BookStore real push notifications ──
self.addEventListener("push", (event) => {
  let data = { title: "SchoraHub", body: "You have a new update." };
  try { data = event.data.json(); } catch { /* non-JSON payload, use default */ }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow("/");
    })
  );
});
