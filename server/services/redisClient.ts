import Redis from 'ioredis';
import env from '../env';

// تكوين Redis - يمكن استخدام في الذاكرة إذا لم يكن Redis متاحاً
let redis: Redis | null = null;

try {
  // محاولة الاتصال بـ Redis (يستخدم localhost:6379 افتراضياً)
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    connectTimeout: 5000,
    lazyConnect: true, // لا يتصل حتى نستخدمه
    enableReadyCheck: false,
    maxRetriesPerRequest: 1,
  });

  // التحقق من الاتصال
  redis.on('connect', () => {
    console.log('✅ متصل بـ Redis بنجاح');
  });

  redis.on('error', (err) => {
    console.warn('⚠️ خطأ في اتصال Redis:', err.message);
    console.log('🔄 سيتم استخدام cache في الذاكرة بدلاً من Redis');
    redis = null;
  });
} catch (error) {
  console.warn('⚠️ فشل في تهيئة Redis:', error);
  console.log('🔄 سيتم استخدام cache في الذاكرة بدلاً من Redis');
  redis = null;
}

// Cache بديل في الذاكرة
const memoryCache = new Map<string, { value: any; expires: number }>();

class CacheService {
  async get(key: string): Promise<string | null> {
    if (redis) {
      try {
        return await redis.get(key);
      } catch (error) {
        console.warn(`Redis get error for key ${key}:`, error);
      }
    }
    
    // استخدام memory cache كبديل
    const cached = memoryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
    memoryCache.delete(key);
    return null;
  }

  async set(key: string, value: string, ttlSeconds: number = 60): Promise<void> {
    if (redis) {
      try {
        await redis.setex(key, ttlSeconds, value);
        return;
      } catch (error) {
        console.warn(`Redis set error for key ${key}:`, error);
      }
    }
    
    // استخدام memory cache كبديل
    memoryCache.set(key, {
      value,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }

  async del(key: string): Promise<void> {
    if (redis) {
      try {
        await redis.del(key);
        return;
      } catch (error) {
        console.warn(`Redis del error for key ${key}:`, error);
      }
    }
    
    memoryCache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    if (redis) {
      try {
        const result = await redis.exists(key);
        return result === 1;
      } catch (error) {
        console.warn(`Redis exists error for key ${key}:`, error);
      }
    }
    
    const cached = memoryCache.get(key);
    return cached ? cached.expires > Date.now() : false;
  }

  // تنظيف الذاكرة المؤقتة (للمفاتيح المنتهية الصلاحية)
  cleanup(): void {
    if (!redis) {
      const now = Date.now();
      memoryCache.forEach((data, key) => {
        if (data.expires <= now) {
          memoryCache.delete(key);
        }
      });
    }
  }
}

const cacheService = new CacheService();

// تنظيف دوري للذاكرة المؤقتة
setInterval(() => {
  cacheService.cleanup();
}, 60 * 1000); // كل دقيقة

export default cacheService;
export { redis };