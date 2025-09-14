import { IStorage } from '../storage';
import cacheService from './redisClient';
import { ConfigKey } from '@shared/schema';

export interface KeyStats {
  id: number;
  key: string;
  provider: string | null;
  lastUsedAt: string | null;
  failedUntil: string | null;
  usageToday: number;
  dailyQuota: number | null;
  isAvailable: boolean;
}

export class KeyManager {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * جلب المفاتيح المتاحة لمزود محدد (غير الفاشلة حالياً)
   */
  async getAvailableKeys(provider: string): Promise<ConfigKey[]> {
    try {
      const allKeys = await this.storage.getAllConfigKeys();
      const now = new Date().toISOString();
      
      return allKeys.filter(key => {
        // تحقق من مطابقة المزود
        if (key.provider !== provider) return false;
        
        // تحقق من عدم الفشل
        if (key.failedUntil && key.failedUntil > now) return false;
        
        // تحقق من عدم تجاوز الحد اليومي
        if (key.dailyQuota && (key.usageToday || 0) >= key.dailyQuota) return false;
        
        return true;
      }).sort((a, b) => {
        // رتب حسب آخر استخدام (الأقل استخداماً أولاً)
        if (!a.lastUsedAt && !b.lastUsedAt) return 0;
        if (!a.lastUsedAt) return -1;
        if (!b.lastUsedAt) return 1;
        return a.lastUsedAt.localeCompare(b.lastUsedAt);
      });
    } catch (error) {
      console.error('خطأ في جلب المفاتيح المتاحة:', error);
      return [];
    }
  }

  /**
   * اختر المفتاح التالي (دورياً) مع تحديث last_used_at
   */
  async pickNextKey(provider: string): Promise<ConfigKey | null> {
    const keys = await this.getAvailableKeys(provider);
    if (!keys.length) {
      console.warn(`لا توجد مفاتيح متاحة للمزود ${provider}`);
      return null;
    }

    const key = keys[0]; // الأقل استخداماً
    await this.incrementUsage(key.id);
    console.log(`تم اختيار المفتاح ${key.key} للمزود ${provider}`);
    return key;
  }

  /**
   * وسم مفتاح كفاشل مؤقتاً
   */
  async markKeyFailed(keyId: number, backoffSeconds: number = 24 * 60 * 60): Promise<void> {
    try {
      const failedUntil = new Date(Date.now() + backoffSeconds * 1000).toISOString();
      
      // استخدام الوظيفة المحدثة من storage.ts
      await this.storage.markKeyFailed(keyId, failedUntil);
      
      console.warn(`تم وسم المفتاح ${keyId} كفاشل حتى ${failedUntil}`);
    } catch (error) {
      console.error('خطأ في وسم المفتاح كفاشل:', error);
    }
  }

  /**
   * زيادة عداد الاستخدام اليومي
   */
  async incrementUsage(keyId: number): Promise<void> {
    try {
      // استخدام الوظيفة المحدثة من storage.ts
      await this.storage.updateKeyUsage(keyId);
    } catch (error) {
      console.error('خطأ في زيادة عداد الاستخدام:', error);
    }
  }

  /**
   * إعادة تعيين فشل المفاتيح ومعادلات الاستخدام اليومية
   */
  async resetFailedFlags(): Promise<void> {
    try {
      // استخدام الوظيفة المحدثة من storage.ts
      await this.storage.resetDailyUsage();
      console.log('تم إعادة تعيين جميع حالات فشل المفاتيح والاستخدام اليومي');
    } catch (error) {
      console.error('خطأ في إعادة تعيين حالات المفاتيح:', error);
    }
  }

  /**
   * الحصول على إحصائيات المفاتيح
   */
  async getKeyStats(): Promise<KeyStats[]> {
    try {
      const allKeys = await this.storage.getAllConfigKeys();
      const now = new Date().toISOString();
      
      return allKeys.map(key => ({
        id: key.id,
        key: key.key,
        provider: key.provider,
        lastUsedAt: key.lastUsedAt,
        failedUntil: key.failedUntil,
        usageToday: key.usageToday || 0,
        dailyQuota: key.dailyQuota,
        isAvailable: this.isKeyAvailable(key, now)
      }));
    } catch (error) {
      console.error('خطأ في جلب إحصائيات المفاتيح:', error);
      return [];
    }
  }


  /**
   * فحص إذا كان المفتاح متاحاً
   */
  private isKeyAvailable(key: ConfigKey, now: string): boolean {
    // تحقق من الفشل
    if (key.failedUntil && key.failedUntil > now) return false;
    
    // تحقق من الحد اليومي
    if (key.dailyQuota && (key.usageToday || 0) >= key.dailyQuota) return false;
    
    return true;
  }

  /**
   * جلب مفتاح من cache أو قاعدة البيانات
   */
  async getKey(keyName: string, fallbackValue?: string): Promise<string | null> {
    try {
      // أولاً محاولة جلب من cache
      const cachedKey = await cacheService.get(`api_key:${keyName}`);
      if (cachedKey) {
        console.log(`تم جلب المفتاح ${keyName} من cache`);
        return cachedKey;
      }

      // البحث في قاعدة البيانات
      const configKey = await this.storage.getConfigKey(keyName);
      if (configKey && configKey.value) {
        // حفظ في cache لمدة 5 دقائق
        await cacheService.set(`api_key:${keyName}`, configKey.value, 300);
        console.log(`تم جلب المفتاح ${keyName} من قاعدة البيانات`);
        return configKey.value;
      }

      // fallback لمتغيرات البيئة
      if (fallbackValue) {
        console.log(`استخدام fallback للمفتاح ${keyName}`);
        return fallbackValue;
      }

      return null;
    } catch (error) {
      console.error(`خطأ في جلب المفتاح ${keyName}:`, error);
      return fallbackValue || null;
    }
  }

  /**
   * جلب مفتاح متقدم مع دعم تناوب المزودين
   */
  async getKeyForProvider(provider: string, fallbackKeyName?: string, fallbackValue?: string): Promise<{
    key: string | null;
    keyId: number | null;
    source: 'database' | 'fallback' | 'cache';
  }> {
    try {
      // محاولة جلب مفتاح متاح للمزود
      const nextKey = await this.pickNextKey(provider);
      if (nextKey) {
        return {
          key: nextKey.value,
          keyId: nextKey.id,
          source: 'database'
        };
      }

      // fallback للمفتاح المحدد
      if (fallbackKeyName) {
        const fallbackKey = await this.getKey(fallbackKeyName, fallbackValue);
        if (fallbackKey) {
          return {
            key: fallbackKey,
            keyId: null,
            source: 'fallback'
          };
        }
      }

      return {
        key: null,
        keyId: null,
        source: 'fallback'
      };
    } catch (error) {
      console.error(`خطأ في جلب مفتاح للمزود ${provider}:`, error);
      return {
        key: fallbackValue || null,
        keyId: null,
        source: 'fallback'
      };
    }
  }
}