/**
 * Service Worker for push notifications.
 * Handles incoming push events and shows notifications.
 */

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Backgammon';
  const options = {
    body: data.body || "It's your turn!",
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: data.url || '/', gameId: data.gameId },
    tag: data.gameId || 'backgammon',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if possible
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(url);
    })
  );
});
