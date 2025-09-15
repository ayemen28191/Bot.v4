// معالج الأخطاء العام للتطبيق
console.log('🔧 Error handler initialized');

// معالجة الأخطاء غير المعالجة في JavaScript
window.addEventListener('error', (event) => {
  try {
    // التحقق من صحة event قبل الوصول إلى خصائصه
    if (!event || typeof event !== 'object') {
      console.warn('🚨 Invalid error event received');
      return;
    }

    const errorInfo = {
      message: event.message || 'Unknown error message',
      filename: event.filename || 'Unknown file',
      lineno: event.lineno || 0,
      colno: event.colno || 0,
      error: event.error || null
    };

    console.error('🚨 Unhandled error:', errorInfo);

    // إرسال الخطأ لنظام المراقبة إذا كان متاحاً وإذا سمح throttling
    if (window?.navigator?.onLine && shouldReportError()) {
      try {
        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'javascript_error',
            message: errorInfo.message,
            filename: errorInfo.filename,
            line: errorInfo.lineno,
            column: errorInfo.colno,
            stack: errorInfo.error?.stack || 'No stack trace available',
            userAgent: navigator?.userAgent || 'Unknown',
            timestamp: new Date().toISOString()
          })
        }).catch(() => {
          // تجاهل أخطاء إرسال الأخطاء لتجنب حلقة لا نهائية
        });
      } catch (e) {
        // تجاهل أخطاء إرسال الأخطاء
      }
    }
  } catch (handlerError) {
    console.warn('Error in error handler:', handlerError);
  }
});

// معالجة Promise rejections غير المعالجة
window.addEventListener('unhandledrejection', (event) => {
  try {
    // التحقق من صحة event قبل المعالجة
    if (!event || typeof event !== 'object') {
      console.warn('🚨 Invalid promise rejection event received');
      return;
    }

    const reason = event.reason;
    const reasonMessage = reason?.message || reason?.toString() || 'Unknown promise rejection';
    
    console.error('🚨 Unhandled promise rejection:', reasonMessage);

    // إرسال التقرير فقط إذا سمح throttling
    if (window?.navigator?.onLine && shouldReportError()) {
      try {
        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'promise_rejection',
            message: reasonMessage,
            stack: reason?.stack || 'No stack trace available',
            userAgent: navigator?.userAgent || 'Unknown',
            timestamp: new Date().toISOString()
          })
        }).catch(() => {
          // تجاهل أخطاء الإرسال
        });
      } catch (e) {
        // تجاهل أخطاء الإرسال
      }
    }
  } catch (handlerError) {
    console.warn('Error in promise rejection handler:', handlerError);
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

// إضافة دالة مساعدة لإرسال الأخطاء مع معالجة محسنة
function reportError(errorData: any) {
  try {
    // التحقق من صحة البيانات المدخلة
    if (!errorData || typeof errorData !== 'object') {
      console.warn('Invalid error data provided to reportError');
      return;
    }

    // التحقق من حالة الاتصال
    if (!window?.navigator?.onLine) {
      return;
    }

    // تنظيف البيانات وإضافة معلومات إضافية
    const cleanErrorData = {
      type: errorData.type || 'unknown_error',
      message: errorData.message || 'Unknown error',
      filename: errorData.filename || 'unknown',
      url: errorData.url || 'unknown',
      stack: errorData.stack || 'No stack trace',
      userAgent: navigator?.userAgent || 'Unknown',
      timestamp: new Date().toISOString(),
      // إضافة معلومات سياق إضافية
      location: window?.location?.href || 'unknown',
      language: navigator?.language || 'unknown'
    };

    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanErrorData)
    }).catch(() => {
      // تجاهل أخطاء إرسال الأخطاء لتجنب حلقة لا نهائية
    });
  } catch (e) {
    // تجاهل أخطاء إرسال الأخطاء
    console.warn('Error in reportError function:', e);
  }
}

// إضافة throttling لتقارير الأخطاء
let lastErrorReport = 0;
const ERROR_REPORT_INTERVAL = 5000; // 5 ثواني بين التقارير

function shouldReportError() {
  const now = Date.now();
  if (now - lastErrorReport > ERROR_REPORT_INTERVAL) {
    lastErrorReport = now;
    return true;
  }
  return false;
}

// Override fetch to catch all network errors
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0]?.toString();

  try {
    // تجنب طلبات fetch إلى عناوين غير صالحة في Replit
    const blockedPatterns = [
      '0.0.0.0:443',
      'https://0.0.0.0',
      'localhost:443',
      '127.0.0.1:443',
      'http://localhost:80',
      'http://127.0.0.1:80',
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://'
    ];

    if (url && blockedPatterns.some(pattern => url.includes(pattern))) {
      console.warn('🚫 منع طلب fetch إلى عنوان غير صالح:', url);
      return Promise.reject(new Error('Invalid URL blocked: ' + url));
    }

    return originalFetch.apply(this, args).catch((error) => {
      try {
        // تحقق من نوع الخطأ وتجنب التقارير غير الضرورية
        const isNetworkError = error?.message?.includes('Failed to fetch') || 
                              error?.message?.includes('NetworkError') ||
                              error?.message?.includes('ERR_NETWORK');
        
        const isTemporaryError = error?.message?.includes('timeout') ||
                               error?.message?.includes('ECONNRESET') ||
                               error?.message?.includes('ENOTFOUND');

        const isAbortError = error?.name === 'AbortError' || 
                           error?.message?.includes('aborted') ||
                           error?.message?.includes('user aborted') ||
                           error?.message?.includes('signal is aborted');

        // فقط اطبع الأخطاء المهمة وليس الأخطاء المؤقتة أو أخطاء الشبكة العادية أو أخطاء الإلغاء
        if (!isNetworkError && !isTemporaryError && !isAbortError && 
            !blockedPatterns.some(pattern => url?.includes(pattern))) {
          console.error('🌐 Fetch error:', {
            url: args[0],
            error: error?.message || 'Unknown error',
            type: error?.name || 'Unknown'
          });
        }

        // فقط أرسل تقارير للأخطاء الحقيقية وليس أخطاء الشبكة المؤقتة أو أخطاء الإلغاء
        if (!isNetworkError && !isTemporaryError && !isAbortError && shouldReportError()) {
          reportError({
            type: 'fetch_error',
            message: error?.message || 'Unknown fetch error',
            url: url || 'unknown'
          });
        }
      } catch (reportingError) {
        // تجاهل أخطاء تقارير الأخطاء لتجنب حلقة لا نهائية
        console.warn('Error in error reporting:', reportingError);
      }

      throw error;
    });
  } catch (e) {
    console.error('Error in fetch override:', e);
    // العودة للـ fetch الأصلي في حالة الخطأ
    return originalFetch.apply(this, args);
  }
};

export {};