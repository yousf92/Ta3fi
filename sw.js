// --- 1. إعدادات التخزين المؤقت ---
// CACHE_NAME: اسم ذاكرة التخزين المؤقت مع رقم الإصدار.
// قم بتغيير رقم الإصدار (v6, v7, etc.) في كل مرة تقوم فيها بتحديث ملفات التطبيق.
// هذا سيؤدي إلى حذف ذاكرة التخزين المؤقت القديمة وتخزين الملفات الجديدة.
const CACHE_NAME = 'my-app-cache-v6';

// FILES_TO_CACHE: قائمة بالملفات الأساسية للتطبيق التي سيتم تخزينها مؤقتًا.
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html', // زیادکرا
  '/signup.html', // زیادکرا
  '/main.html',
  '/recovery_program.html',
  '/library.html',
  '/diaries.html',
  '/articles.html',
  '/chat.html',
  '/follow-up.html',
  '/settings.html',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80'
];

// --- 2. حدث التثبيت (Install Event) ---
// يتم تشغيل هذا الحدث عند تثبيت الـ Service Worker لأول مرة.
// يقوم بتخزين الملفات الأساسية للتطبيق (App Shell) في ذاكرة التخزين المؤقت.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(FILES_TO_CACHE);
      })
  );
});

// --- 3. حدث التفعيل (Activate Event) ---
// هذا هو الجزء الأهم لتحديث ذاكرة التخزين المؤقت.
// يتم تشغيله بعد تثبيت الـ Service Worker وتفعيله.
// يقوم بحذف أي ذاكرة تخزين مؤقت قديمة لا تتطابق مع CACHE_NAME الحالي.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // إذا كان اسم ذاكرة التخزين المؤقت لا يطابق الإصدار الحالي، قم بحذفه.
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // يجعل الـ Service Worker يتحكم في الصفحة فورًا.
  return self.clients.claim();
});

// --- 4. حدث الجلب (Fetch Event) ---
// يعترض جميع طلبات الشبكة من التطبيق.
// يطبق استراتيجية "Stale-While-Revalidate".
self.addEventListener('fetch', (event) => {
  // نحن لا نخزن طلبات غير GET مؤقتًا
  if (event.request.method !== 'GET') {
    return;
  }
    
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      // أولاً: ابحث عن الطلب في ذاكرة التخزين المؤقت.
      return cache.match(event.request).then((cachedResponse) => {
        // ثانيًا (في الخلفية): أرسل طلبًا إلى الشبكة لجلب نسخة محدثة.
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // إذا نجح الطلب، قم بتحديث ذاكرة التخزين المؤقت بالنسخة الجديدة.
          // نحتاج إلى استنساخ الاستجابة لأنها قابلة للاستخدام مرة واحدة فقط.
          console.log(`[Service Worker] Caching new resource: ${event.request.url}`);
          cache.put(event.request, networkResponse.clone());
          // أرجع النسخة الجديدة من الشبكة.
          return networkResponse;
        }).catch(error => {
          console.error('[Service Worker] Fetch failed; returning offline page instead.', error);
          // يمكنك هنا إرجاع صفحة "أنت غير متصل" مخصصة إذا أردت
        });

        // ثالثًا: أرجع النسخة المخزنة مؤقتًا فورًا إذا كانت موجودة.
        // إذا لم تكن موجودة، انتظر استجابة الشبكة.
        // هذا يجعل التطبيق سريعًا جدًا عند التحميلات المتكررة.
        return cachedResponse || fetchPromise;
      });
    })
  );
});

