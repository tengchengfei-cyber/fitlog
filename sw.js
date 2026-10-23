/**
 * Service Worker（原型离线能力）：
 * - 应用外壳 precache；
 * - 导航请求 network-first，失败回落到缓存的 index.html；
 * - 静态资源 stale-while-revalidate（开发时也能尽快拿到新文件）。
 * 注意：这属于原型阶段的本机离线缓存，不代表云端同步。
 */
const CACHE_NAME = 'fitlog-proto-v5';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/styles/tokens.css',
  './src/styles/base.css',
  './src/styles/components.css',
  './src/styles/pages.css',
  './src/styles/settings.css',
  './src/main.js',
  './src/app/dom.js',
  './src/app/format.js',
  './src/app/router.js',
  './src/app/storage.js',
  './src/app/store.js',
  './src/app/metrics.js',
  './src/config/appConfig.js',
  './src/ui/icons.js',
  './src/ui/index.js',
  './src/data/muscles.js',
  './src/data/exercises/index.js',
  './src/data/importedExercises.js',
  './src/features/ai/config.js',
  './src/features/ai/client.js',
  './src/features/ai/prompt.js',
  './src/features/ai/validate.js',
  './src/features/ai/analysis.js',
  './src/features/ai/knowledge.js',
  './src/features/sync/config.js',
  './src/features/sync/auth.js',
  './src/features/sync/merge.js',
  './src/features/sync/engine.js',
  './src/features/sync/redirect.js',
  './src/features/library/exercisePack.js',
  './src/features/log/restTimer.js',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('./index.html', response.clone());
    return response;
  } catch {
    const cached = (await cache.match(request)) || (await cache.match('./index.html')) || (await cache.match('./'));
    return cached || new Response('离线且无缓存', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await network) || new Response('资源不可用', { status: 504 });
}
