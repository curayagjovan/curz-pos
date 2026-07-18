const CACHE_VERSION = "shopmae-v9";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/pwa-icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    /\.(?:js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/i.test(pathname)
  );
}

async function cachePut(request, response) {
  if (!response || response.status !== 200 || response.type === "opaque") {
    return;
  }

  const cache = await caches.open(CACHE_VERSION);
  await cache.put(request, response.clone());
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
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

  if (url.pathname.startsWith("/api/")) {
    // Network first for API GETs, fallback to cached response when offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          cachePut(request, response).catch(() => undefined);
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || Response.error();
        }),
    );
    return;
  }

  if (request.mode === "navigate") {
    // Network first for navigations, fallback to cached page or offline page.
    event.respondWith(
      fetch(request)
        .then((response) => {
          cachePut(request, response).catch(() => undefined);
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_VERSION);
          return (
            (await cache.match(request)) ||
            (await cache.match("/")) ||
            Response.error()
          );
        }),
    );
    return;
  }

  if (isStaticAsset(url.pathname)) {
    // Cache first for static assets, then update cache in background.
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            cachePut(request, response).catch(() => undefined);
            return response;
          })
          .catch(() => cached || Response.error());

        return cached || networkFetch;
      }),
    );
    return;
  }

  // Stale-while-revalidate-like behavior for same-origin GET requests.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          cachePut(request, response).catch(() => undefined);
          return response;
        })
        .catch(() => cached || Response.error());

      return cached || networkFetch;
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = {
        body: event.data.text(),
      };
    }
  }

  const title = payload.title || "SHOPMAE";
  const options = {
    body: payload.body || "You have a new checkout update",
    icon: payload.icon || "/pwa-icon.svg",
    badge: payload.badge || "/pwa-icon.svg",
    tag: payload.tag || "shopmae-push",
    data: payload.data || { url: "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.focus();
            return;
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
