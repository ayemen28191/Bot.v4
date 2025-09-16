// =============================================================================
// دوال مساعدة موحدة لمعالجة أخطاء localStorage
// =============================================================================

/**
 * دالة آمنة لقراءة البيانات من localStorage مع معالجة الأخطاء
 */
export function safeGetLocalStorage<T = any>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error(`خطأ في قراءة البيانات من localStorage - المفتاح: ${key}`, error);
    return defaultValue;
  }
}

/**
 * دالة آمنة لحفظ البيانات في localStorage مع معالجة الأخطاء
 */
export function safeSetLocalStorage<T = any>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`خطأ في حفظ البيانات في localStorage - المفتاح: ${key}`, error);
    
    // معالجة أخطاء محددة
    if (error instanceof Error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('تم تجاوز حد التخزين المحلي، جاري المحاولة لتنظيف البيانات القديمة');
        // محاولة تنظيف البيانات القديمة
        cleanupOldStorageData();
        // محاولة الحفظ مرة أخرى
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (secondError) {
          console.error('فشل في الحفظ حتى بعد تنظيف البيانات', secondError);
        }
      }
    }
    return false;
  }
}

/**
 * دالة آمنة لحذف مفتاح من localStorage مع معالجة الأخطاء
 */
export function safeRemoveLocalStorage(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`خطأ في حذف البيانات من localStorage - المفتاح: ${key}`, error);
    return false;
  }
}

/**
 * دالة لقراءة النص الخام من localStorage (بدون JSON.parse)
 */
export function safeGetLocalStorageString(key: string, defaultValue: string = ''): string {
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch (error) {
    console.error(`خطأ في قراءة النص من localStorage - المفتاح: ${key}`, error);
    return defaultValue;
  }
}

/**
 * دالة لحفظ النص الخام في localStorage (بدون JSON.stringify)
 */
export function safeSetLocalStorageString(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`خطأ في حفظ النص في localStorage - المفتاح: ${key}`, error);
    return false;
  }
}

/**
 * دالة لتنظيف البيانات القديمة من localStorage
 */
function cleanupOldStorageData(): void {
  try {
    const keysToClean = [
      'oldLogs',
      'tempData',
      'outdatedCache',
      'expiredSessions'
    ];
    
    keysToClean.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`تم حذف البيانات القديمة: ${key}`);
      }
    });
  } catch (error) {
    console.error('خطأ في تنظيف البيانات القديمة:', error);
  }
}

/**
 * دالة للتحقق من توفر localStorage
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * دالة موحدة لحفظ إعدادات المستخدم
 */
export function saveUserSettings(settings: Record<string, any>): boolean {
  try {
    const currentSettings = safeGetLocalStorage('settings', {});
    const updatedSettings = { ...currentSettings, ...settings };
    return safeSetLocalStorage('settings', updatedSettings);
  } catch (error) {
    console.error('خطأ في حفظ إعدادات المستخدم:', error);
    return false;
  }
}

/**
 * دالة موحدة لقراءة إعدادات المستخدم
 */
export function getUserSettings(): Record<string, any> {
  return safeGetLocalStorage('settings', {});
}

/**
 * دالة موحدة لحفظ البيانات مع انتهاء صلاحية
 */
export function setWithExpiry(key: string, value: any, ttl: number): boolean {
  const now = new Date();
  const item = {
    value: value,
    expiry: now.getTime() + ttl,
  };
  return safeSetLocalStorage(key, item);
}

/**
 * دالة موحدة لقراءة البيانات مع التحقق من انتهاء الصلاحية
 */
export function getWithExpiry<T = any>(key: string, defaultValue: T): T {
  const itemStr = safeGetLocalStorageString(key);
  if (!itemStr) {
    return defaultValue;
  }
  
  try {
    const item = JSON.parse(itemStr);
    const now = new Date();
    
    if (now.getTime() > item.expiry) {
      // البيانات منتهية الصلاحية، احذفها
      safeRemoveLocalStorage(key);
      return defaultValue;
    }
    
    return item.value;
  } catch (error) {
    console.error(`خطأ في قراءة البيانات منتهية الصلاحية - المفتاح: ${key}`, error);
    return defaultValue;
  }
}

/**
 * دالة لحساب حجم البيانات المحفوظة في localStorage (بالبايت)
 */
export function getLocalStorageSize(): number {
  try {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  } catch (error) {
    console.error('خطأ في حساب حجم localStorage:', error);
    return 0;
  }
}