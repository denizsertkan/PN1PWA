const CACHE_NAME = 'PN1-cache-v1';
const urlsToCache = [
  '/',
  'index.html',
  'manifest.json',
  'css/styles.css',
  'js/main.js',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
  'icons/android/android-launchericon-512-512.png',
  'icons/android/android-launchericon-192-192.png',
  'icons/android/android-launchericon-144-144.png',
  'icons/android/android-launchericon-96-96.png',
  'icons/android/android-launchericon-72-72.png',
  'icons/android/android-launchericon-48-48.png',
  'icons/ios/16.png',
  'icons/ios/20.png',
  'icons/ios/29.png',
  'icons/ios/32.png',
  'icons/ios/40.png',
  'icons/ios/50.png',
  'icons/ios/57.png',
  'icons/ios/58.png',
  'icons/ios/60.png',
  'icons/ios/64.png',
  'icons/ios/72.png',
  'icons/ios/76.png',
  'icons/ios/80.png',
  'icons/ios/87.png',
  'icons/ios/100.png',
  'icons/ios/114.png',
  'icons/ios/120.png',
  'icons/ios/128.png',
  'icons/ios/144.png',
  'icons/ios/152.png',
  'icons/ios/167.png',
  'icons/ios/180.png',
  'icons/ios/192.png',
  'icons/ios/256.png',
  'icons/ios/512.png',
  'icons/ios/1024.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }),
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }),
  );
});
