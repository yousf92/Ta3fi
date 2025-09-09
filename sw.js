// Define a new, unique name for the cache to ensure the service worker updates correctly.
const CACHE_NAME = 'app-assets-cache-v4';

/**
 * 'install' event listener
 * Fired when the service worker is first installed.
 * We use self.skipWaiting() to ensure the new service worker activates immediately.
 */
self.addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
    console.log('Unified SW: Installed');
});

/**
 * 'activate' event listener
 * Fired when the service worker becomes active. This is the perfect place
 * to clean up old, unused caches.
 */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            // Delete all caches that are not the current one.
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
            );
        }).then(() => {
            // Allow the active service worker to take control of the page immediately.
            console.log('Unified SW: Activated and old caches cleared.');
            return self.clients.claim();
        })
    );
});

/**
 * 'fetch' event listener
 * Fired for every network request made by the application.
 * We use a "Cache First" strategy for important assets.
 */
self.addEventListener('fetch', event => {
    const { request } = event;
    const { destination } = request;

    // We only want to cache specific types of assets: images, videos,
    // and requests with an empty destination (which often includes PDFs and other direct file links).
    if (destination === 'image' || destination === 'video' || destination === '') {
        // We only handle GET requests, as other requests (like POST) are not cacheable.
        if (request.method !== 'GET') {
            return;
        }

        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                // First, try to find a matching response in the cache.
                return cache.match(request).then(cachedResponse => {
                    // If a cached response is found, return it immediately.
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // If not in cache, fetch it from the network.
                    return fetch(request).then(networkResponse => {
                        // We must clone the response because it's a stream that can only be consumed once.
                        // We check for a valid response (status 200) before caching.
                        // We also check if the response type is 'cors' or 'basic' to avoid caching opaque responses.
                        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'cors' || networkResponse.type === 'basic')) {
                             cache.put(request, networkResponse.clone());
                        }

                        // Return the original network response to the page.
                        return networkResponse;
                    }).catch(error => {
                        // Optional: Handle fetch errors, e.g., by returning an offline fallback page/image.
                        console.error('SW Fetch Error:', error);
                        // Re-throw the error to allow the browser to handle the network failure.
                        throw error;
                    });
                });
            })
        );
    }
});

/**
 * Optional: 'message' event listener
 * You can keep this if you need to trigger caching manually from your app's code,
 * for example, for pre-caching specific resources.
 */
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CACHE_BOOK') {
        const urlToCache = event.data.url;
        console.log('Unified SW: Received request to cache:', urlToCache);

        event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
                return cache.add(urlToCache).then(() => {
                    if (event.source) {
                        event.source.postMessage({ type: 'CACHE_SUCCESS', url: urlToCache });
                    }
                }).catch(error => {
                    console.error('Unified SW: Failed to cache', urlToCache, error);
                    if (event.source) {
                        event.source.postMessage({ type: 'CACHE_FAIL', url: urlToCache });
                    }
                });
            })
        );
    }
});
