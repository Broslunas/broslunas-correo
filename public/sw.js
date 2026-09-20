// Service Worker for Broslunas Webmail: Offline Cache, PWA, and Push Notifications

const CACHE_NAME = 'broslunas-correo-v3';
const DATA_CACHE_NAME = 'broslunas-data-v1';

const STATIC_ASSETS = [
  '/',
  '/mail?inbox=main',
  '/favicon.png',
  '/favicon.ico',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== DATA_CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip auth callback flows and external telemetry
  if (
    url.pathname.startsWith('/api/auth/google') ||
    url.pathname.startsWith('/api/auth/passkey') ||
    url.hostname.includes('analytics.broslunas.com')
  ) {
    return;
  }

  // 1. Navigation requests: Network-first, fallback to cached mail page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const fallback = await caches.match('/mail?inbox=main');
          return fallback || Response.error();
        })
    );
    return;
  }

  // 2. Read-only API requests (/api/emails, /api/auth/status, /api/mailboxes): Network-first with cache fallback
  if (
    url.pathname.startsWith('/api/emails') ||
    url.pathname === '/api/auth/status' ||
    url.pathname === '/api/mailboxes'
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response(JSON.stringify({ offline: true, emails: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // 3. Static assets: Next.js static files, fonts, styles, images: Cache-first with network fallback
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    ['image', 'font', 'style', 'script'].includes(event.request.destination)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Push notification listeners
self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (err) {
    data = {
      title: 'Nuevo Correo',
      body: event.data.text() || 'Has recibido un nuevo correo electrónico.'
    };
  }

  const title = data.title || 'Nuevo Correo';
  const options = {
    body: data.body || 'Has recibido un nuevo correo electrónico.',
    icon: data.icon || '/favicon.png',
    badge: data.badge || '/favicon.ico',
    data: {
      url: data.url || '/mail?inbox=main'
    },
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

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (windowClients) {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            if ('navigate' in client) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
