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
      en: 'This field is required. Please fill in the missing information.',
      ar: 'هذا الحقل مطلوب. يرجى ملء المعلومات المفقودة.'
    },
    INVALID_EMAIL: {
      en: 'Please enter a valid email address (example: name@domain.com)',
      ar: 'يرجى إدخال عنوان بريد إلكتروني صالح (مثال: الاسم@الموقع.com)'
    },
    INVALID_PASSWORD: {
      en: 'Password must be at least 8 characters long with a mix of letters and numbers',
      ar: 'كلمة المرور يجب أن تكون على الأقل 8 أحرف مع خليط من الحروف والأرقام'
    },
    INVALID_FORMAT: {
      en: 'The information you entered is not in the correct format. Please check and try again.',
      ar: 'المعلومات التي أدخلتها ليست بالتنسيق الصحيح. يرجى التحقق والمحاولة مرة أخرى.'
    },
    OUT_OF_RANGE: {
      en: 'Please enter a value within the allowed range',
      ar: 'يرجى إدخال قيمة ضمن النطاق المسموح'
    },
    TOO_SHORT: {
      en: 'This field is too short. Please enter at least {min} characters.',
      ar: 'هذا الحقل قصير جداً. يرجى إدخال {min} أحرف على الأقل.'
    },
    TOO_LONG: {
      en: 'This field is too long. Please enter no more than {max} characters.',
      ar: 'هذا الحقل طويل جداً. يرجى إدخال {max} أحرف كحد أقصى.'
    },
    INVALID_NUMBER: {
      en: 'Please enter a valid number',
      ar: 'يرجى إدخال رقم صالح'
    },
    INVALID_DATE: {
      en: 'Please enter a valid date',
      ar: 'يرجى إدخال تاريخ صالح'
    }
  },

  // أخطاء المصادقة
  AUTHENTICATION: {
    INVALID_CREDENTIALS: {
      en: 'The username or password you entered is incorrect. Please double-check and try again.',
      ar: 'اسم المستخدم أو كلمة المرور التي أدخلتها غير صحيحة. يرجى التحقق والمحاولة مرة أخرى.'
    },
    SESSION_EXPIRED: {
      en: 'Your session has expired for security reasons. Please log in again to continue.',
      ar: 'انتهت صلاحية جلستك لأسباب أمنية. يرجى تسجيل الدخول مرة أخرى للمتابعة.'
    },
    NO_SESSION: {
      en: 'You need to log in to access this feature. Please sign in to your account.',
      ar: 'تحتاج إلى تسجيل الدخول للوصول إلى هذه الميزة. يرجى تسجيل الدخول إلى حسابك.'
    },
    TOO_MANY_ATTEMPTS: {
      en: 'Too many failed login attempts. For security, please wait 15 minutes before trying again.',
      ar: 'محاولات دخول فاشلة كثيرة. لأسباب أمنية، يرجى الانتظار 15 دقيقة قبل المحاولة مرة أخرى.'
    },
    ACCOUNT_LOCKED: {
      en: 'Your account has been temporarily locked. Please contact support or try again later.',
      ar: 'تم قفل حسابك مؤقتاً. يرجى الاتصال بالدعم أو المحاولة لاحقاً.'
    }
  },

  // أخطاء التخويل
  AUTHORIZATION: {
    ACCESS_DENIED: {
      en: 'You don\'t have permission to perform this action. Contact your administrator if you need access.',
      ar: 'ليس لديك صلاحية لتنفيذ هذا الإجراء. اتصل بالمدير إذا كنت تحتاج للوصول.'
    },
    INSUFFICIENT_PRIVILEGES: {
      en: 'Your account doesn\'t have enough permissions for this operation. Please contact support.',
      ar: 'حسابك لا يملك صلاحيات كافية لهذه العملية. يرجى الاتصال بالدعم.'
    },
    RESOURCE_NOT_FOUND: {
      en: 'The page or feature you\'re looking for doesn\'t exist or has been moved.',
      ar: 'الصفحة أو الميزة التي تبحث عنها غير موجودة أو تم نقلها.'
    },
    ADMIN_REQUIRED: {
      en: 'This action requires administrator privileges. Please contact an admin.',
      ar: 'هذا الإجراء يتطلب صلاحيات إدارية. يرجى الاتصال بمدير النظام.'
    }
  },

  // أخطاء الشبكة
  NETWORK: {
    CONNECTION_FAILED: {
      en: 'Unable to connect to the server. Please check your internet connection and try again.',
      ar: 'غير قادر على الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.'
    },
    TIMEOUT: {
      en: 'The request is taking too long. Please check your connection and try again.',
      ar: 'الطلب يستغرق وقتاً طويلاً. يرجى التحقق من الاتصال والمحاولة مرة أخرى.'
    },
    SERVER_ERROR: {
      en: 'Our servers are experiencing issues. Please try again in a few minutes.',
      ar: 'خوادمنا تواجه مشاكل. يرجى المحاولة مرة أخرى خلال دقائق قليلة.'
    },
    BAD_REQUEST: {
      en: 'There\'s an issue with your request. Please check your information and try again.',
      ar: 'هناك مشكلة في طلبك. يرجى التحقق من معلوماتك والمحاولة مرة أخرى.'
    },
    RATE_LIMITED: {
      en: 'You\'re making requests too quickly. Please wait a moment and try again.',
      ar: 'أنت تقوم بطلبات بسرعة كبيرة. يرجى الانتظار قليلاً والمحاولة مرة أخرى.'
    },
    NO_INTERNET: {
      en: 'No internet connection detected. Please check your network settings.',
      ar: 'لم يتم اكتشاف اتصال بالإنترنت. يرجى التحقق من إعدادات الشبكة.'
    },
    DNS_ERROR: {
      en: 'Unable to reach the server. Please check your network connection or try again later.',
      ar: 'غير قادر على الوصول للخادم. يرجى التحقق من اتصال الشبكة أو المحاولة لاحقاً.'
    }
  },

  // أخطاء قاعدة البيانات
  DATABASE: {
    CONNECTION_FAILED: {
      en: 'We\'re having trouble connecting to our database. Please try again in a moment.',
      ar: 'نواجه مشكلة في الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى خلال لحظات.'
    },
    QUERY_FAILED: {
      en: 'There was an issue processing your request. Please try again.',
      ar: 'كان هناك مشكلة في معالجة طلبك. يرجى المحاولة مرة أخرى.'
    },
    DUPLICATE_ENTRY: {
      en: 'This information already exists in our system. Please use different details.',
      ar: 'هذه المعلومات موجودة بالفعل في نظامنا. يرجى استخدام تفاصيل مختلفة.'
    },
    NOT_FOUND: {
      en: 'The information you\'re looking for doesn\'t exist or has been removed.',
      ar: 'المعلومات التي تبحث عنها غير موجودة أو تم حذفها.'
    },
    SAVE_FAILED: {
      en: 'Unable to save your changes. Please try again.',
      ar: 'غير قادر على حفظ تغييراتك. يرجى المحاولة مرة أخرى.'
    },
    LOCKED: {
      en: 'The system is temporarily busy. Please wait a moment and try again.',
      ar: 'النظام مشغول مؤقتاً. يرجى الانتظار قليلاً والمحاولة مرة أخرى.'
    }
  },

  // أخطاء حدود API وإدارة المفاتيح
  API_LIMIT: {
    RATE_LIMITED: {
      en: 'You\'re making too many requests. Please wait a few seconds and try again.',
      ar: 'أنت تقوم بطلبات كثيرة جداً. يرجى الانتظار ثوانٍ قليلة والمحاولة مرة أخرى.'
    },
    QUOTA_EXCEEDED: {
      en: 'Your daily usage limit has been reached. Please try again tomorrow or upgrade your plan.',
      ar: 'تم الوصول إلى حد الاستخدام اليومي. يرجى المحاولة غداً أو ترقية خطتك.'
    },
    KEY_INVALID: {
      en: 'Your API key is invalid or has expired. Please check your configuration.',
      ar: 'مفتاح API الخاص بك غير صالح أو منتهي الصلاحية. يرجى التحقق من الإعداد.'
    },
    NO_KEYS_AVAILABLE: {
      en: 'No API keys are currently available for this provider. Please add valid keys or wait for suspended keys to reset.',
      ar: 'لا توجد مفاتيح API متاحة حالياً لهذا المزود. يرجى إضافة مفاتيح صالحة أو انتظار إعادة تعيين المفاتيح المعلقة.'
    },
    KEY_TEMPORARILY_SUSPENDED: {
      en: 'This API key is temporarily suspended due to rate limits. It will be available again soon.',
      ar: 'تم تعليق مفتاح API هذا مؤقتاً بسبب تجاوز الحدود. سيكون متاحاً قريباً مرة أخرى.'
    },
    KEY_QUOTA_EXCEEDED: {
      en: 'This API key has reached its daily limit. Using backup keys when available.',
      ar: 'وصل مفتاح API هذا إلى حده اليومي. يتم استخدام مفاتيح احتياطية عند توفرها.'
    },
    KEY_VALIDATION_FAILED: {
      en: 'The API key validation failed. Please check if the key is correct and active.',
      ar: 'فشل التحقق من صحة مفتاح API. يرجى التحقق من صحة المفتاح وأنه نشط.'
    },
    KEY_SELECTION_FAILED: {
      en: 'Unable to select an available API key. The system is temporarily busy.',
      ar: 'غير قادر على اختيار مفتاح API متاح. النظام مشغول مؤقتاً.'
    },
    KEY_MARKING_FAILED: {
      en: 'Failed to update API key status. The key management system is experiencing issues.',
      ar: 'فشل في تحديث حالة مفتاح API. نظام إدارة المفاتيح يواجه مشاكل.'
    },
    DATABASE_TRANSACTION_FAILED: {
      en: 'Unable to complete the key management operation. Please try again.',
      ar: 'غير قادر على إكمال عملية إدارة المفاتيح. يرجى المحاولة مرة أخرى.'
    },
    INVALID_PROVIDER: {
      en: 'The specified API provider is not recognized. Please check the provider name.',
      ar: 'مزود API المحدد غير معروف. يرجى التحقق من اسم المزود.'
    },
    KEY_NOT_FOUND: {
      en: 'The specified API key was not found in the system.',
      ar: 'مفتاح API المحدد غير موجود في النظام.'
    },
    USAGE_LIMIT_EXCEEDED: {
      en: 'This API key has exceeded its usage limit and is temporarily suspended.',
      ar: 'تجاوز مفتاح API هذا حد الاستخدام وتم تعليقه مؤقتاً.'
    },
    INVALID_KEY_ID: {
      en: 'The provided key ID is invalid. Please check the key identifier.',
      ar: 'معرف المفتاح المقدم غير صالح. يرجى التحقق من معرف المفتاح.'
    },
    RATE_LIMIT_BACKOFF: {
      en: 'API key is in backoff mode due to rate limiting. Will retry automatically.',
      ar: 'مفتاح API في وضع التأخير بسبب تجاوز الحدود. سيتم إعادة المحاولة تلقائياً.'
    },
    AUTHENTICATION_FAILED: {
      en: 'API key authentication failed. The key may be invalid or revoked.',
      ar: 'فشل في مصادقة مفتاح API. قد يكون المفتاح غير صالح أو ملغي.'
    },
    NETWORK_FAILURE: {
      en: 'Network error occurred while using this API key. Will retry with another key.',
      ar: 'حدث خطأ في الشبكة أثناء استخدام مفتاح API. سيتم المحاولة مع مفتاح آخر.'
    }
  },

  // أخطاء نظام الملفات
  FILE_SYSTEM: {
    FILE_NOT_FOUND: {
      en: 'The file you\'re looking for doesn\'t exist or has been moved.',
      ar: 'الملف الذي تبحث عنه غير موجود أو تم نقله.'
    },
    PERMISSION_DENIED: {
      en: 'You don\'t have permission to access this file. Please contact an administrator.',
      ar: 'ليس لديك إذن للوصول إلى هذا الملف. يرجى الاتصال بالمدير.'
    },
    DISK_FULL: {
      en: 'Storage space is full. Please free up some space and try again.',
      ar: 'مساحة التخزين ممتلئة. يرجى تحرير بعض المساحة والمحاولة مرة أخرى.'
    },
    INVALID_PATH: {
      en: 'The file path is not valid. Please check the location and try again.',
      ar: 'مسار الملف غير صالح. يرجى التحقق من الموقع والمحاولة مرة أخرى.'
    },
    UPLOAD_FAILED: {
      en: 'File upload failed. Please check your connection and try again.',
      ar: 'فشل رفع الملف. يرجى التحقق من الاتصال والمحاولة مرة أخرى.'
    },
    DOWNLOAD_FAILED: {
      en: 'File download failed. Please try again or contact support.',
      ar: 'فشل تحميل الملف. يرجى المحاولة مرة أخرى أو الاتصال بالدعم.'
    }
  },

  // أخطاء منطق العمل
  BUSINESS_LOGIC: {
    OPERATION_NOT_ALLOWED: {
      en: 'This action is not allowed at the moment. Please check the requirements and try again.',
      ar: 'هذا الإجراء غير مسموح في الوقت الحالي. يرجى التحقق من المتطلبات والمحاولة مرة أخرى.'
    },
    MARKET_CLOSED: {
      en: 'The market is currently closed. Trading will resume during market hours.',
      ar: 'السوق مغلق حالياً. ستستأنف التداولات خلال ساعات السوق.'
    },
    INSUFFICIENT_BALANCE: {
      en: 'You don\'t have enough balance to complete this transaction. Please add funds or reduce the amount.',
      ar: 'ليس لديك رصيد كافٍ لإكمال هذه المعاملة. يرجى إضافة أموال أو تقليل المبلغ.'
    },
    INVALID_STATE: {
      en: 'The current state doesn\'t allow this operation. Please refresh and try again.',
      ar: 'الحالة الحالية لا تسمح بهذه العملية. يرجى تحديث الصفحة والمحاولة مرة أخرى.'
    },
    DUPLICATE_OPERATION: {
      en: 'This operation has already been completed. Please check your records.',
      ar: 'تم إكمال هذه العملية بالفعل. يرجى التحقق من سجلاتك.'
    },
    MINIMUM_AMOUNT_NOT_MET: {
      en: 'The amount is below the minimum required. Please enter a higher amount.',
      ar: 'المبلغ أقل من الحد الأدنى المطلوب. يرجى إدخال مبلغ أعلى.'
    },
    MAXIMUM_LIMIT_EXCEEDED: {
      en: 'You have exceeded the maximum allowed limit. Please reduce the amount.',
      ar: 'لقد تجاوزت الحد الأقصى المسموح به. يرجى تقليل المبلغ.'
    }
  },

  // أخطاء النظام
  SYSTEM: {
    INTERNAL_ERROR: {
      en: 'Something went wrong on our end. Our team has been notified and is working to fix it.',
      ar: 'حدث خطأ من جانبنا. تم إخطار فريقنا ويعمل على إصلاحه.'
    },
    SERVICE_UNAVAILABLE: {
      en: 'This service is temporarily unavailable for maintenance. Please try again in a few minutes.',
      ar: 'هذه الخدمة غير متاحة مؤقتاً للصيانة. يرجى المحاولة مرة أخرى خلال دقائق قليلة.'
    },
    MAINTENANCE_MODE: {
      en: 'The system is currently under maintenance. We\'ll be back shortly. Thank you for your patience.',
      ar: 'النظام تحت الصيانة حالياً. سنعود قريباً. شكراً لصبركم.'
    },
    CONFIGURATION_ERROR: {
      en: 'There\'s a configuration issue that\'s preventing this action. Our team is working on it.',
      ar: 'هناك مشكلة في الإعداد تمنع هذا الإجراء. فريقنا يعمل على حلها.'
    },
    OVERLOADED: {
      en: 'The system is currently experiencing high traffic. Please wait a moment and try again.',
      ar: 'النظام يواجه حركة مرور عالية حالياً. يرجى الانتظار قليلاً والمحاولة مرة أخرى.'
    },
    UPDATE_REQUIRED: {
      en: 'A system update is required. Please refresh the page or restart the application.',
      ar: 'مطلوب تحديث النظام. يرجى تحديث الصفحة أو إعادة تشغيل التطبيق.'
    }
  },

  // رسائل عامة
  GENERAL: {
    UNKNOWN_ERROR: {
      en: 'Something unexpected happened. Please try again or contact support if the problem continues.',
      ar: 'حدث شيء غير متوقع. يرجى المحاولة مرة أخرى أو الاتصال بالدعم إذا استمرت المشكلة.'
    },
    PLEASE_TRY_AGAIN: {
      en: 'Please try again in a moment',
      ar: 'يرجى المحاولة مرة أخرى خلال لحظات'
    },
    CONTACT_SUPPORT: {
      en: 'If this problem continues, please contact our support team for assistance',
      ar: 'إذا استمرت هذه المشكلة، يرجى الاتصال بفريق الدعم للحصول على المساعدة'
    },
    OPERATION_SUCCESSFUL: {
      en: 'Operation completed successfully',
      ar: 'تمت العملية بنجاح'
    },
    PROCESSING: {
      en: 'Your request is being processed. Please wait...',
      ar: 'يتم معالجة طلبك. يرجى الانتظار...'
    },
    CANCELLED_BY_USER: {
      en: 'Operation was cancelled by user',
      ar: 'تم إلغاء العملية من قبل المستخدم'
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
  const baseError = createError(ErrorCategory.VALIDATION, code, message, {
    severity: ErrorSeverity.LOW,
    userFriendly: true
  });
  
  return {
    ...baseError,
    field,
    value
  } as ValidationError;
}

export function createAuthenticationError(
  code: string,
  message: string,
  userId?: number,
  attemptCount?: number
): AuthenticationError {
  const baseError = createError(ErrorCategory.AUTHENTICATION, code, message, {
    severity: ErrorSeverity.HIGH,
    userFriendly: true
  });
  
  return {
    ...baseError,
    userId,
    attemptCount
  } as AuthenticationError;
}

export function createNetworkError(
  code: string,
  message: string,
  url?: string,
  statusCode?: number,
  retryable: boolean = true
): NetworkError {
  const baseError = createError(ErrorCategory.NETWORK, code, message, {
    details: { statusCode },
    severity: statusCode && statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
    retryable,
    userFriendly: true
  });
  
  return {
    ...baseError,
    url,
    method: undefined,
    timeout: undefined
  } as NetworkError;
}

export function createDatabaseError(
  code: string,
  message: string,
  table?: string,
  operation?: string
): DatabaseError {
  const baseError = createError(ErrorCategory.DATABASE, code, message, {
    severity: ErrorSeverity.HIGH,
    userFriendly: false
  });
  
  return {
    ...baseError,
    table,
    operation,
    query: undefined
  } as DatabaseError;
}

export function createApiLimitError(
  code: string,
  message: string,
  provider?: string,
  keyId?: number,
  resetTime?: string
): ApiLimitError {
  const baseError = createError(ErrorCategory.API_LIMIT, code, message, {
    details: { keyId, resetTime },
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    userFriendly: true
  });
  
  return {
    ...baseError,
    provider,
    limit: undefined
  } as ApiLimitError;
}

// =============================================================================
// دوال مساعدة للتعامل مع الأخطاء
// =============================================================================

export function getErrorMessage(error: AppError, language: 'en' | 'ar' = 'en', interpolationValues?: Record<string, any>): string {
  let message = '';
  
  if (language === 'ar' && error.messageAr) {
    message = error.messageAr;
  } else {
    message = error.message;
  }
  
  // Apply interpolation if values are provided
  if (interpolationValues && typeof message === 'string') {
    message = interpolateMessage(message, interpolationValues);
  }
  
  return message;
}

// Helper function for message interpolation
function interpolateMessage(message: string, values: Record<string, any>): string {
  return message.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values[key];
    return value !== undefined ? String(value) : match; // Keep original placeholder if no value found
  });
}

// Create error with interpolated message
export function createErrorWithInterpolation(
  category: ErrorCategory,
  code: string,
  messageTemplate: { en: string, ar?: string },
  interpolationValues?: Record<string, any>,
  options: Partial<Omit<BaseError, 'category' | 'code' | 'message' | 'timestamp'>> = {}
): AppError {
  const interpolatedMessageEn = interpolationValues 
    ? interpolateMessage(messageTemplate.en, interpolationValues)
    : messageTemplate.en;
    
  const interpolatedMessageAr = interpolationValues && messageTemplate.ar
    ? interpolateMessage(messageTemplate.ar, interpolationValues)
    : messageTemplate.ar;

  return createError(category, code, interpolatedMessageEn, {
    ...options,
    messageAr: interpolatedMessageAr
  });
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
// نظام تمويه البيانات الحساسة في السجلات
// =============================================================================

// قائمة شاملة للحقول الحساسة - قابلة للتوسعة
const SENSITIVE_FIELD_PATTERNS = [
  // كلمات المرور وإعدادات المصادقة
  /password/i,
  /passwd/i,
  /pwd/i,
  /pass/i,
  /secret/i,
  /token/i,
  /auth/i,
  /credential/i,
  
  // مفاتيح API والمفاتيح العامة
  /api.*key/i,
  /apikey/i,
  /access.*key/i,
  /private.*key/i,
  /public.*key/i,
  /key.*secret/i,
  /client.*secret/i,
  /bearer/i,
  
  // بيانات مالية وبطاقات
  /credit.*card/i,
  /card.*number/i,
  /cvv/i,
  /cvc/i,
  /pin/i,
  /ssn/i,
  /social.*security/i,
  
  // بيانات شخصية حساسة
  /email/i,
  /phone/i,
  /mobile/i,
  /address/i,
  /location/i,
  
  // مفاتيح التشفير والأمان
  /hash/i,
  /salt/i,
  /nonce/i,
  /signature/i,
  /cert/i,
  /certificate/i,
  
  // معرفات وجلسات
  /session.*id/i,
  /user.*id/i,
  /refresh.*token/i,
  /csrf/i,
  /xsrf/i,
  
  // مفاتيح خدمات معينة
  /stripe/i,
  /paypal/i,
  /oauth/i,
  /jwt/i,
  /twilio/i,
  /sendgrid/i,
  /binance/i,
  /coinbase/i
];

// تحديد ما إذا كان الحقل حساس
function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(fieldName));
}

// دالة تمويه البيانات الحساسة
export function maskSensitiveData(data: any, maxDepth: number = 10): any {
  // تجنب التكرار اللا نهائي
  if (maxDepth <= 0) {
    return '[MAX_DEPTH_REACHED]';
  }

  // معالجة القيم البدائية
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data.length > 0 ? `[MASKED_STRING_${data.length}chars]` : '[EMPTY_STRING]';
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return '[MASKED_VALUE]';
  }

  // معالجة التواريخ
  if (data instanceof Date) {
    return '[MASKED_DATE]';
  }

  // معالجة المصفوفات
  if (Array.isArray(data)) {
    return data.map((item, index) => {
      // للمصفوفات الكبيرة، نمسك فقط أول عدد من العناصر
      if (index >= 5) {
        return `[...and ${data.length - 5} more items]`;
      }
      return maskSensitiveData(item, maxDepth - 1);
    });
  }

  // معالجة الكائنات
  if (typeof data === 'object' && data !== null) {
    const masked: Record<string, any> = {};
    const entries = Object.entries(data);
    
    // للكائنات الكبيرة، نحد من عدد الخصائص
    const maxProperties = 20;
    
    for (let i = 0; i < Math.min(entries.length, maxProperties); i++) {
      const [key, value] = entries[i];
      
      if (isSensitiveField(key)) {
        // تمويه الحقول الحساسة مع إعطاء تلميح عن نوع البيانات
        if (typeof value === 'string') {
          masked[key] = value.length > 0 ? `[MASKED_${key.toUpperCase()}_${value.length}chars]` : '[EMPTY]';
        } else if (typeof value === 'number') {
          masked[key] = '[MASKED_NUMBER]';
        } else if (Array.isArray(value)) {
          masked[key] = `[MASKED_ARRAY_${value.length}items]`;
        } else if (typeof value === 'object' && value !== null) {
          masked[key] = '[MASKED_OBJECT]';
        } else {
          masked[key] = `[MASKED_${typeof value}]`;
        }
      } else {
        // للحقول غير الحساسة، تطبيق التمويه بشكل تكراري
        masked[key] = maskSensitiveData(value, maxDepth - 1);
      }
    }
    
    // إضافة تلميح إذا كان هناك خصائص أكثر
    if (entries.length > maxProperties) {
      masked['...'] = `[${entries.length - maxProperties} more properties hidden]`;
    }
    
    return masked;
  }

  // للأنواع غير المعروفة
  return `[UNKNOWN_TYPE_${typeof data}]`;
}

// دالة مخصصة لتمويه بيانات طلبات الأخطاء
export function maskErrorDetails(details: any): any {
  if (!details || typeof details !== 'object') {
    return details;
  }

  const maskedDetails = { ...details };

  // تمويه originalData بشكل خاص
  if (maskedDetails.originalData) {
    maskedDetails.originalData = maskSensitiveData(maskedDetails.originalData);
  }

  // تمويه أي بيانات حساسة أخرى في التفاصيل
  Object.keys(maskedDetails).forEach(key => {
    if (isSensitiveField(key)) {
      maskedDetails[key] = maskSensitiveData(maskedDetails[key]);
    }
  });

  return maskedDetails;
}

// دالة لإضافة حقول حساسة جديدة في وقت التشغيل
export function addSensitiveFieldPattern(pattern: RegExp): void {
  SENSITIVE_FIELD_PATTERNS.push(pattern);
}

// دالة للحصول على قائمة الحقول الحساسة (للتطوير والاختبار)
export function getSensitiveFieldPatterns(): RegExp[] {
  return [...SENSITIVE_FIELD_PATTERNS];
}

// =============================================================================
// معرفات أخطاء شائعة
// =============================================================================

export const ERROR_CODES = {
  // أخطاء التحقق
  VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
  VALIDATION_FORMAT: 'VALIDATION_FORMAT',
  VALIDATION_RANGE: 'VALIDATION_RANGE',
  VALIDATION_INVALID_INPUT: 'VALIDATION_INVALID_INPUT',
  VALIDATION_TOO_SHORT: 'VALIDATION_TOO_SHORT',
  VALIDATION_TOO_LONG: 'VALIDATION_TOO_LONG',
  VALIDATION_INVALID_NUMBER: 'VALIDATION_INVALID_NUMBER',
  VALIDATION_INVALID_DATE: 'VALIDATION_INVALID_DATE',
  
  // أخطاء المصادقة
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_NO_SESSION: 'AUTH_NO_SESSION',
  AUTH_TOO_MANY_ATTEMPTS: 'AUTH_TOO_MANY_ATTEMPTS',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  
  // أخطاء التخويل
  AUTHZ_ACCESS_DENIED: 'AUTHZ_ACCESS_DENIED',
  AUTHZ_INSUFFICIENT_PRIVILEGES: 'AUTHZ_INSUFFICIENT_PRIVILEGES',
  AUTHZ_RESOURCE_NOT_FOUND: 'AUTHZ_RESOURCE_NOT_FOUND',
  AUTHZ_ADMIN_REQUIRED: 'AUTHZ_ADMIN_REQUIRED',
  
  // أخطاء الشبكة
  NETWORK_CONNECTION_FAILED: 'NETWORK_CONNECTION_FAILED',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_SERVER_ERROR: 'NETWORK_SERVER_ERROR',
  NETWORK_BAD_REQUEST: 'NETWORK_BAD_REQUEST',
  NETWORK_REQUEST_FAILED: 'NETWORK_REQUEST_FAILED',
  NETWORK_RATE_LIMITED: 'NETWORK_RATE_LIMITED',
  NETWORK_NO_INTERNET: 'NETWORK_NO_INTERNET',
  NETWORK_DNS_ERROR: 'NETWORK_DNS_ERROR',
  
  // أخطاء قاعدة البيانات
  DB_CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  DB_DUPLICATE_ENTRY: 'DB_DUPLICATE_ENTRY',
  DB_NOT_FOUND: 'DB_NOT_FOUND',
  DB_SAVE_FAILED: 'DB_SAVE_FAILED',
  DB_LOCKED: 'DB_LOCKED',
  
  // أخطاء API
  API_RATE_LIMITED: 'API_RATE_LIMITED',
  API_QUOTA_EXCEEDED: 'API_QUOTA_EXCEEDED',
  API_KEY_INVALID: 'API_KEY_INVALID',
  API_NO_KEYS_AVAILABLE: 'API_NO_KEYS_AVAILABLE',
  API_KEY_TEMPORARILY_SUSPENDED: 'API_KEY_TEMPORARILY_SUSPENDED',
  API_KEY_QUOTA_EXCEEDED: 'API_KEY_QUOTA_EXCEEDED',
  
  // أخطاء إدارة مفاتيح API (merged into API_LIMIT category)
  API_KEY_VALIDATION_FAILED: 'API_KEY_VALIDATION_FAILED',
  API_KEY_SELECTION_FAILED: 'API_KEY_SELECTION_FAILED',
  API_KEY_MARKING_FAILED: 'API_KEY_MARKING_FAILED',
  API_DATABASE_TRANSACTION_FAILED: 'API_DATABASE_TRANSACTION_FAILED',
  API_INVALID_PROVIDER: 'API_INVALID_PROVIDER',
  API_KEY_NOT_FOUND: 'API_KEY_NOT_FOUND',
  API_USAGE_LIMIT_EXCEEDED: 'API_USAGE_LIMIT_EXCEEDED',
  API_INVALID_KEY_ID: 'API_INVALID_KEY_ID',
  API_RATE_LIMIT_BACKOFF: 'API_RATE_LIMIT_BACKOFF',
  API_AUTHENTICATION_FAILED: 'API_AUTHENTICATION_FAILED',
  API_NETWORK_FAILURE: 'API_NETWORK_FAILURE',
  
  // أخطاء نظام الملفات
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_PERMISSION_DENIED: 'FILE_PERMISSION_DENIED',
  FILE_DISK_FULL: 'FILE_DISK_FULL',
  FILE_INVALID_PATH: 'FILE_INVALID_PATH',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  FILE_DOWNLOAD_FAILED: 'FILE_DOWNLOAD_FAILED',
  
  // أخطاء منطق العمل
  BUSINESS_OPERATION_NOT_ALLOWED: 'BUSINESS_OPERATION_NOT_ALLOWED',
  BUSINESS_MARKET_CLOSED: 'BUSINESS_MARKET_CLOSED',
  BUSINESS_INSUFFICIENT_BALANCE: 'BUSINESS_INSUFFICIENT_BALANCE',
  BUSINESS_INVALID_STATE: 'BUSINESS_INVALID_STATE',
  BUSINESS_DUPLICATE_OPERATION: 'BUSINESS_DUPLICATE_OPERATION',
  BUSINESS_MINIMUM_AMOUNT_NOT_MET: 'BUSINESS_MINIMUM_AMOUNT_NOT_MET',
  BUSINESS_MAXIMUM_LIMIT_EXCEEDED: 'BUSINESS_MAXIMUM_LIMIT_EXCEEDED',
  
  // أخطاء النظام
  SYSTEM_INTERNAL_ERROR: 'SYSTEM_INTERNAL_ERROR',
  SYSTEM_SERVICE_UNAVAILABLE: 'SYSTEM_SERVICE_UNAVAILABLE',
  SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE',
  SYSTEM_CONFIGURATION_ERROR: 'SYSTEM_CONFIGURATION_ERROR',
  SYSTEM_OVERLOADED: 'SYSTEM_OVERLOADED',
  SYSTEM_UPDATE_REQUIRED: 'SYSTEM_UPDATE_REQUIRED',
  
  // أكواد عامة
  GENERAL_UNKNOWN_ERROR: 'GENERAL_UNKNOWN_ERROR',
  GENERAL_OPERATION_SUCCESSFUL: 'GENERAL_OPERATION_SUCCESSFUL',
  GENERAL_PROCESSING: 'GENERAL_PROCESSING',
  GENERAL_CANCELLED_BY_USER: 'GENERAL_CANCELLED_BY_USER'
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