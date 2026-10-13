// 更新したらVERSIONを変えると、端末のキャッシュが入れ替わります
const VERSION = "v4";
const CACHE = "license-app-" + VERSION;
const CORE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ページ本体はネット優先（更新がすぐ反映される）、それ以外はキャッシュ優先
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  const isPage = e.request.mode === "navigate" || new URL(e.request.url).pathname.endsWith("/index.html");

  if (isPage) {
    e.respondWith(
      fetch(e.request, { cache: "no-cache" })
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res && (res.ok || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
