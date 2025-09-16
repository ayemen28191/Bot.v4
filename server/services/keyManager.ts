import { IStorage } from '../storage';
import cacheService from './redisClient';
import { ConfigKey } from '@shared/schema';
import { 
  createError, 
  createApiLimitError, 
  createDatabaseError, 
  ErrorCategory, 
  ErrorSeverity,
  maskSensitiveData,
  AppError,
  isRetryableError 
} from '@shared/error-types';
import { UnifiedErrorHandler } from '@shared/unified-error-handler';

// Enhanced error types specific to KeyManager
export enum KeyManagerErrorCode {
  NO_KEYS_AVAILABLE = 'NO_KEYS_AVAILABLE',
  KEY_VALIDATION_FAILED = 'KEY_VALIDATION_FAILED',
  KEY_SELECTION_FAILED = 'KEY_SELECTION_FAILED',
  KEY_MARKING_FAILED = 'KEY_MARKING_FAILED',
  DATABASE_TRANSACTION_FAILED = 'DATABASE_TRANSACTION_FAILED',
  INVALID_PROVIDER = 'INVALID_PROVIDER',
  KEY_NOT_FOUND = 'KEY_NOT_FOUND',
  USAGE_LIMIT_EXCEEDED = 'USAGE_LIMIT_EXCEEDED',
  INVALID_KEY_ID = 'INVALID_KEY_ID'
}

export enum FailureType {
  RATE_LIMIT = 'rate_limit',
  AUTHENTICATION = 'authentication', 
  NETWORK = 'network',
  SERVER_ERROR = 'server_error',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

// Enhanced backoff strategy based on failure type
const BACKOFF_STRATEGIES = {
  [FailureType.RATE_LIMIT]: {
    baseDelay: 60 * 60, // 1 hour
    maxDelay: 24 * 60 * 60, // 24 hours
    multiplier: 2
  },
  [FailureType.AUTHENTICATION]: {
    baseDelay: 30 * 60, // 30 minutes
    maxDelay: 6 * 60 * 60, // 6 hours
    multiplier: 1.5
  },
  [FailureType.NETWORK]: {
    baseDelay: 5 * 60, // 5 minutes
    maxDelay: 60 * 60, // 1 hour
    multiplier: 1.5
  },
  [FailureType.SERVER_ERROR]: {
    baseDelay: 15 * 60, // 15 minutes
    maxDelay: 4 * 60 * 60, // 4 hours
    multiplier: 2
  },
  [FailureType.VALIDATION]: {
    baseDelay: 10 * 60, // 10 minutes
    maxDelay: 2 * 60 * 60, // 2 hours
    multiplier: 1.5
  },
  [FailureType.UNKNOWN]: {
    baseDelay: 30 * 60, // 30 minutes
    maxDelay: 12 * 60 * 60, // 12 hours
    multiplier: 2
  }
};

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

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
  private readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2
  };

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Retry mechanism for operations that may temporarily fail
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    operationName: string = 'unknown'
  ): Promise<T> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry validation errors or non-retryable errors
        if (attempt === retryConfig.maxAttempts || !this.isRetryableError(error)) {
          break;
        }

        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelay
        );

        console.log(`Retry attempt ${attempt}/${retryConfig.maxAttempts} for ${operationName} after ${delay}ms delay`);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Check if it's an AppError first
    if (error.category && error.retryable !== undefined) {
      return error.retryable;
    }

    // Network and database errors are usually retryable
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED' || 
        error.code === 'ETIMEDOUT' || error.code === 'SQLITE_BUSY') {
      return true;
    }

    // SQLite specific errors that are retryable
    if (error.message && error.message.includes('database is locked')) {
      return true;
    }

    return false;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate smart backoff duration based on failure type
   */
  private calculateBackoffDuration(failureType: FailureType, currentFailureCount: number = 1): number {
    const strategy = BACKOFF_STRATEGIES[failureType];
    const calculatedDelay = strategy.baseDelay * Math.pow(strategy.multiplier, currentFailureCount - 1);
    return Math.min(calculatedDelay, strategy.maxDelay);
  }

  /**
   * Determine failure type from error details
   */
  private determineFailureType(error: any, statusCode?: number): FailureType {
    if (statusCode === 429) return FailureType.RATE_LIMIT;
    if (statusCode === 401 || statusCode === 403) return FailureType.AUTHENTICATION;
    if (statusCode && statusCode >= 500) return FailureType.SERVER_ERROR;
    if (statusCode && statusCode >= 400 && statusCode < 500) return FailureType.VALIDATION;
    
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return FailureType.NETWORK;
    }

    return FailureType.UNKNOWN;
  }

  /**
   * جلب المفاتيح المتاحة لمزود محدد (غير الفاشلة حالياً)
   * Enhanced with proper error handling - throws instead of silent returns
   */
  async getAvailableKeys(provider: string, throwOnEmpty: boolean = false): Promise<ConfigKey[]> {
    // Immediate validation error throwing
    if (!provider || typeof provider !== 'string') {
      const validationError = createError(
        ErrorCategory.VALIDATION,
        KeyManagerErrorCode.INVALID_PROVIDER,
        'Provider parameter is required and must be a string',
        { 
          details: { provider },
          severity: ErrorSeverity.HIGH,
          userFriendly: false,
          retryable: false
        }
      );
      throw validationError;
    }

    try {
      const availableKeys = await this.withRetry(async () => {
        const allKeys = await this.storage.getAllConfigKeys();
        const now = new Date().toISOString();
        
        const filtered = allKeys.filter(key => {
          // تحقق من مطابقة المزود
          if (key.provider !== provider) return false;
          
          // تحقق من عدم الفشل - يجب أن تكون failedUntil منتهية أو null
          if (key.failedUntil && key.failedUntil > now) {
            console.log(`Key ${key.id} still suspended until ${key.failedUntil}`);
            return false;
          }
          
          // تحقق من عدم تجاوز الحد اليومي
          if (key.dailyQuota && (key.usageToday || 0) >= key.dailyQuota) {
            console.log(`Key ${key.id} exceeded daily quota: ${key.usageToday}/${key.dailyQuota}`);
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

        console.log(`Found ${filtered.length} available keys for provider ${provider} out of ${allKeys.length} total keys`);
        return filtered;
      }, {}, `getAvailableKeys-${provider}`);

      // Optionally throw if no keys available (for critical operations)
      if (throwOnEmpty && availableKeys.length === 0) {
        const noKeysError = createApiLimitError(
          KeyManagerErrorCode.NO_KEYS_AVAILABLE,
          `No available API keys found for provider: ${provider}`,
          provider
        );
        throw noKeysError;
      }

      return availableKeys;
    } catch (error: any) {
      // Re-throw if it's already a proper error
      if (error.category) {
        throw error;
      }

      // Wrap database errors
      const dbError = createDatabaseError(
        'GET_AVAILABLE_KEYS_FAILED',
        `Failed to retrieve available keys for provider ${provider}: ${error.message}`,
        'config_keys',
        'select_and_filter'
      );
      
      UnifiedErrorHandler.handleError(dbError, {
        requestId: 'keymanager-get-available-keys-db',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      
      throw dbError;
    }
  }

  /**
   * اختر المفتاح التالي (دورياً) مع تحديث last_used_at بشكل atomic
   * Enhanced to throw errors instead of returning null for critical failures
   */
  async pickNextKey(provider: string, allowEmpty: boolean = false): Promise<ConfigKey | null> {
    // Immediate validation error throwing
    if (!provider || typeof provider !== 'string') {
      const validationError = createError(
        ErrorCategory.VALIDATION,
        KeyManagerErrorCode.INVALID_PROVIDER,
        'Provider parameter is required for key selection',
        { 
          details: { provider },
          severity: ErrorSeverity.HIGH,
          userFriendly: false,
          retryable: false
        }
      );
      throw validationError;
    }

    const db = this.storage.getDatabase();
    
    try {
      const selectedKey = await this.withRetry(async () => {
        return await this.executeAtomicKeySelection(db, provider);
      }, { maxAttempts: 2 }, `pickNextKey-${provider}`);

      // If no key found and not allowing empty, throw error
      if (!selectedKey && !allowEmpty) {
        const noKeysError = createApiLimitError(
          KeyManagerErrorCode.NO_KEYS_AVAILABLE,
          `No available API keys found for provider: ${provider}`,
          provider
        );
        throw noKeysError;
      }

      return selectedKey;
    } catch (error: any) {
      // Re-throw if it's already a proper error
      if (error.category) {
        throw error;
      }

      // Wrap database errors
      const dbError = createDatabaseError(
        KeyManagerErrorCode.KEY_SELECTION_FAILED,
        `Failed to select API key for provider ${provider}: ${error.message}`,
        'config_keys',
        'atomic_select_update'
      );
      
      UnifiedErrorHandler.handleError(dbError, {
        requestId: 'keymanager-pick-next-key-transaction',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      
      throw dbError;
    }
  }

  /**
   * تنفيذ عملية اختيار المفتاح بشكل atomic
   * Enhanced with better error handling and transaction management
   */
  private async executeAtomicKeySelection(db: any, provider: string): Promise<ConfigKey | null> {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', (beginErr: Error | null) => {
          if (beginErr) {
            const transactionError = createDatabaseError(
              KeyManagerErrorCode.DATABASE_TRANSACTION_FAILED,
              'Failed to begin database transaction for key selection',
              'config_keys',
              'begin_transaction'
            );
            reject(transactionError);
            return;
          }

          const now = new Date().toISOString();
          // Enhanced query with better key prioritization
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
              const queryError = createDatabaseError(
                KeyManagerErrorCode.KEY_SELECTION_FAILED,
                `Database query failed during key selection for provider ${provider}`,
                'config_keys',
                'select_available_key'
              );
              reject(queryError);
              return;
            }
            
            if (!row) {
              db.run('ROLLBACK');
              console.log(`No available keys found for provider ${provider}`);
              resolve(null);
              return;
            }
            
            // Update usage atomically with better error handling
            const updateQuery = `
              UPDATE config_keys 
              SET last_used_at = ?, usage_today = COALESCE(usage_today, 0) + 1, updated_at = ?
              WHERE id = ?
            `;
            
            db.run(updateQuery, [now, now, row.id], (updateErr: Error | null) => {
              if (updateErr) {
                db.run('ROLLBACK');
                const updateError = createDatabaseError(
                  KeyManagerErrorCode.KEY_SELECTION_FAILED,
                  `Failed to update key usage for key ID ${row.id}`,
                  'config_keys',
                  'update_usage'
                );
                reject(updateError);
                return;
              }
              
              db.run('COMMIT', (commitErr: Error | null) => {
                if (commitErr) {
                  const commitError = createDatabaseError(
                    KeyManagerErrorCode.DATABASE_TRANSACTION_FAILED,
                    'Failed to commit key selection transaction',
                    'config_keys',
                    'commit_transaction'
                  );
                  reject(commitError);
                  return;
                }
                
                console.log(`Selected key (ID: ${row.id}) for provider ${provider} - Usage: ${(row.usage_today || 0) + 1}`);
                
                // Return updated key with new values
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
   * Enhanced with smart backoff based on failure type and better error handling
   */
  async markKeyFailed(
    keyId: number, 
    failureType: FailureType = FailureType.UNKNOWN, 
    errorDetails?: any,
    customBackoffSeconds?: number
  ): Promise<void> {
    // Immediate validation error throwing
    if (!keyId || typeof keyId !== 'number' || keyId <= 0) {
      const validationError = createError(
        ErrorCategory.VALIDATION,
        KeyManagerErrorCode.INVALID_KEY_ID,
        'Key ID must be a positive number',
        { 
          details: { keyId, failureType, customBackoffSeconds },
          severity: ErrorSeverity.HIGH,
          userFriendly: false,
          retryable: false
        }
      );
      throw validationError;
    }

    try {
      // Get current failure count for progressive backoff
      const existingKey = await this.getKeyById(keyId, true); // throwOnNotFound = true
      if (!existingKey) {
        throw createError(
          ErrorCategory.DATABASE,
          KeyManagerErrorCode.KEY_NOT_FOUND,
          `API key with ID ${keyId} not found for failure marking`,
          { 
            details: { keyId },
            severity: ErrorSeverity.HIGH,
            userFriendly: false,
            retryable: false
          }
        );
      }
      const failureCount = this.getKeyFailureCount(existingKey);
      
      // Calculate smart backoff duration based on failure type
      const backoffSeconds = customBackoffSeconds ?? 
        this.calculateBackoffDuration(failureType, failureCount);

      // Validate backoff duration
      if (backoffSeconds < 0 || backoffSeconds > 30 * 24 * 60 * 60) {
        const validationError = createError(
          ErrorCategory.VALIDATION,
          'INVALID_BACKOFF_DURATION',
          'Backoff duration must be between 0 and 30 days',
          { 
            details: { keyId, backoffSeconds, maxSeconds: 30 * 24 * 60 * 60 },
            severity: ErrorSeverity.MEDIUM,
            userFriendly: false,
            retryable: false
          }
        );
        throw validationError;
      }

      const failedUntil = new Date(Date.now() + backoffSeconds * 1000).toISOString();
      
      // Execute key failure marking with retry mechanism
      await this.withRetry(async () => {
        await this.storage.markKeyFailed(keyId, failedUntil);
      }, { maxAttempts: 2 }, `markKeyFailed-${keyId}`);
      
      console.log(`Marked key (ID: ${keyId}) as failed until ${failedUntil} - Provider: ${existingKey?.provider || 'unknown'} - Failure type: ${failureType}`);
      
      // Log enhanced failure event with categorization
      const keyFailedEvent = createApiLimitError(
        KeyManagerErrorCode.KEY_MARKING_FAILED,
        `API key ${keyId} marked as failed due to ${failureType} until ${failedUntil}`,
        existingKey?.provider || undefined,
        keyId,
        failedUntil
      );
      
      // Add failure details to the event
      keyFailedEvent.details = {
        ...keyFailedEvent.details,
        failureType,
        failureCount: failureCount + 1,
        backoffSeconds,
        errorDetails: errorDetails ? maskSensitiveData(errorDetails) : undefined
      };
      
      UnifiedErrorHandler.handleError(keyFailedEvent, {
        requestId: 'keymanager-key-marked-failed',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      // Re-throw if it's already a proper error
      if (error.category) {
        throw error;
      }

      // Wrap database errors
      const dbError = createDatabaseError(
        KeyManagerErrorCode.KEY_MARKING_FAILED,
        `Failed to mark API key ${keyId} as failed: ${error.message}`,
        'config_keys',
        'update_failed_status'
      );
      
      UnifiedErrorHandler.handleError(dbError, {
        requestId: 'keymanager-mark-key-failed-db-error',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      
      throw dbError;
    }
  }

  /**
   * Get estimated failure count for a key (for progressive backoff)
   */
  private getKeyFailureCount(key: ConfigKey): number {
    // Simple estimation based on current failed state
    // In a more sophisticated system, this could track failure history
    if (!key.failedUntil) return 0;
    
    // Estimate failure count based on how long the key has been failed
    const failedUntilTime = new Date(key.failedUntil).getTime();
    const now = Date.now();
    
    if (failedUntilTime <= now) return 0; // No longer failed
    
    // Simple estimation: longer failures suggest more attempts
    const remainingTime = failedUntilTime - now;
    const oneHour = 60 * 60 * 1000;
    
    if (remainingTime > 24 * oneHour) return 3; // Long backoff
    if (remainingTime > 4 * oneHour) return 2;   // Medium backoff
    if (remainingTime > oneHour) return 1;       // Short backoff
    return 0;
  }

  /**
   * جلب مفتاح بالمعرف - دالة مساعدة للتحقق
   * Enhanced to throw errors instead of silent null returns when requested
   */
  private async getKeyById(keyId: number, throwOnNotFound: boolean = false): Promise<ConfigKey | null> {
    try {
      const foundKey = await this.withRetry(async () => {
        const allKeys = await this.storage.getAllConfigKeys();
        return allKeys.find(key => key.id === keyId) || null;
      }, {}, `getKeyById-${keyId}`);

      if (!foundKey && throwOnNotFound) {
        const notFoundError = createError(
          ErrorCategory.DATABASE,
          KeyManagerErrorCode.KEY_NOT_FOUND,
          `API key with ID ${keyId} not found`,
          { 
            details: { keyId },
            severity: ErrorSeverity.MEDIUM,
            userFriendly: false,
            retryable: false
          }
        );
        throw notFoundError;
      }

      return foundKey;
    } catch (error: any) {
      // Re-throw if it's already a proper error
      if (error.category) {
        throw error;
      }

      // Wrap database errors
      const dbError = createDatabaseError(
        'GET_KEY_BY_ID_FAILED',
        `Failed to retrieve key by ID ${keyId}: ${error.message}`,
        'config_keys',
        'select_by_id'
      );
      
      UnifiedErrorHandler.handleError(dbError, {
        requestId: 'keymanager-get-key-by-id',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      
      if (throwOnNotFound) {
        throw dbError;
      }
      
      return null;
    }
  }

  /**
   * زيادة عداد الاستخدام اليومي
   * Enhanced with proper error handling and validation
   */
  async incrementUsage(keyId: number): Promise<void> {
    // Immediate validation
    if (!keyId || typeof keyId !== 'number' || keyId <= 0) {
      const validationError = createError(
        ErrorCategory.VALIDATION,
        KeyManagerErrorCode.INVALID_KEY_ID,
        'Key ID must be a positive number for usage increment',
        { 
          details: { keyId },
          severity: ErrorSeverity.MEDIUM,
          userFriendly: false,
          retryable: false
        }
      );
      throw validationError;
    }

    try {
      await this.withRetry(async () => {
        await this.storage.updateKeyUsage(keyId);
      }, { maxAttempts: 2 }, `incrementUsage-${keyId}`);
      
      console.log(`Successfully incremented usage for key ID: ${keyId}`);
    } catch (error: any) {
      // Re-throw if it's already a proper error
      if (error.category) {
        throw error;
      }

      // Wrap database errors
      const dbError = createDatabaseError(
        'INCREMENT_USAGE_FAILED',
        `Failed to increment usage for key ${keyId}: ${error.message}`,
        'config_keys',
        'update_usage'
      );
      
      UnifiedErrorHandler.handleError(dbError, {
        requestId: 'keymanager-increment-usage',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      
      throw dbError;
    }
  }

  /**
   * إعادة تعيين فشل المفاتيح ومعادلات الاستخدام اليومية
   * Enhanced with proper error handling
   */
  async resetFailedFlags(): Promise<void> {
    try {
      await this.withRetry(async () => {
        await this.storage.resetDailyUsage();
      }, {}, 'resetFailedFlags');
      
      console.log('Successfully reset all failed key states and daily usage counters');
    } catch (error: any) {
      // Re-throw if it's already a proper error
      if (error.category) {
        throw error;
      }

      // Wrap database errors
      const dbError = createDatabaseError(
        'RESET_FAILED_FLAGS_ERROR',
        `Failed to reset failed flags and daily usage: ${error.message}`,
        'config_keys',
        'bulk_update'
      );
      
      UnifiedErrorHandler.handleError(dbError, {
        requestId: 'keymanager-reset-failed-flags',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      
      throw dbError;
    }
  }

  /**
   * الحصول على إحصائيات المفاتيح
   * Enhanced with proper error handling - throws instead of silent empty array
   */
  async getKeyStats(throwOnError: boolean = false): Promise<KeyStats[]> {
    try {
      const keyStats = await this.withRetry(async () => {
        const allKeys = await this.storage.getAllConfigKeys();
        const now = new Date().toISOString();
        
        return allKeys.map(key => ({
          id: key.id,
          key: this.maskApiKey(key.key || ''),
          provider: key.provider,
          lastUsedAt: key.lastUsedAt,
          failedUntil: key.failedUntil,
          usageToday: key.usageToday || 0,
          dailyQuota: key.dailyQuota,
          isAvailable: this.isKeyAvailable(key, now)
        }));
      }, {}, 'getKeyStats');

      console.log(`Retrieved stats for ${keyStats.length} keys`);
      return keyStats;
    } catch (error: any) {
      // Re-throw if it's already a proper error
      if (error.category) {
        if (throwOnError) throw error;
        
        UnifiedErrorHandler.handleError(error, {
          requestId: 'keymanager-get-key-stats',
          clientIP: '127.0.0.1',
          userAgent: 'KeyManager',
          timestamp: new Date().toISOString()
        });
        return [];
      }

      // Wrap database errors
      const dbError = createDatabaseError(
        'GET_KEY_STATS_FAILED',
        `Failed to retrieve key statistics: ${error.message}`,
        'config_keys',
        'select_all_with_stats'
      );
      
      UnifiedErrorHandler.handleError(dbError, {
        requestId: 'keymanager-get-key-stats',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      
      if (throwOnError) {
        throw dbError;
      }
      
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
   * Enhanced with proper error handling and validation
   */
  async getKey(keyName: string, fallbackValue?: string, throwOnNotFound: boolean = false): Promise<string | null> {
    // Immediate validation
    if (!keyName || typeof keyName !== 'string' || keyName.trim() === '') {
      const validationError = createError(
        ErrorCategory.VALIDATION,
        KeyManagerErrorCode.KEY_VALIDATION_FAILED,
        'Key name must be a non-empty string',
        { 
          details: { keyName, fallbackValue },
          severity: ErrorSeverity.MEDIUM,
          userFriendly: false,
          retryable: false
        }
      );
      throw validationError;
    }

    try {
      const retrievedKey = await this.withRetry(async () => {
        // Try to get from cache first
        let cachedKey: string | null = null;
        try {
          cachedKey = await cacheService.get(`api_key:${keyName}`);
          if (cachedKey) {
            console.log(`Retrieved key ${keyName} from cache`);
            return cachedKey;
          }
        } catch (cacheError) {
          // Cache errors are not critical, continue with database lookup
          console.log(`Cache lookup failed for ${keyName}, continuing with database`);
        }

        // Search in database
        const configKey = await this.storage.getConfigKey(keyName);
        if (configKey && configKey.value) {
          // Save to cache for 5 minutes, but don't fail if cache fails
          try {
            await cacheService.set(`api_key:${keyName}`, configKey.value, 300);
          } catch (cacheError) {
            console.log(`Failed to cache key ${keyName}, but continuing`);
          }
          
          console.log(`Retrieved key ${keyName} from database`);
          return configKey.value;
        }

        return null;
      }, {}, `getKey-${keyName}`);

      // Use fallback if no key found
      if (!retrievedKey && fallbackValue) {
        console.log(`Using fallback for key ${keyName}`);
        return fallbackValue;
      }

      // Optionally throw if no key found and no fallback
      if (!retrievedKey && !fallbackValue && throwOnNotFound) {
        const notFoundError = createError(
          ErrorCategory.DATABASE,
          KeyManagerErrorCode.KEY_NOT_FOUND,
          `Configuration key '${keyName}' not found and no fallback provided`,
          { 
            details: { keyName },
            severity: ErrorSeverity.HIGH,
            userFriendly: false,
            retryable: false
          }
        );
        throw notFoundError;
      }

      return retrievedKey;
    } catch (error: any) {
      // Re-throw if it's already a proper error
      if (error.category) {
        throw error;
      }

      // Wrap other errors
      const dbError = createDatabaseError(
        'GET_KEY_FAILED',
        `Failed to retrieve key '${keyName}': ${error.message}`,
        'config_keys',
        'select_by_name'
      );
      
      UnifiedErrorHandler.handleError(dbError, {
        requestId: 'keymanager-get-key',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      
      if (throwOnNotFound) {
        throw dbError;
      }
      
      return fallbackValue || null;
    }
  }

  /**
   * جلب مفتاح متقدم مع دعم تناوب المزودين
   * Enhanced with proper error handling and recovery mechanisms
   */
  async getKeyForProvider(
    provider: string, 
    fallbackKeyName?: string, 
    fallbackValue?: string,
    throwOnNotFound: boolean = false
  ): Promise<{
    key: string | null;
    keyId: number | null;
    source: 'database' | 'fallback' | 'cache';
    errorReason?: string;
  }> {
    // Immediate validation
    if (!provider || typeof provider !== 'string' || provider.trim() === '') {
      const validationError = createError(
        ErrorCategory.VALIDATION,
        KeyManagerErrorCode.INVALID_PROVIDER,
        'Provider must be a non-empty string for key lookup',
        { 
          details: { provider, fallbackKeyName },
          severity: ErrorSeverity.HIGH,
          userFriendly: false,
          retryable: false
        }
      );
      throw validationError;
    }

    try {
      // Try to get an available key for the provider
      let nextKey: ConfigKey | null = null;
      let noKeysReason: string | undefined;
      
      try {
        nextKey = await this.pickNextKey(provider, true); // allowEmpty = true
      } catch (error: any) {
        noKeysReason = error.message || 'Unknown error during key selection';
        console.log(`Failed to pick key for provider ${provider}: ${noKeysReason}`);
      }
      
      if (nextKey && nextKey.value) {
        return {
          key: nextKey.value,
          keyId: nextKey.id,
          source: 'database'
        };
      }

      // Try fallback key
      if (fallbackKeyName) {
        try {
          const fallbackKey = await this.getKey(fallbackKeyName, fallbackValue, false);
          if (fallbackKey) {
            return {
              key: fallbackKey,
              keyId: null,
              source: 'fallback'
            };
          }
        } catch (fallbackError: any) {
          console.log(`Fallback key ${fallbackKeyName} also failed: ${fallbackError.message}`);
        }
      }

      // If we reach here, no keys are available
      if (throwOnNotFound) {
        const noKeysError = createApiLimitError(
          KeyManagerErrorCode.NO_KEYS_AVAILABLE,
          `No API keys available for provider '${provider}' and no valid fallback`,
          provider
        );
        throw noKeysError;
      }

      return {
        key: fallbackValue || null,
        keyId: null,
        source: 'fallback',
        errorReason: noKeysReason || 'No keys available'
      };
    } catch (error: any) {
      // Re-throw if it's already a proper error
      if (error.category) {
        throw error;
      }

      // Wrap unexpected errors
      const systemError = createError(
        ErrorCategory.SYSTEM,
        'GET_KEY_FOR_PROVIDER_FAILED',
        `Unexpected error getting key for provider '${provider}': ${error.message}`,
        { 
          details: { provider, fallbackKeyName, error: error.message },
          severity: ErrorSeverity.HIGH,
          userFriendly: false,
          retryable: true
        }
      );
      
      UnifiedErrorHandler.handleError(systemError, {
        requestId: 'keymanager-get-key-for-provider',
        clientIP: '127.0.0.1',
        userAgent: 'KeyManager',
        timestamp: new Date().toISOString()
      });
      
      if (throwOnNotFound) {
        throw systemError;
      }
      
      return {
        key: fallbackValue || null,
        keyId: null,
        source: 'fallback',
        errorReason: error.message || 'Unknown error'
      };
    }
  }
}