import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { 
  AppError, 
  ErrorCategory, 
  ErrorSeverity, 
  createError, 
  createValidationError, 
  createAuthenticationError, 
  createNetworkError, 
  createDatabaseError, 
  createApiLimitError, 
  convertJavaScriptError,
  toErrorResponse,
  getErrorMessage,
  shouldReportError,
  ERROR_CODES,
  ERROR_MESSAGES
} from '@shared/error-types';

// =============================================================================
// واجهات مساعدة
// =============================================================================

interface ErrorContext {
  req: Request;
  userId?: number;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  timestamp: string;
}

// =============================================================================
// نظام منع التكرار والthrottling للأخطاء
// =============================================================================

interface ErrorLogThrottle {
  count: number;
  firstOccurrence: string;
  lastOccurrence: string;
  lastLogged: string;
  hasBeenSummarized: boolean;
}

// Cache للأخطاء المتكررة - يتم reset كل فترة
const errorLogCache = new Map<string, ErrorLogThrottle>();
const ERROR_LOG_WINDOW = 300000; // 5 minutes window
const MAX_LOGS_PER_ERROR_PER_WINDOW = 3; // Max 3 logs per same error per window
const SUMMARY_INTERVAL = 60000; // Log summary every minute

// دالة لإنشاء hash فريد للخطأ للdeduplication
function createErrorHash(error: AppError, context: ErrorContext): string {
  // نستخدم العوامل الأساسية لتحديد تشابه الأخطاء
  const hashData = [
    error.category,
    error.code,
    error.message.substring(0, 100), // أول 100 حرف فقط
    context.req.url || 'unknown',
    context.req.method || 'unknown'
  ].join('|');
  
  return Buffer.from(hashData).toString('base64').substring(0, 32);
}

// دالة لتنظيف الcache من الentries القديمة
function cleanupErrorCache(): void {
  const now = Date.now();
  const windowStart = now - ERROR_LOG_WINDOW;
  
  Array.from(errorLogCache.entries()).forEach(([hash, throttle]) => {
    const lastOccurrenceTime = new Date(throttle.lastOccurrence).getTime();
    if (lastOccurrenceTime < windowStart) {
      errorLogCache.delete(hash);
    }
  });
}

// دالة لتسجيل summary للأخطاء المتكررة
function logErrorSummary(): void {
  const now = new Date().toISOString();
  const summaryTime = Date.now() - SUMMARY_INTERVAL;
  
  Array.from(errorLogCache.entries()).forEach(([hash, throttle]) => {
    const lastLoggedTime = new Date(throttle.lastLogged).getTime();
    
    // إذا مر دقيقة من آخر log ولدينا تكرارات لم يتم تسجيلها
    if (throttle.count > MAX_LOGS_PER_ERROR_PER_WINDOW && 
        Date.now() - lastLoggedTime > SUMMARY_INTERVAL &&
        !throttle.hasBeenSummarized) {
      
      console.warn(`🔄 Error occurred ${throttle.count} times (hash: ${hash.substring(0, 8)}...) between ${throttle.firstOccurrence} and ${throttle.lastOccurrence}`);
      
      throttle.hasBeenSummarized = true;
      throttle.lastLogged = now;
    }
  });
}

// Run cleanup every 5 minutes
setInterval(() => {
  cleanupErrorCache();
  logErrorSummary();
}, ERROR_LOG_WINDOW);

// =============================================================================
// دوال مساعدة لتسجيل الأخطاء
// =============================================================================

async function logError(error: AppError, context: ErrorContext): Promise<void> {
  try {
    // تحديد ما إذا كنا بحاجة لتسجيل هذا الخطأ
    if (!shouldReportError(error)) {
      return;
    }

    // إنشاء hash للخطأ للdeduplication
    const errorHash = createErrorHash(error, context);
    const now = new Date().toISOString();
    
    // فحص الcache للتكرارات
    let throttle = errorLogCache.get(errorHash);
    
    if (!throttle) {
      // أول مرة لهذا الخطأ في الwindow الحالي
      throttle = {
        count: 1,
        firstOccurrence: now,
        lastOccurrence: now,
        lastLogged: now,
        hasBeenSummarized: false
      };
      errorLogCache.set(errorHash, throttle);
    } else {
      // خطأ متكرر - تحديث الإحصائيات
      throttle.count++;
      throttle.lastOccurrence = now;
    }

    // تحديد ما إذا كان سيتم log هذا الخطأ
    const shouldLog = throttle.count <= MAX_LOGS_PER_ERROR_PER_WINDOW;
    
    if (!shouldLog) {
      // لا نريد log ولكن نسجل في الconsole للتطوير (throttled message)
      if (process.env.NODE_ENV === 'development' && throttle.count === MAX_LOGS_PER_ERROR_PER_WINDOW + 1) {
        console.warn(`⏸️ Error throttled (hash: ${errorHash.substring(0, 8)}...) - same error occurred ${throttle.count} times. Further identical errors will be summarized.`);
      }
      return;
    }

    // تجهيز بيانات السجل
    const logData = {
      timestamp: context.timestamp,
      level: 'error',
      category: error.category,
      code: error.code,
      message: error.message,
      messageAr: error.messageAr,
      severity: error.severity,
      userId: context.userId,
      sessionId: context.sessionId,
      userAgent: context.userAgent,
      ip: context.ip,
      url: context.req.url,
      method: context.req.method,
      details: error.details,
      errorHash: errorHash.substring(0, 8), // أول 8 أحرف للمرجع
      occurrence: throttle.count > 1 ? `${throttle.count}x` : 'first'
    };

    // تحديث آخر وقت تم فيه log
    throttle.lastLogged = now;

    // طباعة الخطأ في Console للتطوير
    if (process.env.NODE_ENV === 'development') {
      const emoji = throttle.count === 1 ? '🚨' : '🔄';
      console.error(`${emoji} Error logged (${logData.occurrence}):`, logData);
    }

    // يمكن إضافة تسجيل في قاعدة البيانات أو خدمة خارجية هنا
    // await logToDatabase(logData);
    // await sendToExternalService(logData);

  } catch (loggingError) {
    // تجنب إنشاء حلقة أخطاء لا نهائية
    console.error('Failed to log error:', loggingError);
  }
}

// =============================================================================
// دوال تحويل الأخطاء الشائعة
// =============================================================================

export function handleZodError(zodError: ZodError): AppError {
  const firstIssue = zodError.issues[0];
  const field = firstIssue.path.join('.');
  const originalMessage = firstIssue.message;
  
  // تحديد نوع الخطأ بناءً على كود Zod وإنشاء رسائل إنجليزية وعربية متسقة
  let errorMessage: string;
  let messageAr: string;
  
  switch (firstIssue.code) {
    case 'invalid_type':
      errorMessage = `Invalid type for field '${field}'. Expected ${(firstIssue as any).expected}, received ${(firstIssue as any).received}`;
      messageAr = `نوع بيانات غير صالح للحقل '${field}'. المتوقع: ${getArabicType((firstIssue as any).expected)}, المستلم: ${getArabicType((firstIssue as any).received)}`;
      break;
    case 'too_small':
      if (firstIssue.type === 'string') {
        errorMessage = `Field '${field}' is too short. Minimum length: ${firstIssue.minimum}`;
        messageAr = `الحقل '${field}' قصير جداً. الحد الأدنى للطول: ${firstIssue.minimum} حرف`;
      } else if (firstIssue.type === 'number') {
        errorMessage = `Field '${field}' is too small. Minimum value: ${firstIssue.minimum}`;
        messageAr = `الحقل '${field}' صغير جداً. الحد الأدنى للقيمة: ${firstIssue.minimum}`;
      } else if (firstIssue.type === 'array') {
        errorMessage = `Field '${field}' has too few items. Minimum required: ${firstIssue.minimum}`;
        messageAr = `الحقل '${field}' يحتوي على عناصر قليلة جداً. الحد الأدنى المطلوب: ${firstIssue.minimum} عنصر`;
      } else {
        errorMessage = `Field '${field}' is too small. Minimum required: ${firstIssue.minimum}`;
        messageAr = `الحقل '${field}' صغير جداً. الحد الأدنى المطلوب: ${firstIssue.minimum}`;
      }
      break;
    case 'too_big':
      if (firstIssue.type === 'string') {
        errorMessage = `Field '${field}' is too long. Maximum length: ${firstIssue.maximum}`;
        messageAr = `الحقل '${field}' طويل جداً. الحد الأقصى للطول: ${firstIssue.maximum} حرف`;
      } else if (firstIssue.type === 'number') {
        errorMessage = `Field '${field}' is too large. Maximum value: ${firstIssue.maximum}`;
        messageAr = `الحقل '${field}' كبير جداً. الحد الأقصى للقيمة: ${firstIssue.maximum}`;
      } else if (firstIssue.type === 'array') {
        errorMessage = `Field '${field}' has too many items. Maximum allowed: ${firstIssue.maximum}`;
        messageAr = `الحقل '${field}' يحتوي على عناصر كثيرة جداً. الحد الأقصى المسموح: ${firstIssue.maximum} عنصر`;
      } else {
        errorMessage = `Field '${field}' is too large. Maximum allowed: ${firstIssue.maximum}`;
        messageAr = `الحقل '${field}' كبير جداً. الحد الأقصى المسموح: ${firstIssue.maximum}`;
      }
      break;
    case 'invalid_string':
      const validation = (firstIssue as any).validation;
      if (validation === 'email') {
        errorMessage = `Field '${field}' must be a valid email address`;
        messageAr = `الحقل '${field}' يجب أن يكون عنوان بريد إلكتروني صالح`;
      } else if (validation === 'url') {
        errorMessage = `Field '${field}' must be a valid URL`;
        messageAr = `الحقل '${field}' يجب أن يكون رابط URL صالح`;
      } else if (validation === 'regex') {
        errorMessage = `Field '${field}' format is invalid`;
        messageAr = `تنسيق الحقل '${field}' غير صالح`;
      } else {
        errorMessage = `Invalid format for field '${field}'`;
        messageAr = `تنسيق غير صالح للحقل '${field}'`;
      }
      break;
    case 'invalid_enum_value':
      const options = (firstIssue as any).options?.join(', ') || 'valid options';
      errorMessage = `Field '${field}' has invalid value. Allowed values: ${options}`;
      messageAr = `الحقل '${field}' يحتوي على قيمة غير صالحة. القيم المسموحة: ${options}`;
      break;
    case 'invalid_date':
      errorMessage = `Field '${field}' must be a valid date`;
      messageAr = `الحقل '${field}' يجب أن يكون تاريخ صالح`;
      break;
    case 'invalid_literal':
      errorMessage = `Field '${field}' must be exactly '${(firstIssue as any).expected}'`;
      messageAr = `الحقل '${field}' يجب أن يكون بالضبط '${(firstIssue as any).expected}'`;
      break;
    case 'unrecognized_keys':
      const keys = (firstIssue as any).keys?.join(', ') || 'unknown keys';
      errorMessage = `Unrecognized properties: ${keys}`;
      messageAr = `خصائص غير معروفة: ${keys}`;
      break;
    case 'invalid_union':
      errorMessage = `Field '${field}' does not match any of the expected types`;
      messageAr = `الحقل '${field}' لا يتطابق مع أي من الأنواع المتوقعة`;
      break;
    case 'invalid_arguments':
      errorMessage = `Invalid function arguments for '${field}'`;
      messageAr = `معاملات دالة غير صالحة للحقل '${field}'`;
      break;
    case 'invalid_return_type':
      errorMessage = `Invalid return type for '${field}'`;
      messageAr = `نوع إرجاع غير صالح للحقل '${field}'`;
      break;
    case 'custom':
      errorMessage = `Validation failed for field '${field}': ${originalMessage}`;
      messageAr = `فشل التحقق من صحة الحقل '${field}': ${originalMessage}`;
      break;
    default:
      errorMessage = `Validation failed for field '${field}': ${originalMessage}`;
      messageAr = `فشل التحقق من صحة الحقل '${field}': ${originalMessage}`;
  }

  // استخدام createError مع messageAr في options
  return createError(
    ErrorCategory.VALIDATION,
    ERROR_CODES.VALIDATION_FORMAT,
    errorMessage,
    {
      messageAr,
      severity: ErrorSeverity.LOW,
      userFriendly: true,
      details: {
        field,
        value: (firstIssue as any).received,
        zodCode: firstIssue.code,
        expectedType: (firstIssue as any).expected,
        receivedType: (firstIssue as any).received,
        validation: (firstIssue as any).validation,
        path: firstIssue.path
      }
    }
  ) as AppError;
}

// Helper function to translate types to Arabic
function getArabicType(type: any): string {
  const typeTranslations: Record<string, string> = {
    'string': 'نص',
    'number': 'رقم',
    'boolean': 'منطقي',
    'array': 'مصفوفة',
    'object': 'كائن',
    'date': 'تاريخ',
    'undefined': 'غير محدد',
    'null': 'فارغ',
    'bigint': 'رقم كبير',
    'symbol': 'رمز',
    'function': 'دالة',
    'unknown': 'غير معروف'
  };
  
  return typeTranslations[String(type).toLowerCase()] || String(type);
}

export function handleDatabaseError(error: Error): AppError {
  const message = error.message.toLowerCase();
  
  if (message.includes('unique constraint') || message.includes('duplicate')) {
    return createDatabaseError(
      ERROR_CODES.DB_DUPLICATE_ENTRY,
      ERROR_MESSAGES.DATABASE.DUPLICATE_ENTRY.en,
      undefined,
      'INSERT'
    );
  }
  
  if (message.includes('not found') || message.includes('no such table')) {
    return createDatabaseError(
      ERROR_CODES.DB_NOT_FOUND,
      ERROR_MESSAGES.DATABASE.NOT_FOUND.en,
      undefined,
      'SELECT'
    );
  }
  
  if (message.includes('connection') || message.includes('timeout')) {
    return createDatabaseError(
      ERROR_CODES.DB_CONNECTION_FAILED,
      ERROR_MESSAGES.DATABASE.CONNECTION_FAILED.en
    );
  }
  
  // خطأ عام في قاعدة البيانات
  return createDatabaseError(
    ERROR_CODES.DB_QUERY_FAILED,
    ERROR_MESSAGES.DATABASE.QUERY_FAILED.en,
    undefined,
    'UNKNOWN'
  );
}

export function handleNetworkError(error: Error, url?: string): AppError {
  const message = error.message.toLowerCase();
  
  if (message.includes('timeout')) {
    return createNetworkError(
      ERROR_CODES.NETWORK_TIMEOUT,
      ERROR_MESSAGES.NETWORK.TIMEOUT.en,
      url,
      undefined,
      true
    );
  }
  
  if (message.includes('connection') || message.includes('fetch')) {
    return createNetworkError(
      ERROR_CODES.NETWORK_CONNECTION_FAILED,
      ERROR_MESSAGES.NETWORK.CONNECTION_FAILED.en,
      url,
      undefined,
      true
    );
  }
  
  return createNetworkError(
    ERROR_CODES.NETWORK_SERVER_ERROR,
    ERROR_MESSAGES.NETWORK.SERVER_ERROR.en,
    url,
    500,
    false
  );
}

export function handleApiLimitError(error: Error, provider?: string): AppError {
  const message = error.message.toLowerCase();
  
  if (message.includes('rate limit') || message.includes('429')) {
    return createApiLimitError(
      ERROR_CODES.API_RATE_LIMITED,
      ERROR_MESSAGES.API_LIMIT.RATE_LIMITED.en,
      provider
    );
  }
  
  if (message.includes('quota') || message.includes('credits')) {
    return createApiLimitError(
      ERROR_CODES.API_QUOTA_EXCEEDED,
      ERROR_MESSAGES.API_LIMIT.QUOTA_EXCEEDED.en,
      provider
    );
  }
  
  if (message.includes('api key') || message.includes('unauthorized')) {
    return createApiLimitError(
      ERROR_CODES.API_KEY_INVALID,
      ERROR_MESSAGES.API_LIMIT.KEY_INVALID.en,
      provider
    );
  }
  
  return createApiLimitError(
    ERROR_CODES.API_RATE_LIMITED,
    error.message,
    provider
  );
}

// =============================================================================
// Middleware لمعالجة الأخطاء
// =============================================================================

export function errorHandler(
  error: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  // منع إرسال headers متعددة
  if (res.headersSent) {
    return;
  }

  try {
    // إنشاء سياق الخطأ
    const context: ErrorContext = {
      req,
      userId: (req as any).user?.id,
      sessionId: req.sessionID,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString()
    };

    // تحويل الخطأ إلى AppError
    let appError: AppError;

    if (error.category) {
      // الخطأ بالفعل من نوع AppError
      appError = error as AppError;
    } else if (error instanceof ZodError) {
      // خطأ في التحقق من صحة البيانات
      appError = handleZodError(error);
    } else if (error.name === 'SequelizeError' || error.name === 'DatabaseError' || 
               error.message.includes('SQLITE') || error.message.includes('database')) {
      // خطأ في قاعدة البيانات
      appError = handleDatabaseError(error);
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || 
               error.code === 'ETIMEDOUT' || error.name === 'FetchError') {
      // خطأ في الشبكة
      appError = handleNetworkError(error, req.url);
    } else if (error.message.includes('API') || error.message.includes('rate limit') || 
               error.message.includes('quota')) {
      // خطأ في حدود API
      appError = handleApiLimitError(error);
    } else {
      // تحويل JavaScript Error عادي
      appError = convertJavaScriptError(error);
    }

    // تسجيل الخطأ
    logError(appError, context);

    // تحديد رمز حالة HTTP
    let httpStatus = 500;
    switch (appError.category) {
      case ErrorCategory.VALIDATION:
        httpStatus = 400;
        break;
      case ErrorCategory.AUTHENTICATION:
        httpStatus = 401;
        break;
      case ErrorCategory.AUTHORIZATION:
        httpStatus = 403;
        break;
      case ErrorCategory.NETWORK:
        httpStatus = 502;
        break;
      case ErrorCategory.API_LIMIT:
        httpStatus = 429;
        break;
      case ErrorCategory.DATABASE:
      case ErrorCategory.SYSTEM:
        httpStatus = 500;
        break;
      default:
        httpStatus = 500;
    }

    // إرسال الاستجابة
    const errorResponse = toErrorResponse(appError);
    res.status(httpStatus).json(errorResponse);

  } catch (handlerError) {
    // خطأ في معالج الأخطاء نفسه - إرسال خطأ بسيط
    console.error('Error in error handler:', handlerError);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          category: ErrorCategory.SYSTEM,
          code: ERROR_CODES.SYSTEM_INTERNAL_ERROR,
          message: ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR.en,
          messageAr: ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR.ar,
          timestamp: new Date().toISOString(),
          severity: ErrorSeverity.CRITICAL
        }
      });
    }
  }
}

// =============================================================================
// دوال مساعدة لرمي الأخطاء في الكود
// =============================================================================

export function throwValidationError(field: string, value: any, expected?: string): never {
  const error = createValidationError(
    ERROR_CODES.VALIDATION_REQUIRED,
    `Validation failed for field '${field}'${expected ? `: ${expected}` : ''}`,
    field,
    value
  );
  throw error;
}

export function throwAuthenticationError(message?: string, userId?: number): never {
  const error = createAuthenticationError(
    ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    message || ERROR_MESSAGES.AUTHENTICATION.INVALID_CREDENTIALS.en,
    userId
  );
  throw error;
}

export function throwAuthorizationError(resource?: string, action?: string, userId?: number): never {
  const error = createError(ErrorCategory.AUTHORIZATION, ERROR_CODES.AUTHZ_ACCESS_DENIED, 
    ERROR_MESSAGES.AUTHORIZATION.ACCESS_DENIED.en, {
    details: { resource, action },
    severity: ErrorSeverity.HIGH,
    userFriendly: true
  });
  (error as any).userId = userId;
  throw error;
}

export function throwDatabaseError(operation: string, table?: string): never {
  const error = createDatabaseError(
    ERROR_CODES.DB_QUERY_FAILED,
    ERROR_MESSAGES.DATABASE.QUERY_FAILED.en,
    table,
    operation
  );
  throw error;
}

export function throwNetworkError(url: string, statusCode?: number): never {
  const error = createNetworkError(
    ERROR_CODES.NETWORK_CONNECTION_FAILED,
    ERROR_MESSAGES.NETWORK.CONNECTION_FAILED.en,
    url,
    statusCode,
    true
  );
  throw error;
}

export function throwApiLimitError(provider: string, keyId?: number): never {
  const error = createApiLimitError(
    ERROR_CODES.API_RATE_LIMITED,
    ERROR_MESSAGES.API_LIMIT.RATE_LIMITED.en,
    provider,
    keyId
  );
  throw error;
}

// =============================================================================
// Wrapper للدوال async لمعالجة الأخطاء تلقائياً
// =============================================================================

export function asyncErrorHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return (...args: T): Promise<R> => {
    return Promise.resolve(fn(...args)).catch((error) => {
      // إذا كان الخطأ بالفعل AppError، إعادة رميه
      if (error.category) {
        throw error;
      }
      
      // تحويل الخطأ وإعادة رميه
      const appError = convertJavaScriptError(error);
      throw appError;
    });
  };
}

// =============================================================================
// دوال مساعدة للتحقق من الأخطاء
// =============================================================================

export function isAppError(error: any): error is AppError {
  return error && typeof error === 'object' && 'category' in error && 'code' in error;
}

export function isRetryableError(error: any): boolean {
  if (isAppError(error)) {
    return error.retryable || false;
  }
  
  // التحقق من أخطاء الشبكة العادية
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || 
      error.name === 'FetchError' || error.message.includes('timeout')) {
    return true;
  }
  
  return false;
}

export function getHttpStatusFromError(error: AppError): number {
  switch (error.category) {
    case ErrorCategory.VALIDATION:
      return 400;
    case ErrorCategory.AUTHENTICATION:
      return 401;
    case ErrorCategory.AUTHORIZATION:
      return 403;
    case ErrorCategory.NETWORK:
      return 502;
    case ErrorCategory.API_LIMIT:
      return 429;
    case ErrorCategory.DATABASE:
    case ErrorCategory.SYSTEM:
      return 500;
    default:
      return 500;
  }
}

// =============================================================================
// Middleware لالتقاط الأخطاء في Express routes
// =============================================================================

export function catchAsync(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// =============================================================================
// دالة لتهيئة معالج الأخطاء في التطبيق
// =============================================================================

export function setupErrorHandling(app: any): void {
  // معالج 404 - المسار غير موجود
  app.use('*', (req: Request, res: Response, next: NextFunction) => {
    const error = createError(
      ErrorCategory.AUTHORIZATION,
      ERROR_CODES.AUTHZ_RESOURCE_NOT_FOUND,
      `Route ${req.originalUrl} not found`,
      {
        severity: ErrorSeverity.LOW,
        userFriendly: true,
        details: { method: req.method, url: req.originalUrl }
      }
    );
    next(error);
  });

  // معالج الأخطاء الرئيسي
  app.use(errorHandler);
}