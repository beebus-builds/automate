// TeacherFolio Service Worker — prod offline + update safe
// Bump CACHE_VERSION on each deploy to invalidate old builds.
// Offline strategy:
//  - Navigations: network-first → cached HTML → /offline
//  - Static assets (_next/static, icons, screenshots, css/js): stale-while-revalidate with LRU trim
//  - API/auth: never intercepted

const CACHE_VERSION = 'tf-cache-v3';
const STATIC_PRECACHE = [
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
  '/screenshots/desktop-1.png',
  '/screenshots/mobile-1.png',
];

// Keep cache from growing unbounded
const MAX_ENTRIES = 120;

async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      await cache.delete(keys[0]);
      // recurse if still over (cheap for small overage)
      if (keys.length > maxEntries + 5) await trimCache(cacheName, maxEntries);
    }
  } catch {}
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(STATIC_PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        // Enable navigation preload where supported (faster offline nav)
        if ('navigationPreload' in self.registration) {
          return self.registration.navigationPreload.enable().catch(() => {});
        }
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    (url.protocol !== 'http:' && url.protocol !== 'https:')
  ) return;

  // Never intercept API/auth — caching those breaks sessions & CSRF
  if (url.pathname.startsWith('/api/')) return;

  // Navigations (HTML): network-first with offline fallback
  const isNavigation =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(handleNavigation(event));
    return;
  }

  // Everything else: stale-while-revalidate
  event.respondWith(handleAsset(request));
});

async function handleNavigation(event) {
  const request = event.request;
  try {
    // Use navigation preload if available (faster TTFB)
    const preload = await event.preloadResponse.catch(() => undefined);
    if (preload) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, preload.clone()).catch(() => {});
      trimCache(CACHE_VERSION, MAX_ENTRIES);
      return preload;
    }

    const network = await fetch(request);
    // Cache successful navigations for offline use (same-origin HTML only)
    if (network && network.ok && (network.headers.get('content-type') || '').includes('text/html')) {
      const clone = network.clone();
      caches.open(CACHE_VERSION).then((c) => c.put(request, clone).catch(() => {})).then(() => trimCache(CACHE_VERSION, MAX_ENTRIES));
    }
    return network;
  } catch {
    // Network failed → try cache
    const cached = await caches.match(request).catch(() => undefined);
    if (cached) return cached;
    // Final fallback: offline page (must be precached)
    const offline = await caches.match('/offline').catch(() => undefined);
    if (offline) return offline;
    // Last resort: generic response (avoid Response.error which surfaces as network error)
    return new Response('<!doctype html><title>Offline</title><body style="font-family:system-ui;padding:40px"><h1>Offline</h1><p>Reconnect to load this page.</p><a href=\"/\">Home</a>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

async function handleAsset(request) {
  const cached = await caches.match(request).catch(() => undefined);
  const fetchAndCache = fetch(request)
    .then(async (res) => {
      if (res && res.ok) {
        const ct = res.headers.get('content-type') || '';
        // Only cache useful types: images, js/css, fonts, html fragments, json (but not api)
        const cacheable = /^(image\/|text\/css|text\/javascript|application\/javascript|font\/|text\/html|application\/json)/.test(ct) || request.url.includes('/_next/static/');
        if (cacheable) {
          const clone = res.clone();
          const cache = await caches.open(CACHE_VERSION);
          await cache.put(request, clone).catch(() => {});
          trimCache(CACHE_VERSION, MAX_ENTRIES);
        }
      }
      return res;
    })
    .catch(() => undefined);

  if (cached) {
    // background refresh (fire-and-forget already kicked off)
    fetchAndCache.catch(() => {});
    return cached;
  }

  const network = await fetchAndCache;
  if (network) return network;

  // If both miss and it's an image, return a tiny transparent placeholder instead of error
  const accept = request.headers.get('accept') || '';
  if (accept.includes('image/') || /\.(png|jpg|jpeg|webp|svg|gif|ico)$/i.test(request.url)) {
    return new Response(
      new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,10,73,68,65,84,120,156,99,0,1,0,0,5,0,1,13,10,45,180,0,0,0,0,73,69,78,68,174,66,96,130]),
      { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } }
    );
  }

  return Response.error();
}
