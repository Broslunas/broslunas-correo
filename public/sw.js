// Service Worker for Webmail Push Notifications

self.addEventListener('push', function (event) {
  if (!event.data) {
    console.warn('Push event received with no data payload.');
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (err) {
    console.error('Failed to parse push event JSON data:', err);
    data = {
      title: 'Nuevo Correo',
      body: event.data.text() || 'Has recibido un nuevo correo electrónico.'
    };
  }

  const title = data.title || 'Nuevo Correo';
  const options = {
    body: data.body || 'Has recibido un nuevo correo electrónico.',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    data: {
      url: data.url || '/mail?inbox=main'
    },
    // Prevent default system sound/vibration conflicts on some mobile browsers
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Ver Bandeja de Entrada' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/mail?inbox=main';

  // Wait until the browser attempts to find/open the window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (windowClients) {
        // Look for an existing open window/tab of the app
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Focus existing window and navigate to the target route
            if ('navigate' in client) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        // If no window is open, open a new tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
