// deployed: v25
// Cache-first app-shell service worker. The version lives in js/version.js (shown in the UI too):
// bump it whenever a shell file changes so installed copies pick up the update.
importScripts('js/version.js');
const CACHE = `instudychord-${self.APP_VERSION}`;
const SHELL = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/chords.js',
  'js/notes.js',
  'js/keyboard.js',
  'js/audio.js',
  'js/settings.js',
  'js/exercise.js',
  'js/history.js',
  'js/identify.js',
  'js/version.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

// cache: 'reload' = fetch from the network, never from the browser's HTTP cache (GitHub Pages sends
// `cache-control: max-age=600`, so a plain addAll() could fill the new cache with files up to 10 min old).
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('instudychord-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request)),
  );
});
