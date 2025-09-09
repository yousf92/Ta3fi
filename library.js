/**
 * Enhanced Service Worker for Caching Application Assets
 *
 * This service worker now intercepts network requests for videos, images,
 * and other objects (like PDFs) to serve them from the cache if available.
 * It also listens for explicit messages to proactively cache specific assets.
 */

// Define a new, unique name for the cache to ensure the service worker updates correctly.
const CACHE_NAME = 'app-assets-cache-v2';

/**
 * 'install' event listener
 * Fired when the service worker is first installed.
 */
self.addEventListener('install', event => {
    // Force the waiting service worker to become the active service worker.
    event.waitUntil(self.skipWaiting());
    console.log('Service Worker: Installed');
});

/**
 * 'activate' event listener
 * Fired when the service worker becomes active. This is the perfect place
 * to clean up old caches.
 */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            // Delete all caches that are not the current one (CACHE_NAME).
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
            );
        }).then(() => {
            // Allow the active service worker to take control of the page immediately.
            console.log('Service Worker: Activated and old caches cleared.');
            return self.clients.claim();
        })
    );
});

/**
 * 'message' event listener
 * Listens for messages from the main application to perform actions like caching a file on demand.
 */
self.addEventListener('message', event => {
    // Check for the specific message type to cache a book.
    if (event.data && event.data.type === 'CACHE_BOOK') {
        const urlToCache = event.data.url;
        console.log('Service Worker: Received request to cache:', urlToCache);

        event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
                return cache.add(urlToCache).then(() => {
                    // Send a success message back to the client that sent the message.
                    if (event.source) {
                        event.source.postMessage({ type: 'CACHE_SUCCESS', url: urlToCache });
                    }
                }).catch(error => {
                    console.error('Service Worker: Failed to cache', urlToCache, error);
                    // Send a failure message back.
                    if (event.source) {
                        event.source.postMessage({ type: 'CACHE_FAIL', url: urlToCache });
                    }
                });
            })
        );
    }
});


/**
 * 'fetch' event listener
 * Fired for every network request made by the page.
 */
self.addEventListener('fetch', event => {
    const destinationsToCache = ['video', 'image', 'object', ''];

    if (destinationsToCache.includes(event.request.destination)) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    // If a cached response is found, return it immediately.
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // If not in cache, fetch it from the network.
                    return fetch(event.request).then(networkResponse => {
                        // Check if we received a valid response.
                        if (networkResponse && networkResponse.status === 200) {
                            // Put a copy of the response into the cache for future use.
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                });
            })
        );
    }
});

