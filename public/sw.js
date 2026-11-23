/*
 * Service worker de Rinde (PWA instalable).
 * - Estáticos de Next (/_next/static): cache-first (tienen hash en el nombre).
 * - Íconos de la app (/iconos/…): network-first. No tienen hash en el nombre, así que si se guardaran para siempre
 *   un ícono nuevo nunca llegaría (pasó con las tres barras → la "r", el 22/11/2026). Sin conexión, el guardado.
 * - Páginas: network-first; si no hay conexión, la última versión guardada o una página "sin conexión".
 * - APIs y datos: siempre a la red (nunca mostramos un precio viejo como si fuera actual).
 *
 * Cambiar VERSION borra todo lo guardado con la anterior. v2 (23/11/2026): borra los íconos viejos de las tres barras.
 */
const VERSION = "rinde-v2";
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll([OFFLINE])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

/** Pide a la red y guarda una copia; si no hay conexión, lo guardado (o `respaldo`, si no hay nada). */
function redPrimero(req, respaldo) {
  return fetch(req)
    .then((res) => {
      if (res.ok) {
        const copia = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copia));
      }
      return res;
    })
    .catch(() => caches.match(req).then((hit) => hit || (respaldo ? caches.match(respaldo) : Response.error())));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copia = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copia));
            return res;
          }),
      ),
    );
    return;
  }

  if (url.pathname.startsWith("/iconos/")) {
    e.respondWith(redPrimero(req));
    return;
  }

  if (req.mode === "navigate") e.respondWith(redPrimero(req, OFFLINE));
});
