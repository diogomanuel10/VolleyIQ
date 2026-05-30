// VolleyIQ service worker — app-shell cache + stale-while-revalidate + Web Push.
// Mantido propositadamente simples (sem Workbox) para caber no PWA sem build step.
const VERSION = "volleyiq-v3";
const API_CACHE = "volleyiq-api-v1";
const SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
];

// API paths cached for offline fallback (scout read-only data).
const CACHEABLE_API = [
  /^\/api\/matches(\?|$)/,
  /^\/api\/players(\?|$)/,
  /^\/api\/matches\/[^/]+\/actions(\?|$)/,
  /^\/api\/matches\/[^/]+\/lineups(\?|$)/,
  /^\/api\/matches\/[^/]+\/substitutions(\?|$)/,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = new Set([VERSION, API_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // API: network-first com fallback para cache nos endpoints de scout.
  if (url.pathname.startsWith("/api/")) {
    const isCacheable = CACHEABLE_API.some((re) => re.test(url.pathname + url.search));
    if (!isCacheable) return; // outras rotas: só rede

    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(API_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit ?? Response.error()),
        ),
    );
    return;
  }

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

// ── Web Push ─────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "VolleyIQ", body: event.data.text() };
  }
  const { title, body, icon = "/manifest.webmanifest", tag, url } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      tag,
      badge: "/manifest.webmanifest",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        const existing = list.find((c) => c.url.includes(self.location.origin));
        if (existing) {
          existing.focus();
          return existing.navigate(url);
        }
        return clients.openWindow(url);
      }),
  );
});
