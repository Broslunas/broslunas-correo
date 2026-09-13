// Service Worker for Webmail Cache and Push Notifications

const CACHE_NAME = 'broslunas-correo-v2';
const ASSETS_TO_CACHE = [
  '/favicon.png',
  '/favicon.ico',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Exclude navigations, API calls, auth pages, and Next.js compiler chunks to avoid breaking page transitions
  if (
    event.request.mode === 'navigate' ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/_next') ||
    url.hostname === 'localhost'
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          if (['image', 'font', 'style', 'script'].includes(event.request.destination)) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
        }
        return response;
      });
    })
  );
});

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
