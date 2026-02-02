const CACHE_VERSION = "adoptmatch-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",

  "./src/styles/tokens.css",
  "./src/styles/base.css",
  "./src/styles/layout.css",
  "./src/styles/components.css",
  "./src/styles/screens.css",
  "./src/styles/animations.css",

  "./src/main.js",

  "./data/questions.v1.json",
  "./data/archetypes.v1.json",

  "./assets/icons/app-icon-192.png",
  "./assets/icons/app-icon-512.png",
  "./assets/icons/maskable-icon-512.png"
];

// Install: pre-cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_VERSION ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Cache-first for core assets
// - Network-first for everything else (with cache fallback)
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle same-origin requests (important for safety)
  if (url.origin !== self.location.origin) return;

  // Cache-first for core app assets
  const isCore = CORE_ASSETS.some((p) => url.pathname.endsWith(p.replace("./", "")));

  if (isCore) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }

  // Network-first for everything else
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});

