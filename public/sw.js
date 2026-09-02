const CACHE = 'tf-cache-v2';
const STATIC = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(STATIC))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle simple same-origin GETs. Anything else goes straight to the
  // network WITHOUT interception so no request can ever break.
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    (url.protocol !== 'http:' && url.protocol !== 'https:')
  ) {
    return;
  }

  // Never intercept API/auth requests — caching those breaks sessions.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      // Stale-while-revalidate: serve the cache, refresh it in the background.
      fetch(request)
        .then((res) => {
          if (res && res.ok) {
            return caches.open(CACHE).then((cache) => cache.put(request, res));
          }
        })
        .catch(() => {});
      return cached;
    }

    const res = await fetch(request);
    if (res && res.ok) {
      const clone = res.clone();
      caches.open(CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
    }
    return res;
  } catch (err) {
    // Never reject the respondWith promise — that surfaces as
    // "FetchEvent resulted in a network error response" and kills the page.
    const cached = await caches.match(request).catch(() => undefined);
    return cached || Response.error();
  }
}