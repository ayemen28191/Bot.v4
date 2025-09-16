import { z } from 'zod';

// =============================================================================
// تعريف أنواع الأخطاء الأساسية
// =============================================================================

export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  DATABASE = 'database',
  API_LIMIT = 'api_limit',
  FILE_SYSTEM = 'file_system',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// =============================================================================
// واجهات الأخطاء المختلفة
// =============================================================================

export interface BaseError {
  category: ErrorCategory;
  code: string;
  message: string;
  messageAr?: string;
  details?: Record<string, any>;
  timestamp: string;
  severity: ErrorSeverity;
  retryable?: boolean;
  userFriendly?: boolean;
}

export interface ValidationError extends BaseError {
  category: ErrorCategory.VALIDATION;
  field?: string;
  value?: any;
  expected?: string;
}

export interface AuthenticationError extends BaseError {
  category: ErrorCategory.AUTHENTICATION;
  userId?: number;
  attemptCount?: number;
}

export interface AuthorizationError extends BaseError {
  category: ErrorCategory.AUTHORIZATION;
  userId?: number;
  resource?: string;
  action?: string;
}

export interface NetworkError extends BaseError {
  category: ErrorCategory.NETWORK;
  url?: string;
  method?: string;
  statusCode?: number;
  timeout?: boolean;
}

export interface DatabaseError extends BaseError {
  category: ErrorCategory.DATABASE;
  table?: string;
  operation?: string;
  query?: string;
}

export interface ApiLimitError extends BaseError {
  category: ErrorCategory.API_LIMIT;
  provider?: string;
  limit?: number;
  resetTime?: string;
  keyId?: number;
}

export interface FileSystemError extends BaseError {
  category: ErrorCategory.FILE_SYSTEM;
  path?: string;
  operation?: string;
  permissions?: boolean;
}

export interface BusinessLogicError extends BaseError {
  category: ErrorCategory.BUSINESS_LOGIC;
  operation?: string;
  constraints?: string[];
}

export interface SystemError extends BaseError {
  category: ErrorCategory.SYSTEM;
  service?: string;
  component?: string;
}

// تجميع جميع أنواع الأخطاء
export type AppError = ValidationError | AuthenticationError | AuthorizationError | 
                      NetworkError | DatabaseError | ApiLimitError | 
                      FileSystemError | BusinessLogicError | SystemError;

// =============================================================================
// رسائل الأخطاء الموحدة
// =============================================================================

export const ERROR_MESSAGES = {
  // أخطاء التحقق من صحة البيانات
  VALIDATION: {
    REQUIRED_FIELD: {
      en: 'This field is required',
      ar: 'هذا الحقل مطلوب'
    },
    INVALID_EMAIL: {
      en: 'Please enter a valid email address',
      ar: 'يرجى إدخال عنوان بريد إلكتروني صالح'
    },
    INVALID_PASSWORD: {
      en: 'Password must be at least 8 characters long',
      ar: 'كلمة المرور يجب أن تكون على الأقل 8 أحرف'
    },
    INVALID_FORMAT: {
      en: 'Invalid format provided',
      ar: 'التنسيق المدخل غير صالح'
    },
    OUT_OF_RANGE: {
      en: 'Value is out of acceptable range',
      ar: 'القيمة خارج النطاق المقبول'
    }
  },

  // أخطاء المصادقة
  AUTHENTICATION: {
    INVALID_CREDENTIALS: {
      en: 'Invalid username or password',
      ar: 'اسم المستخدم أو كلمة المرور غير صحيحة'
    },
    SESSION_EXPIRED: {
      en: 'Your session has expired. Please log in again',
      ar: 'انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى'
    },
    NO_SESSION: {
      en: 'No active session found',
      ar: 'لا توجد جلسة نشطة'
    },
    TOO_MANY_ATTEMPTS: {
      en: 'Too many login attempts. Please try again later',
      ar: 'محاولات تسجيل دخول كثيرة. يرجى المحاولة لاحقاً'
    }
  },

  // أخطاء التخويل
  AUTHORIZATION: {
    ACCESS_DENIED: {
      en: 'Access denied. You do not have permission to perform this action',
      ar: 'تم رفض الوصول. ليس لديك صلاحية لتنفيذ هذا الإجراء'
    },
    INSUFFICIENT_PRIVILEGES: {
      en: 'Insufficient privileges for this operation',
      ar: 'صلاحيات غير كافية لهذه العملية'
    },
    RESOURCE_NOT_FOUND: {
      en: 'The requested resource was not found',
      ar: 'المورد المطلوب غير موجود'
    }
  },

  // أخطاء الشبكة
  NETWORK: {
    CONNECTION_FAILED: {
      en: 'Connection failed. Please check your internet connection',
      ar: 'فشل الاتصال. يرجى التحقق من اتصال الإنترنت'
    },
    TIMEOUT: {
      en: 'Request timeout. Please try again',
      ar: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى'
    },
    SERVER_ERROR: {
      en: 'Server error occurred. Please try again later',
      ar: 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً'
    },
    BAD_REQUEST: {
      en: 'Bad request. Please check your input',
      ar: 'طلب غير صالح. يرجى التحقق من المدخلات'
    }
  },

  // أخطاء قاعدة البيانات
  DATABASE: {
    CONNECTION_FAILED: {
      en: 'Database connection failed',
      ar: 'فشل الاتصال بقاعدة البيانات'
    },
    QUERY_FAILED: {
      en: 'Database query failed',
      ar: 'فشل استعلام قاعدة البيانات'
    },
    DUPLICATE_ENTRY: {
      en: 'This entry already exists',
      ar: 'هذا الإدخال موجود بالفعل'
    },
    NOT_FOUND: {
      en: 'Record not found in database',
      ar: 'السجل غير موجود في قاعدة البيانات'
    }
  },

  // أخطاء حدود API
  API_LIMIT: {
    RATE_LIMITED: {
      en: 'Rate limit exceeded. Please try again later',
      ar: 'تم تجاوز حد المعدل. يرجى المحاولة لاحقاً'
    },
    QUOTA_EXCEEDED: {
      en: 'API quota exceeded for this period',
      ar: 'تم تجاوز حد API لهذه الفترة'
    },
    KEY_INVALID: {
      en: 'API key is invalid or expired',
      ar: 'مفتاح API غير صالح أو منتهي الصلاحية'
    }
  },

  // أخطاء نظام الملفات
  FILE_SYSTEM: {
    FILE_NOT_FOUND: {
      en: 'File not found',
      ar: 'الملف غير موجود'
    },
    PERMISSION_DENIED: {
      en: 'Permission denied to access file',
      ar: 'تم رفض الإذن للوصول إلى الملف'
    },
    DISK_FULL: {
      en: 'Disk space is full',
      ar: 'مساحة القرص ممتلئة'
    },
    INVALID_PATH: {
      en: 'Invalid file path provided',
      ar: 'مسار ملف غير صالح'
    }
  },

  // أخطاء منطق العمل
  BUSINESS_LOGIC: {
    OPERATION_NOT_ALLOWED: {
      en: 'This operation is not allowed',
      ar: 'هذه العملية غير مسموحة'
    },
    MARKET_CLOSED: {
      en: 'Market is currently closed',
      ar: 'السوق مغلق حالياً'
    },
    INSUFFICIENT_BALANCE: {
      en: 'Insufficient balance for this operation',
      ar: 'رصيد غير كافي لهذه العملية'
    },
    INVALID_STATE: {
      en: 'Invalid state for this operation',
      ar: 'حالة غير صالحة لهذه العملية'
    }
  },

  // أخطاء النظام
  SYSTEM: {
    INTERNAL_ERROR: {
      en: 'Internal system error occurred',
      ar: 'حدث خطأ داخلي في النظام'
    },
    SERVICE_UNAVAILABLE: {
      en: 'Service is temporarily unavailable',
      ar: 'الخدمة غير متاحة مؤقتاً'
    },
    MAINTENANCE_MODE: {
      en: 'System is under maintenance',
      ar: 'النظام تحت الصيانة'
    },
    CONFIGURATION_ERROR: {
      en: 'System configuration error',
      ar: 'خطأ في تكوين النظام'
    }
  },

  // رسائل عامة
  GENERAL: {
    UNKNOWN_ERROR: {
      en: 'An unknown error occurred',
      ar: 'حدث خطأ غير معروف'
    },
    PLEASE_TRY_AGAIN: {
      en: 'Please try again',
      ar: 'يرجى المحاولة مرة أخرى'
    },
    CONTACT_SUPPORT: {
      en: 'Please contact support if the problem persists',
      ar: 'يرجى الاتصال بالدعم إذا استمرت المشكلة'
    }
  }
} as const;

// =============================================================================
// دوال مساعدة لإنشاء الأخطاء
// =============================================================================

export function createError(
  category: ErrorCategory,
  code: string,
  message: string,
  options: Partial<Omit<BaseError, 'category' | 'code' | 'message' | 'timestamp'>> = {}
): AppError {
  const baseError: BaseError = {
    category,
    code,
    message,
    timestamp: new Date().toISOString(),
    severity: options.severity || ErrorSeverity.MEDIUM,
    retryable: options.retryable || false,
    userFriendly: options.userFriendly || true,
    ...options
  };

  return baseError as AppError;
}

export function createValidationError(
  code: string,
  message: string,
  field?: string,
  value?: any
): ValidationError {
  return createError(ErrorCategory.VALIDATION, code, message, {
    field,
    value,
    severity: ErrorSeverity.LOW,
    userFriendly: true
  }) as ValidationError;
}

export function createAuthenticationError(
  code: string,
  message: string,
  userId?: number,
  attemptCount?: number
): AuthenticationError {
  return createError(ErrorCategory.AUTHENTICATION, code, message, {
    userId,
    attemptCount,
    severity: ErrorSeverity.HIGH,
    userFriendly: true
  }) as AuthenticationError;
}

export function createNetworkError(
  code: string,
  message: string,
  url?: string,
  statusCode?: number,
  retryable: boolean = true
): NetworkError {
  return createError(ErrorCategory.NETWORK, code, message, {
    url,
    details: { statusCode },
    severity: statusCode && statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
    retryable,
    userFriendly: true
  }) as NetworkError;
}

export function createDatabaseError(
  code: string,
  message: string,
  table?: string,
  operation?: string
): DatabaseError {
  return createError(ErrorCategory.DATABASE, code, message, {
    table,
    operation,
    severity: ErrorSeverity.HIGH,
    userFriendly: false
  }) as DatabaseError;
}

export function createApiLimitError(
  code: string,
  message: string,
  provider?: string,
  keyId?: number,
  resetTime?: string
): ApiLimitError {
  return createError(ErrorCategory.API_LIMIT, code, message, {
    provider,
    details: { keyId, resetTime },
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    userFriendly: true
  }) as ApiLimitError;
}

// =============================================================================
// دوال مساعدة للتعامل مع الأخطاء
// =============================================================================

export function getErrorMessage(error: AppError, language: 'en' | 'ar' = 'en'): string {
  if (language === 'ar' && error.messageAr) {
    return error.messageAr;
  }
  return error.message;
}

export function isRetryableError(error: AppError): boolean {
  return error.retryable || false;
}

export function isUserFriendlyError(error: AppError): boolean {
  return error.userFriendly || false;
}

export function getErrorSeverityLevel(error: AppError): number {
  switch (error.severity) {
    case ErrorSeverity.LOW: return 1;
    case ErrorSeverity.MEDIUM: return 2;
    case ErrorSeverity.HIGH: return 3;
    case ErrorSeverity.CRITICAL: return 4;
    default: return 2;
  }
}

export function shouldReportError(error: AppError): boolean {
  // تقرير الأخطاء عالية الأولوية والحرجة فقط
  return getErrorSeverityLevel(error) >= 3;
}

// =============================================================================
// معرفات أخطاء شائعة
// =============================================================================

export const ERROR_CODES = {
  // أخطاء التحقق
  VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
  VALIDATION_FORMAT: 'VALIDATION_FORMAT',
  VALIDATION_RANGE: 'VALIDATION_RANGE',
  
  // أخطاء المصادقة
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_NO_SESSION: 'AUTH_NO_SESSION',
  AUTH_TOO_MANY_ATTEMPTS: 'AUTH_TOO_MANY_ATTEMPTS',
  
  // أخطاء التخويل
  AUTHZ_ACCESS_DENIED: 'AUTHZ_ACCESS_DENIED',
  AUTHZ_INSUFFICIENT_PRIVILEGES: 'AUTHZ_INSUFFICIENT_PRIVILEGES',
  AUTHZ_RESOURCE_NOT_FOUND: 'AUTHZ_RESOURCE_NOT_FOUND',
  
  // أخطاء الشبكة
  NETWORK_CONNECTION_FAILED: 'NETWORK_CONNECTION_FAILED',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_SERVER_ERROR: 'NETWORK_SERVER_ERROR',
  NETWORK_BAD_REQUEST: 'NETWORK_BAD_REQUEST',
  
  // أخطاء قاعدة البيانات
  DB_CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  DB_DUPLICATE_ENTRY: 'DB_DUPLICATE_ENTRY',
  DB_NOT_FOUND: 'DB_NOT_FOUND',
  
  // أخطاء API
  API_RATE_LIMITED: 'API_RATE_LIMITED',
  API_QUOTA_EXCEEDED: 'API_QUOTA_EXCEEDED',
  API_KEY_INVALID: 'API_KEY_INVALID',
  
  // أخطاء النظام
  SYSTEM_INTERNAL_ERROR: 'SYSTEM_INTERNAL_ERROR',
  SYSTEM_SERVICE_UNAVAILABLE: 'SYSTEM_SERVICE_UNAVAILABLE',
  SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE'
} as const;

// =============================================================================
// دوال مساعدة للتحويل من Native JavaScript Errors
// =============================================================================

export function convertJavaScriptError(error: Error, category?: ErrorCategory): AppError {
  // تحديد نوع الخطأ تلقائياً بناءً على اسم الخطأ أو الرسالة
  let detectedCategory = category || ErrorCategory.UNKNOWN;
  let code = 'UNKNOWN_ERROR';
  let severity = ErrorSeverity.MEDIUM;
  let retryable = false;

  if (error.name === 'ValidationError' || error.message.includes('validation')) {
    detectedCategory = ErrorCategory.VALIDATION;
    code = ERROR_CODES.VALIDATION_FORMAT;
    severity = ErrorSeverity.LOW;
  } else if (error.name === 'TypeError' || error.name === 'ReferenceError') {
    detectedCategory = ErrorCategory.SYSTEM;
    code = ERROR_CODES.SYSTEM_INTERNAL_ERROR;
    severity = ErrorSeverity.HIGH;
  } else if (error.message.includes('fetch') || error.message.includes('network')) {
    detectedCategory = ErrorCategory.NETWORK;
    code = ERROR_CODES.NETWORK_CONNECTION_FAILED;
    severity = ErrorSeverity.MEDIUM;
    retryable = true;
  } else if (error.message.includes('database') || error.message.includes('SQLITE')) {
    detectedCategory = ErrorCategory.DATABASE;
    code = ERROR_CODES.DB_QUERY_FAILED;
    severity = ErrorSeverity.HIGH;
  }

  return createError(detectedCategory, code, error.message, {
    details: { 
      originalError: error.name,
      stack: error.stack 
    },
    severity,
    retryable
  });
}

// =============================================================================
// Schema Validation للأخطاء (للـ API responses)
// =============================================================================

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    category: z.nativeEnum(ErrorCategory),
    code: z.string(),
    message: z.string(),
    messageAr: z.string().optional(),
    details: z.record(z.any()).optional(),
    timestamp: z.string(),
    severity: z.nativeEnum(ErrorSeverity),
    retryable: z.boolean().optional(),
    userFriendly: z.boolean().optional()
  })
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// دالة لتحويل AppError إلى ErrorResponse
export function toErrorResponse(error: AppError): ErrorResponse {
  return {
    success: false,
    error: {
      category: error.category,
      code: error.code,
      message: error.message,
      messageAr: error.messageAr,
      details: error.details,
      timestamp: error.timestamp,
      severity: error.severity,
      retryable: error.retryable,
      userFriendly: error.userFriendly
    }
  };
}