// تحديد اسم ذاكرة التخزين المؤقت وإصدارها
const CACHE_NAME = 'my-app-cache-v1';

// قائمة بالملفات الأساسية التي سيتم تخزينها مؤقتًا
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/main.html',
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

// --- حدث التثبيت (Install Event) ---
// يتم تشغيل هذا الحدث عند تثبيت الـ Service Worker لأول مرة.
// يقوم بفتح ذاكرة التخزين المؤقت وإضافة جميع الملفات الأساسية إليها.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(FILES_TO_CACHE);
      })
  );
});

// --- حدث الجلب (Fetch Event) ---
// يتم تشغيل هذا الحدث عند إرسال أي طلب (مثل طلب صفحة، صورة، أو ملف CSS) من التطبيق.
// يطبق استراتيجية "Cache First": يبحث عن الاستجابة في ذاكرة التخزين المؤقت أولاً،
// وإذا لم يجدها، يطلبها من الشبكة.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // إذا تم العثور على الطلب في ذاكرة التخزين المؤقت، قم بإرجاعه
        if (response) {
          return response;
        }
        // إذا لم يتم العثور عليه، اطلبه من الشبكة
        return fetch(event.request);
      })
  );
});

// --- حدث التفعيل (Activate Event) ---
// يتم تشغيل هذا الحدث بعد تثبيت الـ Service Worker وتفعيله.
// يستخدم لتنظيف ذاكرات التخزين المؤقت القديمة لضمان استخدام أحدث إصدار فقط.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // إذا كان اسم ذاكرة التخزين المؤقت لا يتطابق مع الاسم الحالي، قم بحذفه
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
