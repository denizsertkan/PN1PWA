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
  // 'path/to/yolo/model.json',
  // 'path/to/yolo/weights.bin',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }),
  );
});

// Possible Caching Strategies:
// - Stale-While-Revalidate: For fast access to models and data. ✓ (the chosen approach for now)
// - Dynamic Caching: For handling additional resources and updates.
// - Background Sync: For uploading data when connectivity is available.
// - Local Storage: For storing user data and settings.

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    }),
  );
});
