const CACHE_NAME = 'video-cache-v2';

/**
 * يخزن عنوان URL للفيديو المحدد في ذاكرة التخزين المؤقت.
 * @param {string} videoUrl - عنوان URL للفيديو المراد تخزينه.
 */
const cacheVideo = (videoUrl) => {
    // لا تفعل شيئًا إذا كان عنوان URL فارغًا
    if (!videoUrl) return Promise.resolve();
    
    return caches.open(CACHE_NAME).then(cache => {
        console.log(`[Service Worker] Caching new video: ${videoUrl}`);
        // تحقق مما إذا كان الفيديو موجودًا بالفعل لتجنب إعادة التنزيل
        return cache.match(videoUrl).then(response => {
            if (!response) {
                return cache.add(videoUrl).catch(err => {
                    console.error('[Service Worker] Failed to cache video:', err);
                });
            }
            return Promise.resolve();
        });
    });
};

// عند تفعيل الـ Service Worker، قم بتنظيف ذاكرة التخزين المؤقت القديمة
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    // حذف أي ذاكرة تخزين مؤقت تبدأ بـ 'video-cache-' وليست الحالية
                    return cacheName.startsWith('video-cache-') && cacheName !== CACHE_NAME;
                }).map(cacheName => {
                    return caches.delete(cacheName);
                })
            );
        }).then(() => self.clients.claim()) // السيطرة على الصفحات المفتوحة فورًا
    );
});

// اعتراض طلبات الشبكة (fetch)
self.addEventListener('fetch', event => {
    // تعامل فقط مع الطلبات التي تكون وجهتها 'video'
    if (event.request.destination === 'video') {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(response => {
                    // إذا تم العثور على الفيديو في ذاكرة التخزين المؤقت، قم بإرجاعه
                    if (response) {
                        console.log(`[Service Worker] Serving video from cache: ${event.request.url}`);
                        return response;
                    }

                    // إذا لم يكن موجودًا، اطلبه من الشبكة، خزنه في ذاكرة التخزين المؤقت، ثم أرجعه
                    console.log(`[Service Worker] Fetching video from network: ${event.request.url}`);
                    return fetch(event.request).then(networkResponse => {
                        // استنساخ الاستجابة، لأن الاستجابة عبارة عن stream يمكن استهلاكه مرة واحدة فقط
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
    }
});

// الاستماع إلى الرسائل من الصفحة الرئيسية لتخزين فيديو جديد
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CACHE_VIDEO' && event.data.url) {
        // تأكد من أن الـ Service Worker يظل نشطًا حتى اكتمال عملية التخزين
        event.waitUntil(cacheVideo(event.data.url));
    }
});
