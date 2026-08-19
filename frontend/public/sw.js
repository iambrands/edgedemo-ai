// Firmum service worker — offline shell + push notifications
// Cache version: bump this string whenever static assets change significantly.
const CACHE_VERSION = 'firmum-shell-v2';

// Routes that form the app shell — cached on install for offline access.
const SHELL_URLS = [
  '/',
  '/manifest.json',
];

// ─────────────────────────────────────────────────────────────────────────────
// Install — pre-cache the app shell
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // addAll failures are non-fatal — just log and continue.
      return cache.addAll(SHELL_URLS).catch(() => {});
    })
  );
  // Take control immediately without waiting for old SW to stop.
  self.skipWaiting();
});

// ─────────────────────────────────────────────────────────────────────────────
// Activate — evict stale caches from previous versions
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─────────────────────────────────────────────────────────────────────────────
// Fetch — network-first for API calls, cache-first for everything else
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  // API calls: network-first, no caching.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Navigation requests (HTML): network-first, fall back to '/' shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/').then((cached) => cached || fetch('/'))
      )
    );
    return;
  }

  // Static assets: cache-first, update cache in background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
        }
        return response;
      });
      return cached || networkFetch;
    })
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Push — display notifications sent from the Firmum backend
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Firmum', body: 'You have a new notification.', url: '/client/dashboard' };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'firmum-notification',
      data: { url: data.url },
    })
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Notification click — open or focus the relevant page
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/client/dashboard';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // If a Firmum window is already open, focus it and navigate.
        for (const client of clients) {
          if ('focus' in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new window.
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
