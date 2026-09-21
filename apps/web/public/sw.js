/**
 * HostelHub Service Worker (PWA)
 *
 * Implements:
 * 1. App shell and static asset caching with stale-while-revalidate
 * 2. Network-first HTML navigations with offline.html fallback
 * 3. Background Sync for offline application drafts
 * 4. Web Push notifications and notification click actions
 */

const CACHE_NAME = "hostelhub-cache-v1";

const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/applications/new",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-192x192.png",
  "/icons/apple-touch-icon.png",
];

// 1. Install: Precache app shell and activate immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// 2. Activate: Clean up old caches and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// 3. Fetch Strategy
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET requests for standard caching
  if (req.method !== "GET") return;

  // Ignore browser extensions, chrome-extension, internal schemes
  if (!url.protocol.startsWith("http")) return;

  // HTML Navigations: Network-First, fallback to cache, then offline.html
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const offlinePage = await caches.match("/offline.html");
          return offlinePage || new Response("Offline", { status: 503, statusText: "Offline" });
        }),
    );
    return;
  }

  // Static Assets (_next/static, fonts, icons): Cache-First with Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname === "/manifest.json";

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      }),
    );
    return;
  }

  // General requests: Network first with cache fallback
  if (url.origin === self.location.origin && !url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(req)),
    );
  }
});

// 4. Background Sync: Trigger offline draft sync when connectivity returns
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-application-draft" || event.tag === "sync-draft") {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "BACKGROUND_SYNC_TRIGGERED",
            tag: event.tag,
            timestamp: Date.now(),
          });
        });
      }),
    );
  }
});

// 5. Web Push: Receive push event and display notification
self.addEventListener("push", (event) => {
  let data = {
    title: "HostelHub Campus Housing",
    body: "You have a new housing update.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    url: "/dashboard",
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/icon-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/dashboard",
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: "open", title: "View Details" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 6. Notification Click: Open or focus target URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
