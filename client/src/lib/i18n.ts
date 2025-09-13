// نظام الترجمة متعدد اللغات مع دعم CSS ديناميكي - الإصدار المحسن
interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

import { z } from "zod";

// نظام تحميل CSS الديناميكي
let currentDirectionalCSS: HTMLLinkElement | null = null;

/**
 * تحميل CSS الاتجاهي (RTL أو LTR) بشكل ديناميكي
 */
function loadDirectionalCSS(direction: 'rtl' | 'ltr'): void {
  if (typeof window === 'undefined') return;
  
  // إزالة CSS الاتجاهي الموجود
  if (currentDirectionalCSS) {
    console.log(`Removing existing ${currentDirectionalCSS.id}`);
    currentDirectionalCSS.remove();
    currentDirectionalCSS = null;
  }

  // إنشاء عنصر link جديد للـ CSS الاتجاهي
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `/src/styles/${direction}.css`;
  link.id = `${direction}-styles`;
  
  // إضافة للـ document head
  document.head.appendChild(link);
  currentDirectionalCSS = link;
  
  console.log(`✅ Loaded ${direction.toUpperCase()} CSS successfully`);
}

/**
 * تهيئة CSS العام المطلوب دائماً
 */
function initializeCommonCSS(): void {
  if (typeof window === 'undefined') return;
  
  // فحص ما إذا كان CSS العام محمل بالفعل
  if (!document.querySelector('#common-styles')) {
    const commonLink = document.createElement('link');
    commonLink.rel = 'stylesheet';
    commonLink.href = '/src/styles/common.css';
    commonLink.id = 'common-styles';
    document.head.appendChild(commonLink);
    console.log('✅ Loaded common CSS');
  }
}

const translations: Translations = {
  ar: {
    // رسائل الخطأ العامة للترجمة
    error_translation_title: 'ترجمة رسالة الخطأ',
    original_error_message: 'رسالة الخطأ الأصلية:',
    translated_error_message: 'ترجمة رسالة الخطأ:',
    error_not_recognized: 'لم يتم التعرف على رسالة الخطأ',
    translation_not_available: 'الترجمة غير متوفرة لهذه الرسالة',
    copy_translation: 'نسخ الترجمة',
    copied_to_clipboard: 'تم النسخ إلى الحافظة',
    copy_failed: 'فشل النسخ',

    // أنواع رسائل الخطأ الشائعة
    error_network_failure: 'فشل في الاتصال بالشبكة',
    error_server_down: 'الخادم غير متاح حالياً',
    error_authentication_failed: 'فشل في المصادقة',
    error_permission_denied: 'ليس لديك صلاحية للوصول',
    error_validation_failed: 'فشل في التحقق من صحة البيانات',
    error_data_not_found: 'لم يتم العثور على البيانات',
    error_invalid_request: 'طلب غير صالح',
    error_api_limit_exceeded: 'تم تجاوز حد الاستخدام للواجهة البرمجية',
    error_database_connection: 'خطأ في الاتصال بقاعدة البيانات',
    error_database_query: 'خطأ في استعلام قاعدة البيانات',
    error_file_not_found: 'الملف غير موجود',
    error_file_too_large: 'الملف كبير جداً',
    error_unsupported_file_type: 'نوع الملف غير مدعوم',
    error_timeout: 'انتهت مهلة الطلب',
    error_server_error: 'خطأ في الخادم',
    error_bad_request: 'طلب غير صحيح',
    error_not_authorized: 'غير مصرح',
    error_forbidden: 'محظور',
    error_conflict: 'تعارض في البيانات',

    // رسائل الخطأ الخاصة بالتطبيق
    error_invalid_credentials: 'اسم المستخدم أو كلمة المرور غير صحيحة',
    error_username_exists: 'اسم المستخدم موجود بالفعل',
    error_email_exists: 'البريد الإلكتروني مستخدم بالفعل',
    error_weak_password: 'كلمة المرور ضعيفة جداً',
    error_session_expired: 'انتهت جلسة العمل، يرجى تسجيل الدخول مرة أخرى',
    error_invalid_api_key: 'مفتاح API غير صالح',
    error_api_key_missing: 'مفتاح API مفقود',
    error_api_key_expired: 'مفتاح API منتهي الصلاحية',

    // الترجمات الأساسية
    app_name: 'بينار للتحليل المشترك',
    app_name_short: 'تحليل البيانات الثنائية',
    signals: 'الإشارات',
    indicators: 'المؤشرات',
    signal: 'إشارة',
    group_chat: 'المحادثات الجماعية',
    group_chats: 'الدردشة',
    settings: 'الإعدادات',
    chat: 'الدردشة',
    notifications: 'الإشعارات',
    timezone: 'المنطقة الزمنية',
    language: 'اللغة',
    theme: 'السمة',
    save_settings: 'حفظ الإعدادات',
    settings_saved: 'تم حفظ الإعدادات بنجاح',
    auto_timezone: 'الضبط التلقائي (حسب توقيت الجهاز)',
    utc: 'التوقيت العالمي المنسق (UTC)',
    riyadh: 'الرياض (UTC+3)',
    dubai: 'دبي (UTC+4)',
    kuwait: 'الكويت (UTC+3)',
    doha: 'الدوحة (UTC+3)',
    jerusalem: 'القدس (UTC+2/+3)',
    cairo: 'القاهرة (UTC+2)',
    london: 'لندن (UTC+0/+1)',
    paris: 'باريس (UTC+1/+2)',
    new_york: 'نيويورك (UTC-5/-4)',
    tokyo: 'طوكيو (UTC+9)',
    hong_kong: 'هونغ كونغ (UTC+8)',
    sydney: 'سيدني (UTC+10/+11)',
    
    // نصوص التطبيق الأساسية
    login: "تسجيل الدخول",
    create_account: "إنشاء حساب جديد", 
    username: "اسم المستخدم",
    password: "كلمة المرور",
    confirm_password: "تأكيد كلمة المرور",
    display_name: "الاسم الظاهر",
    email: "البريد الإلكتروني",
    password_mismatch: "كلمات المرور غير متطابقة",
    dont_have_account: "ليس لديك حساب؟ سجل الآن",
    already_have_account: "لديك حساب بالفعل؟ سجل دخولك",
    app_welcome: "مرحباً بك في تطبيق Binar Join Analytic",
    app_description: "منصة متكاملة لتحليل إشارات التداول في الأسواق المالية مع دعم متعدد اللغات وميزات متقدمة للتحليل والمتابعة.",
    logout: "تسجيل الخروج",
    logout_success: "تم تسجيل الخروج بنجاح",

    // نصوص صفحة تسجيل الدخول المحسنة
    remember_me: "تذكرني",
    forgot_password: "نسيت كلمة المرور؟",
    show_password: "إظهار كلمة المرور",
    hide_password: "إخفاء كلمة المرور",
    login_welcome_title: "أهلاً بعودتك",
    login_welcome_subtitle: "سجل دخولك للوصول إلى حسابك",
    login_success: "تم تسجيل الدخول بنجاح",
    invalid_username_password: "اسم المستخدم أو كلمة المرور غير صحيحة",
    username_required: "اسم المستخدم مطلوب",
    password_required: "كلمة المرور مطلوبة",
    username_placeholder: "أدخل اسم المستخدم",
    password_placeholder: "أدخل كلمة المرور",
    logging_in: "جاري تسجيل الدخول...",
    secure_login: "تسجيل دخول آمن",
    welcome_back: "مرحباً بعودتك",

    // إدارة المستخدمين
    user_management: 'المستخدمين',
    admin_panel: 'لوحة المسؤول',
    add_user: 'إضافة مستخدم',
    edit_user: 'تعديل المستخدم',
    delete: 'حذف',
    edit: 'تعديل',
    enter_username: 'أدخل اسم المستخدم',
    enter_display_name: 'أدخل الاسم الظاهر',
    enter_email: 'أدخل البريد الإلكتروني',
    enter_password: 'أدخل كلمة المرور',
    is_admin: 'مشرف؟',
    role: 'الدور',
    admin: 'مشرف',
    user: 'مستخدم',
    no_users_found: 'لم يتم العثور على مستخدمين',
    add: 'إضافة',
    confirm_delete: 'تأكيد الحذف',
    confirm_delete_user_message: 'هل أنت متأكد من حذف المستخدم',
    this_action_cannot_be_undone: 'هذا الإجراء لا يمكن التراجع عنه',
    search_users: 'البحث عن المستخدمين',
    admins_only: 'المشرفين فقط',

    // رسائل الإعدادات
    signal_notifications: 'إشعارات الإشارات',
    receive_signal_notifications: 'تلقي إشعارات عند ظهور إشارات جديدة',
    market_alerts: 'تنبيهات السوق',
    receive_market_alerts: 'تلقي إشعارات بفتح وإغلاق الأسواق',
    choose_timezone: 'اختر المنطقة الزمنية',
    choose_app_language: 'اختر لغة التطبيق',
    dark_mode: 'الوضع الداكن',
    light_mode: 'الوضع الفاتح',
    system_theme: 'حسب النظام',

    // رسائل التحديث
    settings_saved_successfully: 'تم حفظ الإعدادات بنجاح',
    language_preference_saved: 'تم حفظ تفضيل اللغة الخاص بك.',
    error_saving_settings: 'خطأ في حفظ الإعدادات',

    // رسائل عامة
    save: 'حفظ',
    cancel: 'إلغاء',
    close: 'إغلاق',
    loading: 'جاري التحميل...',
    success: 'نجح',
    error: 'خطأ',
    warning: 'تحذير',
    info: 'معلومات'
  },

  en: {
    // Error messages for translation
    error_translation_title: 'Error Message Translation',
    original_error_message: 'Original Error Message:',
    translated_error_message: 'Error Message Translation:',
    error_not_recognized: 'Error message not recognized',
    translation_not_available: 'Translation not available for this message',
    copy_translation: 'Copy translation',
    copied_to_clipboard: 'Copied to clipboard',
    copy_failed: 'Copy failed',

    // Common error message types
    error_network_failure: 'Network connection failure',
    error_server_down: 'Server currently unavailable',
    error_authentication_failed: 'Authentication failed',
    error_permission_denied: 'You do not have access permission',
    error_validation_failed: 'Data validation failed',
    error_data_not_found: 'Data not found',
    error_invalid_request: 'Invalid request',
    error_api_limit_exceeded: 'API usage limit exceeded',
    error_database_connection: 'Database connection error',
    error_database_query: 'Database query error',
    error_file_not_found: 'File not found',
    error_file_too_large: 'File too large',
    error_unsupported_file_type: 'Unsupported file type',
    error_timeout: 'Request timeout',
    error_server_error: 'Server error',
    error_bad_request: 'Bad request',
    error_not_authorized: 'Not authorized',
    error_forbidden: 'Forbidden',
    error_conflict: 'Data conflict',

    // Application-specific error messages
    error_invalid_credentials: 'Invalid username or password',
    error_username_exists: 'Username already exists',
    error_email_exists: 'Email already in use',
    error_weak_password: 'Password too weak',
    error_session_expired: 'Session expired, please login again',
    error_invalid_api_key: 'Invalid API key',
    error_api_key_missing: 'API key missing',
    error_api_key_expired: 'API key expired',

    // Basic translations
    app_name: 'Binar Join Analytic',
    app_name_short: 'Binary Data Analysis',
    signals: 'Signals',
    indicators: 'Indicators', 
    signal: 'Signal',
    group_chat: 'Group Chat',
    group_chats: 'Chat',
    settings: 'Settings',
    chat: 'Chat',
    notifications: 'Notifications',
    timezone: 'Timezone',
    language: 'Language',
    theme: 'Theme',
    save_settings: 'Save Settings',
    settings_saved: 'Settings saved successfully',
    auto_timezone: 'Auto (Device Time)',
    utc: 'Coordinated Universal Time (UTC)',
    riyadh: 'Riyadh (UTC+3)',
    dubai: 'Dubai (UTC+4)',
    kuwait: 'Kuwait (UTC+3)',
    doha: 'Doha (UTC+3)',
    jerusalem: 'Jerusalem (UTC+2/+3)',
    cairo: 'Cairo (UTC+2)',
    london: 'London (UTC+0/+1)',
    paris: 'Paris (UTC+1/+2)',
    new_york: 'New York (UTC-5/-4)',
    tokyo: 'Tokyo (UTC+9)',
    hong_kong: 'Hong Kong (UTC+8)',
    sydney: 'Sydney (UTC+10/+11)',

    // Basic app texts
    login: "Login",
    create_account: "Create Account",
    username: "Username",
    password: "Password",
    confirm_password: "Confirm Password",
    display_name: "Display Name",
    email: "Email",
    password_mismatch: "Passwords do not match",
    dont_have_account: "Don't have an account? Sign up",
    already_have_account: "Already have an account? Login",
    app_welcome: "Welcome to Binar Join Analytic",
    app_description: "An integrated platform for analyzing trading signals in financial markets with multilingual support and advanced analysis features.",
    logout: "Logout",
    logout_success: "Logged out successfully",

    // Enhanced login page texts
    remember_me: "Remember me",
    forgot_password: "Forgot password?",
    show_password: "Show password",
    hide_password: "Hide password",
    login_welcome_title: "Welcome back",
    login_welcome_subtitle: "Sign in to access your account",
    login_success: "Login successful",
    invalid_username_password: "Invalid username or password",
    username_required: "Username is required",
    password_required: "Password is required",
    username_placeholder: "Enter your username",
    password_placeholder: "Enter your password",
    logging_in: "Signing in...",
    secure_login: "Secure Login",
    welcome_back: "Welcome back",

    // User management
    user_management: 'Users',
    admin_panel: 'Admin Panel',
    add_user: 'Add User',
    edit_user: 'Edit User',
    delete: 'Delete',
    edit: 'Edit',
    enter_username: 'Enter username',
    enter_display_name: 'Enter display name',
    enter_email: 'Enter email',
    enter_password: 'Enter password',
    is_admin: 'Admin?',
    role: 'Role',
    admin: 'Admin',
    user: 'User',
    no_users_found: 'No users found',
    add: 'Add',
    confirm_delete: 'Confirm Delete',
    confirm_delete_user_message: 'Are you sure you want to delete user',
    this_action_cannot_be_undone: 'This action cannot be undone',
    search_users: 'Search users',
    admins_only: 'Admins only',

    // Settings messages
    signal_notifications: 'Signal Notifications',
    receive_signal_notifications: 'Receive notifications for new signals',
    market_alerts: 'Market Alerts',
    receive_market_alerts: 'Receive notifications for market open/close',
    choose_timezone: 'Choose Timezone',
    choose_app_language: 'Choose App Language',
    dark_mode: 'Dark Mode',
    light_mode: 'Light Mode',
    system_theme: 'System Theme',

    // Update messages
    settings_saved_successfully: 'Settings saved successfully',
    language_preference_saved: 'Your language preference has been saved.',
    error_saving_settings: 'Error saving settings',

    // General messages
    save: 'Save',
    cancel: 'Cancel', 
    close: 'Close',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info'
  }
};

// تخزين مؤقت للترجمات المستخدمة حالياً
let translationCache: { [key: string]: string } = {};

// تهيئة اللغة الحالية - الإنجليزية كافتراضي
let currentLanguage: 'ar' | 'en' = 'en';

// اللغات المدعومة
export const supportedLanguages = [
  { code: 'ar', name: 'العربية', nativeName: 'العربية' },
  { code: 'en', name: 'English', nativeName: 'English' }
];

/**
 * تطبيع رموز اللغة إلى القيم المدعومة
 */
const normalizeLanguage = (lang: string): 'ar' | 'en' => {
  const langCode = lang.toLowerCase().split('-')[0];
  const isArabic = langCode === 'ar';
  console.log(`🔄 Normalizing language: "${lang}" → "${isArabic ? 'ar' : 'en'}"`);
  return isArabic ? 'ar' : 'en';
};

/**
 * الحصول على اللغة من localStorage
 */
function getLanguageFromStorage(): 'ar' | 'en' {
  if (typeof window === 'undefined') return 'en';
  
  try {
    // فحص language key مباشرة
    const directLang = localStorage.getItem('language');
    if (directLang && ['ar', 'en'].includes(directLang)) {
      console.log(`📖 Language from localStorage (direct): "${directLang}"`);
      return directLang as 'ar' | 'en';
    }

    // فحص settings object
    const settingsStr = localStorage.getItem('settings');
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      if (settings.language && ['ar', 'en'].includes(settings.language)) {
        console.log(`📖 Language from localStorage (settings): "${settings.language}"`);
        return settings.language as 'ar' | 'en';
      }
    }
  } catch (error) {
    console.warn('⚠️ Error reading language from localStorage:', error);
  }

  console.log('📖 No valid language in localStorage, defaulting to English');
  return 'en';
}

/**
 * حفظ اللغة في localStorage
 */
function saveLanguageToStorage(lang: 'ar' | 'en'): void {
  if (typeof window === 'undefined') return;
  
  try {
    // حفظ في language key مباشرة
    localStorage.setItem('language', lang);
    
    // حفظ في settings object أيضاً
    const settingsStr = localStorage.getItem('settings') || '{}';
    const settings = JSON.parse(settingsStr);
    settings.language = lang;
    localStorage.setItem('settings', JSON.stringify(settings));
    
    console.log(`💾 Language saved to localStorage: "${lang}"`);
  } catch (error) {
    console.error('❌ Error saving language to localStorage:', error);
  }
}

/**
 * تطبيق اللغة على DOM
 */
function applyLanguageToDOM(lang: 'ar' | 'en'): void {
  if (typeof window === 'undefined') return;

  const isRTL = lang === 'ar';
  const direction = isRTL ? 'rtl' : 'ltr';

  // تحديث خصائص HTML
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', direction);

  // إزالة الفئات الموجودة لتجنب التعارض
  document.documentElement.classList.remove('ar', 'en', 'rtl', 'ltr');
  document.body.classList.remove('font-arabic');

  // إضافة الفئات المناسبة
  document.documentElement.classList.add(lang, direction);
  if (isRTL) {
    document.body.classList.add('font-arabic');
  }

  // تحميل CSS المناسب
  initializeCommonCSS();
  loadDirectionalCSS(direction);

  console.log(`🎨 Applied to DOM: lang="${lang}", dir="${direction}", classes="${document.documentElement.className}"`);
}

/**
 * الدالة الرئيسية لتغيير اللغة
 * @param lang - رمز اللغة
 * @param saveToDatabase - حفظ في قاعدة البيانات (اختياري)
 */
export const setLanguage = (lang: string, saveToDatabase: boolean = false): void => {
  const normalizedLang = normalizeLanguage(lang);
  
  console.log(`🌐 setLanguage called: "${lang}" → "${normalizedLang}", saveToDatabase: ${saveToDatabase}`);
  
  // تحديث اللغة الحالية
  currentLanguage = normalizedLang;
  
  // تطبيق على DOM
  applyLanguageToDOM(normalizedLang);
  
  // حفظ في localStorage
  saveLanguageToStorage(normalizedLang);
  
  // مسح cache الترجمة لإجبار التحديث
  translationCache = {};
  
  // إرسال حدث تغيير اللغة
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { language: normalizedLang, saveToDatabase }
    }));
  }
  
  console.log(`✅ Language changed successfully to: "${normalizedLang}"`);
};

/**
 * الحصول على اللغة الحالية مع دعم سياق المستخدم
 */
export const getCurrentLanguage = (user?: any): 'ar' | 'en' => {
  // إذا كان هناك مستخدم مع لغة مفضلة
  if (user?.preferredLanguage && ['ar', 'en'].includes(user.preferredLanguage)) {
    const userLang = normalizeLanguage(user.preferredLanguage);
    console.log(`👤 Language from user preferences: "${userLang}"`);
    return userLang;
  }

  // إذا كان هناك لغة حالية محددة
  if (currentLanguage) {
    console.log(`🔄 Current language in state: "${currentLanguage}"`);
    return currentLanguage;
  }

  // الحصول من localStorage
  const storageLang = getLanguageFromStorage();
  currentLanguage = storageLang;
  return storageLang;
};

/**
 * دالة الترجمة الرئيسية
 */
export const t = (key: string, user?: any): string => {
  const lang = getCurrentLanguage(user);
  
  // فحص cache أولاً
  const cacheKey = `${lang}_${key}`;
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  // البحث عن الترجمة
  const translation = translations[lang]?.[key] || translations['en']?.[key] || key;
  
  // حفظ في cache
  translationCache[cacheKey] = translation;
  
  return translation;
};

/**
 * تهيئة نظام اللغة مع سياق المستخدم
 */
export const initializeLanguageSystem = (user?: any): void => {
  let targetLanguage: 'ar' | 'en';

  if (user?.preferredLanguage && ['ar', 'en'].includes(user.preferredLanguage)) {
    // استخدام لغة المستخدم المفضلة
    targetLanguage = normalizeLanguage(user.preferredLanguage);
    console.log(`🚀 Language system initialized with user preference: "${targetLanguage}"`);
  } else {
    // استخدام اللغة من localStorage
    targetLanguage = getLanguageFromStorage();
    console.log(`🚀 Language system initialized from storage: "${targetLanguage}"`);
  }

  // تطبيق اللغة
  setLanguage(targetLanguage, false); // لا نحفظ في قاعدة البيانات عند التهيئة
  
  console.log(`✅ Language system ready: "${targetLanguage}"`);
};

/**
 * مسح بيانات اللغة عند تسجيل الخروج
 */
export const clearLanguageOnLogout = (): void => {
  console.log('🚪 Clearing language data on logout');
  
  // إعادة تعيين للإنجليزية
  setLanguage('en', false);
  
  console.log('✅ Language data cleared, reset to English');
};

/**
 * الحصول على لغة المتصفح (للاستخدام كـ fallback)
 */
export function getBrowserLanguage(): string {
  if (typeof window !== 'undefined') {
    // فحص اللغة المحفوظة أولاً
    const savedLang = getLanguageFromStorage();
    return savedLang;
  }
  return 'en';
}

// تصدير إضافي للمتغيرات المطلوبة
export { translations };
export type SupportedLanguage = 'ar' | 'en';