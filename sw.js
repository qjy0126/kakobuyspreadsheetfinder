const CACHE = "kakohub-pwa-v1";
const PRECACHE = [
  "/",
  "/index.html",
  "/spreadsheet.html",
  "/qc-finder.html",
  "/coupons.html",
  "/deals.html",
  "/faq.html",
  "/item.html",
  "/css/style.css",
  "/js/app.js",
  "/js/pwa-boot.js",
  "/js/analytics.js",
  "/js/build-info.js",
  "/manifest.json",
  "/img/icon-192.png",
  "/img/icon-512.png",
  "/img/icon-512-maskable.png",
  "/img/apple-touch-icon.png",
  "/img/favicon.png",
  "/img/ios-a2hs.gif",
  "/img/android-a2hs.gif",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Don't cache huge catalog / product media in SW
  if (url.pathname.startsWith("/img/products/")) return;
  if (url.pathname.endsWith("/js/products.js") || url.pathname === "/js/products.js") return;
  if (url.pathname.endsWith("/js/qc-green.js") || url.pathname === "/js/qc-green.js") return;

  const isDoc =
    req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isDoc) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    })
  );
});
