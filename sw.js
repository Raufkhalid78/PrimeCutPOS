
const CACHE_NAME = 'trimtime-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first, falling back to cache
self.addEventListener('fetch', event => {
  // Skip cross-origin requests like CDN scripts for the strict cache strategy, 
  // or handle them with a Stale-While-Revalidate strategy if desired.
  // For simplicity, we'll try to fetch everything and fallback to cache if offline.
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then(cache => {
            // Don't cache POST requests or non-GET methods
            if (event.request.method === 'GET') {
                cache.put(event.request, responseToCache);
            }
          });

        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
