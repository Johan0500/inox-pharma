self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "INOX PHARMA", {
      body:    data.body    || "",
      icon:    data.icon    || "/icon-192.png",
      badge:   "/icon-192.png",
      vibrate: [200, 100, 200],
      data:    { url: data.url || "/" },
      actions: [
        { action: "open",    title: "Ouvrir" },
        { action: "dismiss", title: "Ignorer" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener("install",  () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));