/**
 * Service Worker for Caching Background Video
 *
 * This service worker intercepts network requests for videos and serves them from the cache
 * if they are available, significantly improving load times on subsequent visits.
 */

// Define a unique name for the cache.
const CACHE_NAME = 'video-cache-v1';

/**
 * 'install' event listener
 * Fired when the service worker is first installed.
 */
self.addEventListener('install', event => {
    // self.skipWaiting() forces the waiting service worker to become the
    // active service worker. This is useful for ensuring new updates
    // are applied immediately.
    event.waitUntil(self.skipWaiting());
    console.log('Service Worker: Installed');
});

/**
 * 'activate' event listener
 * Fired when the service worker becomes active.
 */
self.addEventListener('activate', event => {
    // self.clients.claim() allows an active service worker to set itself as the
    // controller for all clients within its scope. This means pages that were
    // loaded before the service worker was activated can still be controlled by it.
    event.waitUntil(self.clients.claim());
    console.log('Service Worker: Activated');
});

/**
 * 'fetch' event listener
 * Fired for every network request made by the page.
 */
self.addEventListener('fetch', event => {
    // We only want to intercept requests for videos.
    // The `event.request.destination` property tells us the type of content being requested.
    if (event.request.destination === 'video') {
        // We respond to the request with a promise that resolves to the response.
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                // First, try to find a matching response in the cache.
                return cache.match(event.request).then(cachedResponse => {
                    // If a cached response is found, return it.
                    if (cachedResponse) {
                        console.log('Service Worker: Serving video from cache:', event.request.url);
                        return cachedResponse;
                    }

                    // If no response is found in the cache, fetch it from the network.
                    console.log('Service Worker: Video not in cache. Fetching from network:', event.request.url);
                    return fetch(event.request).then(networkResponse => {
                        // Once fetched, we put a copy of the response into the cache for future requests.
                        // We must clone the response because it's a stream that can only be consumed once.
                        cache.put(event.request, networkResponse.clone());

                        // Return the original network response to the page.
                        return networkResponse;
                    });
                });
            })
        );
    }
});

