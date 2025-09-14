// معالج الأخطاء العام للتطبيق
console.log('🔧 Error handler initialized');

// معالجة الأخطاء غير المعالجة في JavaScript
window.addEventListener('error', (event) => {
  console.error('🚨 Unhandled error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });

  // إرسال الخطأ لنظام المراقبة إذا كان متاحاً
  if (window.navigator.onLine) {
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'javascript_error',
          message: event.message,
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
          stack: event.error?.stack,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {
        // تجاهل أخطاء إرسال الأخطاء لتجنب حلقة لا نهائية
      });
    } catch (e) {
      // تجاهل أخطاء إرسال الأخطاء
    }
  }
});

// معالجة Promise rejections غير المعالجة
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection:', event.reason);

  if (window.navigator.onLine) {
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'promise_rejection',
          message: event.reason?.message || 'Promise rejection',
          stack: event.reason?.stack,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {
        // تجاهل أخطاء الإرسال
      });
    } catch (e) {
      // تجاهل أخطاء الإرسال
    }
  }
});

// مراقبة حالة الاتصال
window.addEventListener('online', () => {
  console.log('🌐 Connection restored');
  // إعادة تحميل الصفحة إذا كان هناك انقطاع طويل
  const lastOffline = localStorage.getItem('last_offline_time');
  if (lastOffline) {
    const offlineTime = Date.now() - parseInt(lastOffline);
    if (offlineTime > 30000) { // 30 ثانية
      console.log('🔄 Long offline period detected, reloading...');
      window.location.reload();
    }
    localStorage.removeItem('last_offline_time');
  }
});

window.addEventListener('offline', () => {
  console.log('📱 Connection lost');
  localStorage.setItem('last_offline_time', Date.now().toString());
});

// إضافة دالة مساعدة لإرسال الأخطاء
function reportError(errorData: any) {
  if (window.navigator.onLine) {
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...errorData,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {
        // تجاهل أخطاء إرسال الأخطاء لتجنب حلقة لا نهائية
      });
    } catch (e) {
      // تجاهل أخطاء إرسال الأخطاء
    }
  }
}

// Override fetch to catch all network errors
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0]?.toString();

  // تجنب طلبات fetch إلى عناوين غير صالحة في Replit
  const blockedPatterns = [
    '0.0.0.0:443',
    'https://0.0.0.0',
    'localhost:443',
    '127.0.0.1:443',
    'http://localhost:80',
    'http://127.0.0.1:80'
  ];

  if (url && blockedPatterns.some(pattern => url.includes(pattern))) {
    console.warn('🚫 منع طلب fetch إلى عنوان غير صالح:', url);
    return Promise.reject(new Error('Invalid URL blocked: ' + url));
  }

  return originalFetch.apply(this, args).catch((error) => {
    // تجنب طباعة أخطاء العناوين المحظورة بشكل متكرر
    if (!url || !blockedPatterns.some(pattern => url.includes(pattern))) {
      console.error('🌐 Fetch error:', {
        url: args[0],
        error: error.message
      });

      // Report fetch errors (exclude blocked URLs)
      reportError({
        type: 'fetch_error',
        message: error.message,
        url: url
      });
    }

    throw error;
  });
};

export {};