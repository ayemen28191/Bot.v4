/**
 * مكتبة لترجمة رسائل الخطأ متعددة اللغات
 * هذه المكتبة تسمح بالكشف التلقائي عن أنواع رسائل الخطأ الشائعة وتوفير ترجمات مناسبة
 */

import { t, getCurrentLanguage } from './i18n';

// الأنماط الرئيسية للأخطاء - ترتيب حسب الأولوية والتحديد
const errorPatterns: { [key: string]: RegExp[] } = {
  // أخطاء الشبكة والاتصال
  'error_network_failure': [
    /network .* failed/i,
    /connection.* failed/i,
    /failed.* connect/i,
    /network.* error/i,
    /لا يمكن الاتصال بالشبكة/i,
    /فشل الاتصال/i,
    /نेटवर्क त्रुटि/i,
    /कनेक्ट करने में विफल/i
  ],
  'error_server_down': [
    /server .* down/i,
    /server .* unavailable/i,
    /service unavailable/i,
    /الخادم غير متوفر/i,
    /الخادم معطل/i,
    /سرور دستیاب نہیں/i,
    /सर्वर उपलब्ध नहीं/i
  ],
  
  // أخطاء المصادقة والصلاحيات
  'error_authentication_failed': [
    /authentication .* failed/i,
    /login .* failed/i,
    /invalid .* credentials/i,
    /could not authenticate/i,
    /فشل تسجيل الدخول/i,
    /فشل المصادقة/i,
    /प्रमाणीकरण विफल/i,
    /लॉगिन विफल/i
  ],
  'error_permission_denied': [
    /permission .* denied/i,
    /not .* allowed/i,
    /ليس لديك صلاحية/i,
    /غير مصرح/i,
    /अनुमति नहीं/i
  ],
  
  // أخطاء البيانات
  'error_validation_failed': [
    /validation .* failed/i,
    /invalid .* data/i,
    /بيانات غير صالحة/i,
    /فشل التحقق/i,
    /डेटा अमान्य/i,
    /सत्यापन विफल/i
  ],
  'error_data_not_found': [
    /not found/i,
    /data .* not exist/i,
    /لم يتم العثور/i,
    /غير موجود/i,
    /डेटा नहीं मिला/i
  ],
  
  // أخطاء APIs
  'error_api_limit_exceeded': [
    /api .* limit/i,
    /rate limit/i,
    /too many requests/i,
    /exceeded .* limit/i,
    /تجاوز الحد/i,
    /API سیما/i,
    /API उपयोग सीमा/i
  ],
  'error_invalid_api_key': [
    /invalid.* api key/i,
    /api key.* invalid/i,
    /مفتاح API غير صالح/i,
    /API مفتاح غير صحيح/i,
    /API कुंजी अमान्य/i
  ],
  'error_api_key_missing': [
    /missing.* api key/i,
    /api key.* required/i,
    /no api key/i,
    /مفتاح API مفقود/i,
    /API کلید غائب/i,
    /API कुंजी गायब/i
  ],
  
  // أخطاء قاعدة البيانات
  'error_database_connection': [
    /database.* connection/i,
    /cannot connect.* database/i,
    /خطأ في الاتصال بقاعدة البيانات/i,
    /डेटाबेस कनेक्शन त्रुटि/i
  ],
  'error_database_query': [
    /database query/i,
    /sql .* error/i,
    /query .* failed/i,
    /خطأ في استعلام/i,
    /डेटाबेस क्वेरी त्रुटि/i
  ],
  
  // أخطاء الملفات
  'error_file_not_found': [
    /file.* not found/i,
    /cannot find file/i,
    /ملف غير موجود/i,
    /فایل نہیں ملی/i,
    /फ़ाइल नहीं मिली/i
  ],
  'error_file_too_large': [
    /file.* too large/i,
    /exceeds.*file.*size/i,
    /الملف كبير جدًا/i,
    /فایل بہت بڑی/i,
    /फ़ाइल बहुत बड़ी/i
  ],
  'error_unsupported_file_type': [
    /unsupported.* file/i,
    /file type.*not supported/i,
    /نوع الملف غير مدعوم/i,
    /फ़ाइल प्रकार समर्थित नहीं/i
  ],
  
  // أخطاء HTTP عامة
  'error_timeout': [
    /timeout/i,
    /timed out/i,
    /انتهت المهلة/i,
    /مھلت ختم/i,
    /समय समाप्त/i
  ],
  'error_server_error': [
    /server error/i,
    /internal server/i,
    /خطأ في الخادم/i,
    /سرور کی خرابی/i,
    /सर्वर त्रुटि/i
  ],
  'error_bad_request': [
    /bad request/i,
    /invalid request/i,
    /طلب غير صالح/i,
    /غلط درخواست/i,
    /अमान्य अनुरोध/i
  ],
  'error_not_authorized': [
    /not authorized/i,
    /unauthorized/i,
    /غير مصرح/i,
    /اجازت نہیں/i,
    /अनधिकृत/i
  ],
  'error_forbidden': [
    /forbidden/i,
    /access denied/i,
    /محظور/i,
    /ممنوع/i,
    /निषिद्ध/i
  ],
  'error_conflict': [
    /conflict/i,
    /already exists/i,
    /تعارض/i,
    /موجود بالفعل/i,
    /पहले से मौजूद है/i
  ],
};

/**
 * نوع مخرجات ترجمة الخطأ
 */
export interface ErrorTranslation {
  originalMessage: string;
  translatedMessage: string;
  errorType: string | null;
  isTranslated: boolean;
}

/**
 * تحديد نوع رسالة الخطأ بناءً على محتواها
 * @param errorMessage رسالة الخطأ الأصلية
 * @returns نوع الخطأ (مفتاح الترجمة) أو null إذا لم يتم التعرف عليه
 */
export function detectErrorType(errorMessage: string): string | null {
  if (!errorMessage) return null;
  
  for (const [errorType, patterns] of Object.entries(errorPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(errorMessage)) {
        return errorType;
      }
    }
  }
  
  return null;
}

/**
 * ترجمة رسالة خطأ
 * @param errorMessage رسالة الخطأ الأصلية
 * @returns كائن يحتوي على الرسالة الأصلية والرسالة المترجمة ونوع الخطأ
 */
export function translateError(errorMessage: string): ErrorTranslation {
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
  
  return {
    originalMessage: errorMessage,
    translatedMessage: t(errorType),
    errorType,
    isTranslated: true
  };
}

/**
 * التحقق مما إذا كانت رسالة الخطأ تحتاج إلى ترجمة
 * (إذا كانت اللغة المختارة غير متوافقة مع لغة رسالة الخطأ)
 * @param errorMessage رسالة الخطأ
 * @returns true إذا كانت الرسالة تحتاج إلى ترجمة
 */
export function needsTranslation(errorMessage: string): boolean {
  if (!errorMessage) return false;
  
  const currentLanguage = getCurrentLanguage();
  
  // التحقق من لغة رسالة الخطأ بناءً على الأحرف
  const hasArabicChars = /[\u0600-\u06FF]/.test(errorMessage);
  const hasLatinChars = /[a-zA-Z]/.test(errorMessage);
  const hasDevanagariChars = /[\u0900-\u097F]/.test(errorMessage);
  
  // تقرير ما إذا كانت هناك حاجة للترجمة
  if (currentLanguage === 'ar' && !hasArabicChars && (hasLatinChars || hasDevanagariChars)) {
    return true;
  }
  
  if (currentLanguage === 'en' && !hasLatinChars && (hasArabicChars || hasDevanagariChars)) {
    return true;
  }
  
  if (currentLanguage === 'hi' && !hasDevanagariChars && (hasLatinChars || hasArabicChars)) {
    return true;
  }
  
  return false;
}

/**
 * استخراج نص الخطأ من كائن خطأ
 * @param error كائن الخطأ
 * @returns نص رسالة الخطأ
 */
export function extractErrorMessage(error: any): string {
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