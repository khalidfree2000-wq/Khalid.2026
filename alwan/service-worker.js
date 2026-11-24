const CACHE_NAME = 'alwan-v35-pwa-isolated-2';
const APP_PREFIX = 'alwan-v35-pwa-isolated-';

const APP_URL = new URL('./index.html', self.registration.scope).href;

const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './invoice-logo.png'
].map(file => new URL(file, self.registration.scope).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    const response = await fetch(APP_URL, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('تعذر تحميل صفحة المحاسبة');
    }

    await cache.put(APP_URL, response.clone());

    await Promise.allSettled(
      APP_FILES
        .filter(file => file !== APP_URL)
        .map(async file => {
          const result = await fetch(file, { cache: 'no-store' });
          if (result.ok) await cache.put(file, result);
        })
    );

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key => key.startsWith(APP_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const scopeURL = new URL(self.registration.scope);

  if (url.origin !== scopeURL.origin) return;
  if (!url.pathname.startsWith(scopeURL.pathname)) return;

  const isHTML =
    request.mode === 'navigate' ||
    url.pathname.endsWith('.html');

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    if (isHTML) {
      try {
        const response = await fetch(
          new Request(request, { cache: 'no-store' })
        );

        if (response.ok) {
          await cache.put(APP_URL, response.clone());
        }

        return response;
      } catch (_) {
        return (
          await cache.match(APP_URL) ||
          Response.error()
        );
      }
    }

    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);

      if (response.ok) {
        await cache.put(request, response.clone());
      }

      return response;
    } catch (_) {
      return Response.error();
    }
  })());
});
