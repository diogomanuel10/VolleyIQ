// VolleyIQ service worker — app-shell cache + stale-while-revalidate para GETs.
// Mantido propositadamente simples (sem Workbox) para caber no PWA sem build step.
const VERSION = "volleyiq-v1";
const SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // API: só rede, nunca cache (dados tempo-real).
  if (url.pathname.startsWith("/api/")) return;

  // Navegações (HTML) → network-first com fallback à shell cacheada.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() =>
          caches.match("/index.html").then((hit) => hit ?? Response.error()),
        ),
    );
    return;
  }

  // Estáticos (JS/CSS/fonts/ícones) → stale-while-revalidate.
  if (
    url.origin === self.location.origin ||
    url.hostname === "rsms.me" // webfonts Inter
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached ?? fetchPromise;
      }),
    );
  }
});
