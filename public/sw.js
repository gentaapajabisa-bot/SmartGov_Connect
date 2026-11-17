// Service worker minimal: hanya menampilkan halaman offline saat navigasi gagal karena jaringan putus.
// Sengaja TIDAK menyimpan halaman, data API, atau foto, sehingga data akun tidak tertinggal di perangkat.
const CACHE = "sgc-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL])).then(() => self.skipWaiting()));
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
  if (req.mode !== "navigate") return; // selain navigasi: biarkan peramban menangani seperti biasa
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
});
