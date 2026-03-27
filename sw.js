/**
 * Strategy Hub — sw.js
 * Service Worker — Offline-first (Anayasa K04)
 * Versiyon: 5.2.0 | 2026-03-26
 */

const CACHE_NAME    = 'strategy-hub-v5.2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './assets/css/main.css',
  './pages/dashboard.html',
  './pages/world.html',
  './pages/logistics.html',
  './pages/weather.html',
  './pages/realestate.html',
  './pages/export.html',
  './pages/bizdev.html',
  './pages/growth.html',
  './pages/kids.html',
  './pages/datasources.html',
  './pages/bookmarks.html',
  './pages/africa.html',
  './pages/anayasa.html',
  './src/core/router.js',
  './src/core/store.js',
  './src/core/logger.js',
  './src/core/ui.js',
  './src/modules/fx.module.js',
  './src/modules/realestate.module.js',
  './src/modules/growth.module.js',
  './src/modules/kids.module.js',
  './src/modules/anayasa.module.js',
  './src/modules/data-sources.module.js',
  './src/modules/alarm.module.js',
  './src/modules/notes.module.js',
  './src/modules/bookmarks.module.js',
  './src/modules/africa.module.js',
  './src/modules/dashboard.module.js',
  './src/modules/world.module.js',
  './src/modules/weather.module.js',
  './src/modules/logistics.module.js',
  './src/modules/export.module.js',
  './config/app.config.js',
];

// Install: tüm statik varlıkları önbelleğe al
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: eski cache'leri temizle
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Cache-first statikler, Network-first API'ler
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Harici API'ler → her zaman network (canlı veri)
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Statik varlıklar → cache-first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      });
    })
  );
});
