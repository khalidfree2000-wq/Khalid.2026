const CACHE_NAME = 'alwan-v35-pwa-isolated-1';
const APP_PREFIX = 'alwan-v35-pwa-isolated-';

const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './invoice-logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    const response = await fetch('./index.html', {
      cache: 'reload'
    });

    if (!response.ok) {
      throw new Error('تعذر تحميل صفحة المحاسبة');
    }

    await cache.put('./index.html', response.clone());

    await Promise.allSettled(
      APP_FILES.filter(file => file !== './index.html').map(async file => {
        const result = await fetch(file, { cache: 'reload' });
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

  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    const cached = await cache.match(request, {
      ignoreSearch: request.mode === 'navigate'
    });

    if (request.mode === 'navigate') {
      try {
        const response = await fetch(request);

        if (response && response.ok) {
          await cache.put('./index.html', response.clone());
        }

        return response;
      } catch (_) {
        return cached || await cache.match('./index.html');
      }
    }

    if (cached) return cached;

    try {
      const response = await fetch(request);

      if (
        response &&
        response.ok &&
        url.pathname.startsWith(
          new URL('./', self.registration.scope).pathname
        )
      ) {
        await cache.put(request, response.clone());
      }

      return response;
    } catch (_) {
      return cached || Response.error();
    }
  })());
});