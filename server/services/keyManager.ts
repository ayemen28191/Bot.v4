import { IStorage } from '../storage';
import cacheService from './redisClient';
import { ConfigKey } from '@shared/schema';
import { 
  createError, 
  createApiLimitError, 
  createDatabaseError, 
  ErrorCategory, 
  ErrorSeverity,
  maskSensitiveData 
} from '@shared/error-types';
import { UnifiedErrorHandler } from '@shared/unified-error-handler';

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
      if (!provider || typeof provider !== 'string') {
        const validationError = createError(
          ErrorCategory.VALIDATION,
          'INVALID_PROVIDER',
          'Provider parameter is required and must be a string',
          { 
            details: { provider },
            severity: ErrorSeverity.MEDIUM,
            userFriendly: false
          }
        );
        UnifiedErrorHandler.handleError(validationError, {
          requestId: 'keymanager-get-available-keys',
          clientIP: '127.0.0.1',
          userAgent: 'KeyManager',
          timestamp: new Date().toISOString()
        });
        return [];
      }

      const allKeys = await this.storage.getAllConfigKeys();
      const now = new Date().toISOString();
      
      const availableKeys = allKeys.filter(key => {
        // تحقق من مطابقة المزود
        if (key.provider !== provider) return false;
        
        // تحقق من عدم الفشل - يجب أن تكون failedUntil منتهية أو null
        if (key.failedUntil && key.failedUntil > now) {
          console.log(`المفتاح ${key.id} لا يزال في فترة التعليق حتى ${key.failedUntil}`);
          return false;
        }
        
        // تحقق من عدم تجاوز الحد اليومي
        if (key.dailyQuota && (key.usageToday || 0) >= key.dailyQuota) {
          console.log(`المفتاح ${key.id} تجاوز الحد اليومي: ${key.usageToday}/${key.dailyQuota}`);
          return false;
        }
        
        return true;
      }).sort((a, b) => {
        // رتب حسب آخر استخدام (الأقل استخداماً أولاً)
        if (!a.lastUsedAt && !b.lastUsedAt) return 0;
        if (!a.lastUsedAt) return -1;
        if (!b.lastUsedAt) return 1;
        return a.lastUsedAt.localeCompare(b.lastUsedAt);
      });

      console.log(`تم العثور على ${availableKeys.length} مفتاح متاح للمزود ${provider} من أصل ${allKeys.length} مفتاح`);
      return availableKeys;
    } catch (error: any) {
      const dbError = createDatabaseError(
        'GET_AVAILABLE_KEYS_FAILED',
        'Failed to retrieve available keys from database',
        'config_keys',
        'select_and_filter'
      );
      
      UnifiedErrorHandler.handleError(dbError, {
        requestId: 'keymanager-get-available-keys-db',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      
      return [];
    }
  }

  /**
   * اختر المفتاح التالي (دورياً) مع تحديث last_used_at بشكل atomic
   */
  async pickNextKey(provider: string): Promise<ConfigKey | null> {
    // تحقق من صحة المعامل
    if (!provider || typeof provider !== 'string') {
      const validationError = createError(
        ErrorCategory.VALIDATION,
        'INVALID_PROVIDER_PICK_KEY',
        'Provider parameter is required for key selection',
        { 
          details: { provider },
          severity: ErrorSeverity.HIGH,
          userFriendly: false
        }
      );
      UnifiedErrorHandler.handleError(validationError, {
        requestId: 'keymanager-pick-next-key',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      return null;
    }

    const db = this.storage.getDatabase();
    
    try {
      return await this.executeAtomicKeySelection(db, provider);
    } catch (error: any) {
      const dbError = createDatabaseError(
        'PICK_KEY_TRANSACTION_FAILED',
        'Failed to execute atomic key selection transaction',
        'config_keys',
        'atomic_select_update'
      );
      
      UnifiedErrorHandler.handleError(dbError, {
        requestId: 'keymanager-pick-next-key-transaction',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      
      return null;
    }
  }

  /**
   * تنفيذ عملية اختيار المفتاح بشكل atomic
   */
  private async executeAtomicKeySelection(db: any, provider: string): Promise<ConfigKey | null> {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', (beginErr: Error | null) => {
          if (beginErr) {
            reject(beginErr);
            return;
          }

          const now = new Date().toISOString();
          // استعلام محسن مع ترتيب أفضل للمفاتيح
          const query = `
            SELECT * FROM config_keys 
            WHERE provider = ? 
              AND (failed_until IS NULL OR failed_until <= ?)
              AND (daily_quota IS NULL OR COALESCE(usage_today, 0) < daily_quota)
              AND key IS NOT NULL AND TRIM(key) != ''
            ORDER BY 
              CASE WHEN last_used_at IS NULL THEN 0 ELSE 1 END,
              COALESCE(usage_today, 0) ASC,
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
              // استخدام النظام الموحد للأخطاء بدلاً من console.warn
              const noKeysError = createApiLimitError(
                'NO_AVAILABLE_KEYS',
                `No available API keys found for provider: ${provider}`,
                provider
              );
              
              UnifiedErrorHandler.handleError(noKeysError, {
                requestId: 'keymanager-no-available-keys',
                clientIP: '127.0.0.1',
                userAgent: 'KeyManager',
                timestamp: new Date().toISOString()
              });
              
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
                
                console.log(`تم اختيار المفتاح (معرف: ${row.id}) للمزود ${provider} - الاستخدام: ${(row.usage_today || 0) + 1}`);
                
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
    });
  }

  /**
   * وسم مفتاح كفاشل مؤقتاً مع معالجة أخطاء شاملة
   */
  async markKeyFailed(keyId: number, backoffSeconds: number = 24 * 60 * 60): Promise<void> {
    // تحقق من صحة المعاملات
    if (!keyId || typeof keyId !== 'number' || keyId <= 0) {
      const validationError = createError(
        ErrorCategory.VALIDATION,
        'INVALID_KEY_ID',
        'Key ID must be a positive number',
        { 
          details: { keyId, backoffSeconds },
          severity: ErrorSeverity.HIGH,
          userFriendly: false
        }
      );
      UnifiedErrorHandler.handleError(validationError, {
        requestId: 'keymanager-mark-key-failed-validation',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (backoffSeconds < 0 || backoffSeconds > 30 * 24 * 60 * 60) { // حد أقصى 30 يوم
      const validationError = createError(
        ErrorCategory.VALIDATION,
        'INVALID_BACKOFF_DURATION',
        'Backoff duration must be between 0 and 30 days',
        { 
          details: { keyId, backoffSeconds, maxSeconds: 30 * 24 * 60 * 60 },
          severity: ErrorSeverity.MEDIUM,
          userFriendly: false
        }
      );
      UnifiedErrorHandler.handleError(validationError, {
        requestId: 'keymanager-mark-key-failed-backoff-validation',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      const failedUntil = new Date(Date.now() + backoffSeconds * 1000).toISOString();
      
      // تحقق من وجود المفتاح قبل وسمه كفاشل
      const existingKey = await this.getKeyById(keyId);
      if (!existingKey) {
        const notFoundError = createError(
          ErrorCategory.DATABASE,
          'KEY_NOT_FOUND',
          `API key with ID ${keyId} not found`,
          { 
            details: { keyId },
            severity: ErrorSeverity.MEDIUM,
            userFriendly: false
          }
        );
        UnifiedErrorHandler.handleError(notFoundError, {
          requestId: 'keymanager-key-not-found',
          clientIP: '127.0.0.1',
          userAgent: 'KeyManager',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // تنفيذ وسم الفشل
      await this.storage.markKeyFailed(keyId, failedUntil);
      
      console.log(`تم وسم المفتاح (معرف: ${keyId}) كفاشل حتى ${failedUntil} - المزود: ${existingKey.provider || 'غير محدد'}`);
      
      // تسجيل حدث وسم الفشل للمتابعة
      const keyFailedEvent = createApiLimitError(
        'KEY_MARKED_FAILED',
        `API key ${keyId} marked as failed until ${failedUntil}`,
        existingKey.provider || undefined,
        keyId,
        failedUntil
      );
      
      UnifiedErrorHandler.handleError(keyFailedEvent, {
        requestId: 'keymanager-key-marked-failed',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      const dbError = createDatabaseError(
        'MARK_KEY_FAILED_ERROR',
        'Failed to mark API key as failed in database',
        'config_keys',
        'update_failed_status'
      );
      
      UnifiedErrorHandler.handleError(dbError, {
        requestId: 'keymanager-mark-key-failed-db-error',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * جلب مفتاح بالمعرف - دالة مساعدة للتحقق
   */
  private async getKeyById(keyId: number): Promise<ConfigKey | null> {
    try {
      const allKeys = await this.storage.getAllConfigKeys();
      return allKeys.find(key => key.id === keyId) || null;
    } catch (error: any) {
      const dbError = createDatabaseError(
        'GET_KEY_BY_ID_FAILED',
        'Failed to retrieve key by ID',
        'config_keys',
        'select_by_id'
      );
      
      UnifiedErrorHandler.handleError(dbError, {
        requestId: 'keymanager-get-key-by-id',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      
      return null;
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