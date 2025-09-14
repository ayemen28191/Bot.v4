
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

// مراقبة أخطاء الشبكة
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    
    // إذا كان الرد غير ناجح، سجل الخطأ
    if (!response.ok && !args[0].toString().includes('/api/errors')) {
      console.warn('🌐 Network error:', {
        url: args[0],
        status: response.status,
        statusText: response.statusText
      });
    }
    
    return response;
  } catch (error) {
    // أخطاء الشبكة (انقطاع الاتصال، مهلة زمنية، إلخ)
    if (!args[0].toString().includes('/api/errors')) {
      console.error('🌐 Fetch error:', {
        url: args[0],
        error: error.message
      });
    }
    throw error;
  }
};

export {};
