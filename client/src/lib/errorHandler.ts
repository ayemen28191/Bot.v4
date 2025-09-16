import { 
  AppError,
  ErrorCategory,
  ErrorSeverity,
  createError,
  createNetworkError,
  createAuthenticationError,
  createValidationError,
  convertJavaScriptError,
  getErrorMessage,
  shouldReportError,
  isRetryableError,
  isUserFriendlyError,
  ERROR_CODES,
  ERROR_MESSAGES
} from '@shared/error-types';
import { safeGetLocalStorageString, safeSetLocalStorageString, safeRemoveLocalStorage } from '@/lib/storage-utils';

// =============================================================================
// تهيئة معالج الأخطاء
// =============================================================================

console.log('🔧 Enhanced error handler initialized');

// =============================================================================
// نظام Throttling للتقارير
// =============================================================================

interface ErrorReportThrottle {
  lastReport: number;
  count: number;
  resetTime: number;
}

const errorReportThrottles = new Map<string, ErrorReportThrottle>();
const ERROR_REPORT_INTERVAL = 5000; // 5 ثواني بين التقارير
const MAX_REPORTS_PER_MINUTE = 10;

function shouldReportErrorThrottled(errorKey: string): boolean {
  const now = Date.now();
  const throttle = errorReportThrottles.get(errorKey);
  
  if (!throttle) {
    errorReportThrottles.set(errorKey, {
      lastReport: now,
      count: 1,
      resetTime: now + 60000 // إعادة تعيين كل دقيقة
    });
    return true;
  }
  
  // إعادة تعيين العداد كل دقيقة
  if (now > throttle.resetTime) {
    throttle.count = 1;
    throttle.resetTime = now + 60000;
    throttle.lastReport = now;
    return true;
  }
  
  // فحص الحد الأقصى للتقارير
  if (throttle.count >= MAX_REPORTS_PER_MINUTE) {
    return false;
  }
  
  // فحص الفترة الزمنية
  if (now - throttle.lastReport < ERROR_REPORT_INTERVAL) {
    return false;
  }
  
  throttle.count++;
  throttle.lastReport = now;
  return true;
}

// =============================================================================
// دوال مساعدة لمعالجة الأخطاء
// =============================================================================

function handleJavaScriptError(event: ErrorEvent): AppError {
  const errorInfo = {
    message: event.message || 'Unknown error message',
    filename: event.filename || 'Unknown file',
    lineno: event.lineno || 0,
    colno: event.colno || 0,
    stack: event.error?.stack || 'No stack trace available'
  };

  return createError(
    ErrorCategory.SYSTEM,
    ERROR_CODES.SYSTEM_INTERNAL_ERROR,
    errorInfo.message,
    {
      details: {
        filename: errorInfo.filename,
        line: errorInfo.lineno,
        column: errorInfo.colno,
        stack: errorInfo.stack,
        userAgent: navigator?.userAgent,
        url: window?.location?.href
      },
      severity: ErrorSeverity.HIGH,
      userFriendly: false
    }
  );
}

function handlePromiseRejection(event: PromiseRejectionEvent): AppError {
  const reason = event.reason;
  
  // إذا كان السبب بالفعل AppError، استخدمه مباشرة
  if (reason && typeof reason === 'object' && 'category' in reason) {
    return reason as AppError;
  }
  
  // إذا كان JavaScript Error، حوله
  if (reason instanceof Error) {
    return convertJavaScriptError(reason);
  }
  
  // خطأ عام للأسباب الأخرى
  const reasonMessage = reason?.toString() || 'Unknown promise rejection';
  
  return createError(
    ErrorCategory.SYSTEM,
    ERROR_CODES.SYSTEM_INTERNAL_ERROR,
    reasonMessage,
    {
      details: {
        originalReason: reason,
        stack: reason?.stack,
        userAgent: navigator?.userAgent,
        url: window?.location?.href
      },
      severity: ErrorSeverity.MEDIUM,
      userFriendly: false
    }
  );
}

// =============================================================================
// دالة إرسال تقارير الأخطاء المحسنة
// =============================================================================

async function reportErrorToServer(error: AppError): Promise<void> {
  try {
    if (!window?.navigator?.onLine) {
      return;
    }

    // فحص ما إذا كان يجب إرسال التقرير
    if (!shouldReportError(error)) {
      return;
    }

    // إنشاء مفتاح فريد للخطأ للـ throttling
    const errorKey = `${error.category}:${error.code}:${error.message.substring(0, 50)}`;
    
    if (!shouldReportErrorThrottled(errorKey)) {
      return;
    }

    const errorReport = {
      category: error.category,
      code: error.code,
      message: error.message,
      messageAr: error.messageAr,
      severity: error.severity,
      timestamp: error.timestamp,
      details: {
        ...error.details,
        userAgent: navigator?.userAgent,
        language: navigator?.language,
        location: window?.location?.href,
        connectionType: (navigator as any)?.connection?.effectiveType,
        platform: navigator?.platform
      }
    };

    await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorReport),
      signal: AbortSignal.timeout(5000) // 5 ثواني timeout
    });

  } catch (reportingError) {
    // تجنب حلقة الأخطاء اللا نهائية
    console.warn('Failed to report error:', reportingError);
  }
}

// =============================================================================
// معالجات الأحداث الرئيسية
// =============================================================================

// معالجة الأخطاء غير المعالجة في JavaScript
window.addEventListener('error', (event) => {
  try {
    if (!event || typeof event !== 'object') {
      console.warn('🚨 Invalid error event received');
      return;
    }

    const appError = handleJavaScriptError(event);
    
    console.error('🚨 Unhandled JavaScript error:', {
      category: appError.category,
      code: appError.code,
      message: appError.message,
      details: appError.details
    });

    // إرسال التقرير
    reportErrorToServer(appError);

  } catch (handlerError) {
    console.warn('Error in JavaScript error handler:', handlerError);
  }
});

// معالجة Promise rejections غير المعالجة
window.addEventListener('unhandledrejection', (event) => {
  try {
    if (!event || typeof event !== 'object') {
      console.warn('🚨 Invalid promise rejection event received');
      return;
    }

    const appError = handlePromiseRejection(event);
    
    console.error('🚨 Unhandled promise rejection:', {
      category: appError.category,
      code: appError.code,
      message: appError.message,
      details: appError.details
    });

    // إرسال التقرير
    reportErrorToServer(appError);

  } catch (handlerError) {
    console.warn('Error in promise rejection handler:', handlerError);
  }
});

// مراقبة حالة الاتصال
window.addEventListener('online', () => {
  console.log('🌐 Connection restored');
  
  // إعادة تحميل الصفحة إذا كان هناك انقطاع طويل
  const lastOffline = safeGetLocalStorageString('last_offline_time');
  if (lastOffline) {
    const offlineTime = Date.now() - parseInt(lastOffline);
    if (offlineTime > 30000) { // 30 ثانية
      console.log('🔄 Long offline period detected, reloading...');
      window.location.reload();
    }
    safeRemoveLocalStorage('last_offline_time');
  }
});

window.addEventListener('offline', () => {
  console.log('📱 Connection lost');
  safeSetLocalStorageString('last_offline_time', Date.now().toString());
});

// =============================================================================
// دوال مساعدة عامة لمعالجة الأخطاء
// =============================================================================

export function createClientError(
  category: ErrorCategory,
  code: string,
  message: string,
  options?: Partial<AppError>
): AppError {
  return createError(category, code, message, {
    severity: options?.severity || ErrorSeverity.MEDIUM,
    userFriendly: options?.userFriendly ?? true,
    retryable: options?.retryable ?? false,
    details: {
      userAgent: navigator?.userAgent,
      url: window?.location?.href,
      language: navigator?.language,
      ...options?.details
    }
  });
}

export function handleApiError(response: Response, url: string): AppError {
  if (response.status === 401) {
    return createAuthenticationError(
      ERROR_CODES.AUTH_SESSION_EXPIRED,
      ERROR_MESSAGES.AUTHENTICATION.SESSION_EXPIRED.en
    );
  }
  
  if (response.status === 403) {
    return createError(
      ErrorCategory.AUTHORIZATION,
      ERROR_CODES.AUTHZ_ACCESS_DENIED,
      ERROR_MESSAGES.AUTHORIZATION.ACCESS_DENIED.en,
      {
        details: { url, statusCode: response.status },
        severity: ErrorSeverity.HIGH
      }
    );
  }
  
  if (response.status === 429) {
    return createError(
      ErrorCategory.API_LIMIT,
      ERROR_CODES.API_RATE_LIMITED,
      ERROR_MESSAGES.API_LIMIT.RATE_LIMITED.en,
      {
        details: { url, statusCode: response.status },
        severity: ErrorSeverity.MEDIUM,
        retryable: true
      }
    );
  }
  
  if (response.status >= 500) {
    return createNetworkError(
      ERROR_CODES.NETWORK_SERVER_ERROR,
      ERROR_MESSAGES.NETWORK.SERVER_ERROR.en,
      url,
      response.status,
      true
    );
  }
  
  return createNetworkError(
    ERROR_CODES.NETWORK_BAD_REQUEST,
    ERROR_MESSAGES.NETWORK.BAD_REQUEST.en,
    url,
    response.status,
    false
  );
}

export function handleNetworkError(error: Error, url?: string): AppError {
  if (error.message.includes('timeout') || error.name === 'TimeoutError') {
    return createNetworkError(
      ERROR_CODES.NETWORK_TIMEOUT,
      ERROR_MESSAGES.NETWORK.TIMEOUT.en,
      url,
      undefined,
      true
    );
  }
  
  if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
    return createNetworkError(
      ERROR_CODES.NETWORK_CONNECTION_FAILED,
      ERROR_MESSAGES.NETWORK.CONNECTION_FAILED.en,
      url,
      undefined,
      true
    );
  }
  
  return convertJavaScriptError(error, ErrorCategory.NETWORK);
}

// =============================================================================
// دالة عرض الأخطاء للمستخدم
// =============================================================================

export function displayErrorToUser(error: AppError, language: 'en' | 'ar' = 'en'): void {
  // عرض الخطأ فقط إذا كان مناسباً للمستخدم
  if (!isUserFriendlyError(error)) {
    return;
  }
  
  const message = getErrorMessage(error, language);
  
  // يمكن تخصيص العرض حسب نوع الخطأ
  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      console.error(`⚠️ ${message}`);
      break;
    case ErrorSeverity.MEDIUM:
      console.warn(`⚡ ${message}`);
      break;
    case ErrorSeverity.LOW:
    default:
      console.info(`ℹ️ ${message}`);
      break;
  }
  
  // يمكن إضافة toast notifications أو modal dialogs هنا
  // showToast(message, error.severity);
}

// =============================================================================
// Wrapper للدوال async لمعالجة الأخطاء تلقائياً
// =============================================================================

export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorContext?: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      let appError: AppError;
      
      if (error && typeof error === 'object' && 'category' in error) {
        appError = error as AppError;
      } else if (error instanceof Error) {
        appError = convertJavaScriptError(error);
      } else {
        appError = createClientError(
          ErrorCategory.UNKNOWN,
          'UNKNOWN_ERROR',
          String(error)
        );
      }
      
      // إضافة سياق إضافي إذا تم توفيره
      if (errorContext) {
        appError.details = {
          ...appError.details,
          context: errorContext
        };
      }
      
      console.error('Error in wrapped function:', appError);
      
      // إرسال التقرير وعرض الخطأ للمستخدم
      reportErrorToServer(appError);
      displayErrorToUser(appError);
      
      throw appError;
    }
  };
}

// =============================================================================
// Enhanced Fetch Override للمعالجة التلقائية للأخطاء
// =============================================================================

const originalFetch = window.fetch;
window.fetch = function(...args): Promise<Response> {
  const url = args[0]?.toString();

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
    const error = createNetworkError(
      ERROR_CODES.NETWORK_BAD_REQUEST,
      'Invalid URL blocked',
      url,
      400,
      false
    );
    return Promise.reject(error);
  }

  return originalFetch.apply(this, args)
    .then((response) => {
      // التحقق من نجاح الاستجابة
      if (!response.ok) {
        const apiError = handleApiError(response, url || 'unknown');
        throw apiError;
      }
      return response;
    })
    .catch((error) => {
      // إذا كان الخطأ بالفعل AppError، إعادة رميه
      if (error && typeof error === 'object' && 'category' in error) {
        throw error;
      }

      // تحديد نوع الخطأ وتجنب التقارير غير الضرورية
      const isAbortError = error?.name === 'AbortError' || 
                         error?.message?.includes('aborted') ||
                         error?.message?.includes('user aborted') ||
                         error?.message?.includes('signal is aborted');

      // تجاهل أخطاء الإلغاء (طبيعية)
      if (isAbortError) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('🔄 Fetch request aborted (normal behavior)');
        }
        throw error;
      }

      // تحويل الخطأ إلى AppError
      const networkError = handleNetworkError(error, url);
      
      // طباعة الخطأ للتطوير
      if (process.env.NODE_ENV === 'development') {
        console.error('🌐 Network error:', {
          category: networkError.category,
          code: networkError.code,
          message: networkError.message,
          url: url
        });
      }

      // إرسال التقرير للأخطاء المهمة فقط
      if (shouldReportError(networkError)) {
        reportErrorToServer(networkError);
      }

      throw networkError;
    });
};

// =============================================================================
// الدوال مصدرة بالفعل عند تعريفها أعلاه
// =============================================================================

// =============================================================================
// نظافة إضافية - تنظيف الـ throttles القديمة
// =============================================================================

// تنظيف الـ throttles القديمة كل 5 دقائق
setInterval(() => {
  const now = Date.now();
  // استخدام Array.from لتجنب مشكلة MapIterator
  const entries = Array.from(errorReportThrottles.entries());
  for (const [key, throttle] of entries) {
    if (now > throttle.resetTime + 300000) { // 5 دقائق إضافية
      errorReportThrottles.delete(key);
    }
  }
}, 300000); // 5 دقائق

export {};