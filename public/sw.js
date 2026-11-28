const CACHE_NAME = "tuition-pwa-v1";
const OFFLINE_URL = "/offline.html";

const STATIC_PRECACHE = [
  OFFLINE_URL,
  "/icon.svg",
  "/icon-maskable.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico"
];

// Install: precache offline page and icons
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_PRECACHE))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-first for navigation, cache-first for static icons/images
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET requests and internal Next.js / API calls
  if (req.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  // HTML page navigations -> Network first, fallback to offline.html
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) return cached;
        return cache.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Static images, fonts, styles -> Stale while revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2|woff|ttf|css)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              cache.put(req, networkRes.clone());
            }
            return networkRes;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
