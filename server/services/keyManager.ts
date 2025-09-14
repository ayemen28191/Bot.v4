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
   * اختر المفتاح التالي (دورياً) مع تحديث last_used_at بشكل atomic
   */
  async pickNextKey(provider: string): Promise<ConfigKey | null> {
    try {
      // استخدام transaction واحد atomic للحصول على المفتاح وتحديث الاستخدام
      const db = this.storage.getDatabase();
      
      return new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          
          // البحث عن أفضل مفتاح متاح مع قفل للقراءة
          const now = new Date().toISOString();
          const query = `
            SELECT * FROM config_keys 
            WHERE provider = ? 
              AND (failed_until IS NULL OR failed_until <= ?)
              AND (daily_quota IS NULL OR usage_today < daily_quota OR usage_today IS NULL)
            ORDER BY 
              CASE WHEN last_used_at IS NULL THEN 0 ELSE 1 END,
              last_used_at ASC
            LIMIT 1
          `;
          
          db.get(query, [provider, now], (err: Error | null, row: any) => {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            if (!row) {
              db.run('ROLLBACK');
              console.warn(`لا توجد مفاتيح متاحة للمزود ${provider}`);
              resolve(null);
              return;
            }
            
            // تحديث الاستخدام atomically
            const updateQuery = `
              UPDATE config_keys 
              SET last_used_at = ?, usage_today = COALESCE(usage_today, 0) + 1, updated_at = ?
              WHERE id = ?
            `;
            
            db.run(updateQuery, [now, now, row.id], (updateErr: Error | null) => {
              if (updateErr) {
                db.run('ROLLBACK');
                reject(updateErr);
                return;
              }
              
              db.run('COMMIT', (commitErr: Error | null) => {
                if (commitErr) {
                  reject(commitErr);
                  return;
                }
                
                console.log(`تم اختيار المفتاح (معرف: ${row.id}) للمزود ${provider}`);
                
                // إرجاع المفتاح مع القيم المحدثة
                const updatedKey: ConfigKey = {
                  ...row,
                  lastUsedAt: now,
                  usageToday: (row.usage_today || 0) + 1
                };
                
                resolve(updatedKey);
              });
            });
          });
        });
      });
    } catch (error) {
      console.error('خطأ في اختيار المفتاح:', error);
      return null;
    }
  }

  /**
   * وسم مفتاح كفاشل مؤقتاً
   */
  async markKeyFailed(keyId: number, backoffSeconds: number = 24 * 60 * 60): Promise<void> {
    try {
      const failedUntil = new Date(Date.now() + backoffSeconds * 1000).toISOString();
      
      // استخدام الوظيفة المحدثة من storage.ts
      await this.storage.markKeyFailed(keyId, failedUntil);
      
      console.warn(`تم وسم المفتاح (معرف: ${keyId}) كفاشل حتى ${failedUntil}`);
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
        key: this.maskApiKey(key.key),
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
   * إخفاء المفتاح للأمان (عرض جزء منه فقط)
   */
  private maskApiKey(key: string): string {
    if (!key || key.length < 8) return '***';
    return key.substring(0, 4) + '...' + key.substring(key.length - 4);
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