/**
 * ============================================================================
 * UNIFIED ERROR HANDLING SYSTEM
 * ============================================================================
 * 
 * Replaces and consolidates:
 * - client/src/lib/errorHandler.ts
 * - client/src/lib/errorTranslator.ts
 * - client/src/hooks/use-error-translator.tsx
 * - server/middleware/global-error-handler.ts
 * 
 * Provides comprehensive error handling for both client and server
 * ============================================================================
 */

import { z } from 'zod';
import { 
  UnifiedError, 
  UnifiedErrorFactory, 
  UnifiedContext 
} from './unified-systems';
import { ErrorCategory, ErrorSeverity } from './error-types';

// ============================================================================
// ERROR TRANSLATION PATTERNS
// ============================================================================

interface ErrorPattern {
  patterns: RegExp[];
  category: ErrorCategory;
  code: string;
  severity: ErrorSeverity;
  userFriendly: boolean;
  retryable: boolean;
}

const errorPatterns: Record<string, ErrorPattern> = {
  // Network errors
  network_failure: {
    patterns: [
      /network .* failed/i,
      /connection.* failed/i,
      /failed.* connect/i,
      /network.* error/i,
      /لا يمكن الاتصال بالشبكة/i,
      /فشل الاتصال/i
    ],
    category: ErrorCategory.NETWORK,
    code: 'NETWORK_FAILURE',
    severity: ErrorSeverity.MEDIUM,
    userFriendly: true,
    retryable: true
  },

  server_unavailable: {
    patterns: [
      /server .* down/i,
      /server .* unavailable/i,
      /service unavailable/i,
      /الخادم غير متوفر/i,
      /الخادم معطل/i
    ],
    category: ErrorCategory.NETWORK,
    code: 'SERVER_UNAVAILABLE',
    severity: ErrorSeverity.HIGH,
    userFriendly: true,
    retryable: true
  },

  // Authentication errors
  auth_failed: {
    patterns: [
      /authentication .* failed/i,
      /login .* failed/i,
      /invalid .* credentials/i,
      /could not authenticate/i,
      /فشل تسجيل الدخول/i,
      /فشل المصادقة/i
    ],
    category: ErrorCategory.AUTHENTICATION,
    code: 'AUTH_FAILED',
    severity: ErrorSeverity.HIGH,
    userFriendly: true,
    retryable: true
  },

  permission_denied: {
    patterns: [
      /permission .* denied/i,
      /not .* allowed/i,
      /ليس لديك صلاحية/i,
      /غير مصرح/i
    ],
    category: ErrorCategory.AUTHORIZATION,
    code: 'PERMISSION_DENIED',
    severity: ErrorSeverity.HIGH,
    userFriendly: true,
    retryable: false
  },

  // Validation errors
  validation_failed: {
    patterns: [
      /validation .* failed/i,
      /invalid .* data/i,
      /بيانات غير صالحة/i,
      /فشل التحقق/i
    ],
    category: ErrorCategory.VALIDATION,
    code: 'VALIDATION_FAILED',
    severity: ErrorSeverity.LOW,
    userFriendly: true,
    retryable: false
  },

  // API errors
  api_limit: {
    patterns: [
      /api .* limit/i,
      /rate limit/i,
      /too many requests/i,
      /exceeded .* limit/i,
      /تجاوز الحد/i
    ],
    category: ErrorCategory.API_LIMIT,
    code: 'API_LIMIT_EXCEEDED',
    severity: ErrorSeverity.MEDIUM,
    userFriendly: true,
    retryable: true
  },

  invalid_api_key: {
    patterns: [
      /invalid.* api key/i,
      /api key.* invalid/i,
      /مفتاح API غير صالح/i
    ],
    category: ErrorCategory.API_LIMIT,
    code: 'INVALID_API_KEY',
    severity: ErrorSeverity.HIGH,
    userFriendly: true,
    retryable: false
  },

  // Database errors
  database_error: {
    patterns: [
      /database.* connection/i,
      /cannot connect.* database/i,
      /خطأ في الاتصال بقاعدة البيانات/i
    ],
    category: ErrorCategory.DATABASE,
    code: 'DATABASE_ERROR',
    severity: ErrorSeverity.HIGH,
    userFriendly: false,
    retryable: true
  },

  // Timeout errors
  timeout: {
    patterns: [
      /timeout/i,
      /timed out/i,
      /انتهت المهلة/i
    ],
    category: ErrorCategory.NETWORK,
    code: 'TIMEOUT',
    severity: ErrorSeverity.MEDIUM,
    userFriendly: true,
    retryable: true
  }
};

// ============================================================================
// ERROR TRANSLATION SYSTEM
// ============================================================================

interface ErrorTranslation {
  originalMessage: string;
  translatedMessage: string;
  errorType: string | null;
  isTranslated: boolean;
  suggestions?: string[];
}

/**
 * Detect error type from message
 */
export function detectErrorType(errorMessage: string): string | null {
  if (!errorMessage) return null;
  
  for (const [errorType, config] of Object.entries(errorPatterns)) {
    for (const pattern of config.patterns) {
      if (pattern.test(errorMessage)) {
        return errorType;
      }
    }
  }
  
  return null;
}

/**
 * Translate error message with enhanced context
 */
export function translateError(errorMessage: string, language: 'en' | 'ar' = 'en'): ErrorTranslation {
  if (!errorMessage) {
    return {
      originalMessage: '',
      translatedMessage: '',
      errorType: null,
      isTranslated: false
    };
  }
  
  const errorType = detectErrorType(errorMessage);
  
  if (!errorType) {
    return {
      originalMessage: errorMessage,
      translatedMessage: errorMessage,
      errorType: null,
      isTranslated: false
    };
  }
  
  // Get translated message based on error type and language
  const translatedMessage = getTranslatedMessage(errorType, language);
  const suggestions = getErrorSuggestions(errorType, language);
  
  return {
    originalMessage: errorMessage,
    translatedMessage,
    errorType,
    isTranslated: true,
    suggestions
  };
}

/**
 * Get translated message for error type
 */
function getTranslatedMessage(errorType: string, language: 'en' | 'ar'): string {
  const messages: Record<string, Record<string, string>> = {
    network_failure: {
      en: 'Network connection failed. Please check your internet connection and try again.',
      ar: 'فشل الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.'
    },
    server_unavailable: {
      en: 'Server is temporarily unavailable. Please try again later.',
      ar: 'الخادم غير متوفر مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً.'
    },
    auth_failed: {
      en: 'Authentication failed. Please check your credentials and try again.',
      ar: 'فشل تسجيل الدخول. يرجى التحقق من بياناتك والمحاولة مرة أخرى.'
    },
    permission_denied: {
      en: 'You do not have permission to perform this action.',
      ar: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'
    },
    validation_failed: {
      en: 'The provided data is invalid. Please check your input and try again.',
      ar: 'البيانات المقدمة غير صالحة. يرجى التحقق من إدخالك والمحاولة مرة أخرى.'
    },
    api_limit: {
      en: 'API rate limit exceeded. Please wait a moment and try again.',
      ar: 'تم تجاوز الحد المسموح لطلبات API. يرجى الانتظار قليلاً والمحاولة مرة أخرى.'
    },
    invalid_api_key: {
      en: 'Invalid API key. Please check your configuration.',
      ar: 'مفتاح API غير صالح. يرجى التحقق من إعداداتك.'
    },
    database_error: {
      en: 'Database connection error. Please try again later.',
      ar: 'خطأ في الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى لاحقاً.'
    },
    timeout: {
      en: 'Request timed out. Please check your connection and try again.',
      ar: 'انتهت مهلة الطلب. يرجى التحقق من اتصالك والمحاولة مرة أخرى.'
    }
  };
  
  return messages[errorType]?.[language] || errorType;
}

/**
 * Get error suggestions
 */
function getErrorSuggestions(errorType: string, language: 'en' | 'ar'): string[] {
  const suggestions: Record<string, Record<string, string[]>> = {
    network_failure: {
      en: [
        'Check your internet connection',
        'Try refreshing the page',
        'Disable VPN if enabled',
        'Contact support if the issue persists'
      ],
      ar: [
        'تحقق من اتصال الإنترنت',
        'جرب تحديث الصفحة',
        'أوقف VPN إذا كان مفعلاً',
        'اتصل بالدعم الفني إذا استمرت المشكلة'
      ]
    },
    auth_failed: {
      en: [
        'Verify your username and password',
        'Check if caps lock is enabled',
        'Reset your password if needed',
        'Clear browser cache and cookies'
      ],
      ar: [
        'تحقق من اسم المستخدم وكلمة المرور',
        'تأكد من أن caps lock غير مفعل',
        'أعد تعيين كلمة المرور إذا لزم الأمر',
        'امسح ذاكرة التخزين المؤقت وملفات تعريف الارتباط'
      ]
    },
    api_limit: {
      en: [
        'Wait a few minutes before trying again',
        'Reduce the frequency of your requests',
        'Upgrade your plan for higher limits',
        'Contact support for assistance'
      ],
      ar: [
        'انتظر بضع دقائق قبل المحاولة مرة أخرى',
        'قلل من تكرار طلباتك',
        'قم بترقية خطتك للحصول على حدود أعلى',
        'اتصل بالدعم الفني للمساعدة'
      ]
    }
  };
  
  return suggestions[errorType]?.[language] || [];
}

// ============================================================================
// UNIFIED ERROR PROCESSOR
// ============================================================================

/**
 * Process any error into a UnifiedError
 */
export function processError(
  error: any, 
  context?: UnifiedContext,
  language: 'en' | 'ar' = 'en'
): UnifiedError {
  // If already a UnifiedError, return as-is
  if (error && typeof error === 'object' && 'category' in error) {
    return error as UnifiedError;
  }

  // Extract error message
  const errorMessage = extractErrorMessage(error);
  
  // Detect error type and get pattern config
  const errorType = detectErrorType(errorMessage);
  const patternConfig = errorType ? errorPatterns[errorType] : null;
  
  // Translate error message
  const translation = translateError(errorMessage, language);
  
  // Create UnifiedError
  if (patternConfig) {
    return UnifiedErrorFactory.create(
      patternConfig.category,
      patternConfig.code,
      translation.translatedMessage,
      {
        messageAr: language === 'en' ? getTranslatedMessage(errorType!, 'ar') : translation.translatedMessage,
        severity: patternConfig.severity,
        context,
        details: {
          originalMessage: errorMessage,
          errorType,
          suggestions: translation.suggestions,
          retryable: patternConfig.retryable,
          stack: error?.stack
        },
        userFriendly: patternConfig.userFriendly,
        retryable: patternConfig.retryable
      }
    );
  }

  // Default error for unknown types
  return UnifiedErrorFactory.create(
    ErrorCategory.UNKNOWN,
    'UNKNOWN_ERROR',
    translation.translatedMessage || errorMessage,
    {
      messageAr: language === 'en' ? errorMessage : translation.translatedMessage,
      severity: ErrorSeverity.MEDIUM,
      context,
      details: {
        originalMessage: errorMessage,
        stack: error?.stack
      },
      userFriendly: true,
      retryable: false
    }
  );
}

/**
 * Extract error message from various error types
 */
function extractErrorMessage(error: any): string {
  if (!error) return '';
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error.message) {
    return error.message;
  }
  
  if (error.error && typeof error.error === 'string') {
    return error.error;
  }
  
  if (error.error && error.error.message) {
    return error.error.message;
  }
  
  if (error.response && error.response.data) {
    if (typeof error.response.data === 'string') {
      return error.response.data;
    }
    if (error.response.data.message) {
      return error.response.data.message;
    }
    if (error.response.data.error) {
      return typeof error.response.data.error === 'string' 
        ? error.response.data.error 
        : (error.response.data.error.message || JSON.stringify(error.response.data.error));
    }
  }
  
  if (error.toString && typeof error.toString === 'function' && error.toString() !== '[object Object]') {
    return error.toString();
  }
  
  return JSON.stringify(error);
}

// ============================================================================
// ERROR REPORTING SYSTEM
// ============================================================================

interface ErrorReportThrottle {
  count: number;
  firstOccurrence: number;
  lastOccurrence: number;
  lastReported: number;
}

const errorReportCache = new Map<string, ErrorReportThrottle>();
const REPORT_INTERVAL = 5000; // 5 seconds between reports
const MAX_REPORTS_PER_MINUTE = 10;

/**
 * Check if error should be reported (with throttling)
 */
export function shouldReportError(error: UnifiedError): boolean {
  // Don't report low severity or user-friendly errors
  if (error.severity === ErrorSeverity.LOW && error.userFriendly) {
    return false;
  }

  // Create throttling key
  const throttleKey = `${error.category}:${error.code}:${error.message.substring(0, 50)}`;
  const now = Date.now();
  
  let throttle = errorReportCache.get(throttleKey);
  
  if (!throttle) {
    throttle = {
      count: 1,
      firstOccurrence: now,
      lastOccurrence: now,
      lastReported: now
    };
    errorReportCache.set(throttleKey, throttle);
    return true;
  }
  
  // Update throttle data
  throttle.count++;
  throttle.lastOccurrence = now;
  
  // Check if we should report
  if (throttle.count > MAX_REPORTS_PER_MINUTE) {
    return false;
  }
  
  if (now - throttle.lastReported < REPORT_INTERVAL) {
    return false;
  }
  
  throttle.lastReported = now;
  return true;
}

/**
 * Report error to server (client-side)
 */
export async function reportErrorToServer(error: UnifiedError): Promise<void> {
  if (typeof window === 'undefined') return; // Server-side check
  
  if (!shouldReportError(error)) return;
  
  try {
    if (!navigator.onLine) return;
    
    const errorReport = {
      ...error,
      details: {
        ...error.details,
        userAgent: navigator.userAgent,
        language: navigator.language,
        location: window.location.href,
        connectionType: (navigator as any)?.connection?.effectiveType,
        platform: navigator.platform
      }
    };

    await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorReport),
      signal: AbortSignal.timeout(5000)
    });

  } catch (reportingError) {
    console.warn('Failed to report error:', reportingError);
  }
}

// ============================================================================
// ERROR DISPLAY UTILITIES
// ============================================================================

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: UnifiedError, language: 'en' | 'ar' = 'en'): string {
  if (!error.userFriendly) {
    return language === 'ar' 
      ? 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
      : 'An unexpected error occurred. Please try again.';
  }
  
  return language === 'ar' ? error.messageAr : error.message;
}

/**
 * Get error severity icon
 */
export function getErrorIcon(severity: ErrorSeverity): string {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return '🚨';
    case ErrorSeverity.HIGH:
      return '⚠️';
    case ErrorSeverity.MEDIUM:
      return '⚡';
    case ErrorSeverity.LOW:
      return 'ℹ️';
    default:
      return '❓';
  }
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(error: UnifiedError, language: 'en' | 'ar' = 'en'): {
  title: string;
  message: string;
  icon: string;
  suggestions?: string[];
  retryable: boolean;
} {
  const translation = translateError(error.message, language);
  
  return {
    title: language === 'ar' ? 'خطأ' : 'Error',
    message: getUserFriendlyMessage(error, language),
    icon: getErrorIcon(error.severity),
    suggestions: translation.suggestions,
    retryable: error.retryable
  };
}

// ============================================================================
// CLEANUP
// ============================================================================

// Clean up old throttle entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    for (const [key, throttle] of errorReportCache.entries()) {
      if (throttle.lastOccurrence < fiveMinutesAgo) {
        errorReportCache.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

// ============================================================================
// UNIFIED ERROR HANDLER CLASS
// ============================================================================

/**
 * Main error handler class with static methods
 * Provides a centralized interface for error handling
 */
export class UnifiedErrorHandler {
  /**
   * Handle any error with optional context
   */
  static handleError(error: any, context?: UnifiedContext, language: 'en' | 'ar' = 'en'): UnifiedError {
    const processedError = processError(error, context, language);
    
    // Report error if needed (async, don't await)
    if (shouldReportError(processedError)) {
      reportErrorToServer(processedError).catch(() => {
        // Silently ignore reporting failures
      });
    }
    
    return processedError;
  }

  /**
   * Process error without reporting
   */
  static processError(error: any, context?: UnifiedContext, language: 'en' | 'ar' = 'en'): UnifiedError {
    return processError(error, context, language);
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: UnifiedError, language: 'en' | 'ar' = 'en'): string {
    return getUserFriendlyMessage(error, language);
  }

  /**
   * Format error for display
   */
  static formatError(error: UnifiedError, language: 'en' | 'ar' = 'en') {
    return formatErrorForDisplay(error, language);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ErrorPattern,
  ErrorTranslation,
  errorPatterns,
  extractErrorMessage
};