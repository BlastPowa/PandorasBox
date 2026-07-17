const SHELL_CACHE = "pbox-offline-shell-v2";
const OFFLINE_URL = "/offline";
const SHELL_ASSETS = [OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("pbox-offline-shell-") && key !== SHELL_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || new Response("PBox is offline.", { status: 503, headers: { "Content-Type": "text/plain" } })));
    return;
  }
  if (SHELL_ASSETS.includes(url.pathname)) event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json() || {};
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (windows.some((client) => client.visibilityState === "visible")) return;
    await self.registration.showNotification(payload.title || "PBox", {
      body: payload.body || "You have a new notification",
      icon: "/icons/icon-192.png", badge: "/icons/icon-192.png",
      tag: payload.tag || "pbox-social", data: { url: payload.url || "/notifications" },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) { await existing.focus(); if ("navigate" in existing) await existing.navigate(target); return; }
    await self.clients.openWindow(target);
  })());
});
