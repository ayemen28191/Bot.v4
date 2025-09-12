import express from 'express';
import { getKeyFromDatabase } from '../env';
import { storage } from '../storage';
import { getCurrentPrice } from '../services/price-sources';

// إنشاء جهاز التوجيه للاختبار
export const testRouter = express.Router();

// نقطة نهاية للتحقق من حالة الخادم
testRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  });
});

// اختبار استرجاع مفتاح API من قاعدة البيانات
testRouter.get('/api-key/:key', async (req, res) => {
  try {
    const keyName = req.params.key;
    
    // استرجاع المفتاح من قاعدة البيانات
    const keyValue = await getKeyFromDatabase(storage, keyName);
    
    if (keyValue) {
      // إخفاء جزء من قيمة المفتاح للأمان
      const maskedValue = keyValue.length > 8 
        ? `${keyValue.substring(0, 4)}...${keyValue.substring(keyValue.length - 4)}`
        : '****';
      
      res.json({
        success: true,
        key: keyName,
        exists: true,
        source: 'database',
        maskedValue
      });
    } else {
      // المفتاح غير موجود في قاعدة البيانات
      res.json({
        success: false,
        key: keyName,
        exists: false,
        message: 'المفتاح غير موجود في قاعدة البيانات'
      });
    }
  } catch (error) {
    console.error('خطأ في اختبار المفتاح:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});

// اختبار استخدام المفاتيح الاحتياطية
testRouter.get('/backup-key-test', async (req, res) => {
  try {
    // الحصول على المفتاح الرئيسي من قاعدة البيانات
    const primaryKey = await getKeyFromDatabase(storage, 'PRIMARY_API_KEY');
    // الحصول على المفاتيح الاحتياطية من قاعدة البيانات
    const backupKeys = await getKeyFromDatabase(storage, 'BACKUP_API_KEYS');
    
    // التأكد من وجود المفاتيح
    if (!primaryKey || !backupKeys) {
      return res.status(400).json({
        success: false,
        message: 'المفاتيح الرئيسية أو الاحتياطية غير متوفرة'
      });
    }
    
    // فصل المفاتيح الاحتياطية بالفاصلة
    const backupKeyArray = backupKeys.split(',').map(key => key.trim());
    
    res.json({
      success: true,
      primary: {
        key: 'PRIMARY_API_KEY',
        maskedValue: `${primaryKey.substring(0, 4)}...${primaryKey.substring(primaryKey.length - 4)}`
      },
      backup: {
        count: backupKeyArray.length,
        keys: backupKeyArray.map(key => ({
          maskedValue: key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : '****'
        }))
      }
    });
  } catch (error) {
    console.error('خطأ في اختبار المفاتيح الاحتياطية:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});

// اختبار توفر كل مفاتيح API
testRouter.get('/all-keys', async (req, res) => {
  try {
    const keys = ['PRIMARY_API_KEY', 'BACKUP_API_KEYS', 'MARKET_API_KEY', 'TWELVEDATA_API_KEY', 'BINANCE_API_KEY', 'BINANCE_SECRET_KEY'];
    const results: Record<string, any> = {};
    
    for (const key of keys) {
      const value = await getKeyFromDatabase(storage, key);
      results[key] = {
        exists: !!value,
        source: value ? 'database' : 'not found',
        maskedValue: value ? 
          `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : null
      };
    }
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('خطأ في اختبار توفر المفاتيح:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});

// اختبار جلب السعر باستخدام مفاتيح API
testRouter.get('/price/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    
    console.log(`بدء اختبار جلب السعر للرمز: ${symbol}`);
    const startTime = Date.now();
    
    // جلب السعر باستخدام خدمات أسعار مختلفة
    const result = await getCurrentPrice(symbol);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (result.price !== null) {
      res.json({
        success: true,
        symbol,
        price: result.price,
        source: result.source,
        duration: `${duration}ms`
      });
    } else {
      res.status(400).json({
        success: false,
        symbol,
        error: result.error || 'فشل في جلب السعر',
        duration: `${duration}ms`
      });
    }
  } catch (error) {
    console.error('خطأ في اختبار جلب السعر:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});