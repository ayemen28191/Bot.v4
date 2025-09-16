
import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { catchAsync } from '../middleware/global-error-handler';
import { 
  createDatabaseError, 
  ERROR_CODES, 
  ERROR_MESSAGES 
} from '@shared/error-types';

export const apiKeysDebugRouter = express.Router();

// مسار للتحقق من مصادر مفاتيح API
apiKeysDebugRouter.get('/sources', catchAsync(async (req: Request, res: Response) => {
  const keyNames = [
    'MARKET_API_KEY',
    'PRIMARY_API_KEY', 
    'TWELVEDATA_API_KEY',
    'BINANCE_API_KEY',
    'BINANCE_SECRET_KEY',
    'BACKUP_API_KEYS'
  ];

  const results = [];

  for (const keyName of keyNames) {
    // التحقق من قاعدة البيانات
    let fromDatabase = null;
    let fromEnv = null;
    
    try {
      const dbKey = await storage.getConfigKey(keyName);
      if (dbKey) {
        fromDatabase = {
          exists: true,
          value: `${dbKey.value.substring(0, 4)}...${dbKey.value.substring(dbKey.value.length - 4)}`,
          updatedAt: dbKey.updatedAt
        };
      } else {
        fromDatabase = { exists: false };
      }
    } catch (error: any) {
      // معالجة خطأ فرعي - نحول إلى AppError إذا كان خطأ قاعدة بيانات مهم
      fromDatabase = { exists: false, error: error?.message || 'خطأ غير معروف' };
    }

    // التحقق من متغيرات البيئة
    const envValue = process.env[keyName];
    if (envValue) {
      fromEnv = {
        exists: true,
        value: `${envValue.substring(0, 4)}...${envValue.substring(envValue.length - 4)}`
      };
    } else {
      fromEnv = { exists: false };
    }

    results.push({
      keyName,
      database: fromDatabase,
      environment: fromEnv,
      currentSource: fromDatabase.exists ? 'database' : (fromEnv.exists ? 'environment' : 'none')
    });
  }

  res.json({
    success: true,
    keys: results,
    summary: {
      databaseKeys: results.filter(r => r.database.exists).length,
      environmentKeys: results.filter(r => r.environment.exists).length,
      totalKeys: keyNames.length
    }
  });
}));

// مسار لنقل المفاتيح من متغيرات البيئة إلى قاعدة البيانات
apiKeysDebugRouter.post('/migrate-to-database', catchAsync(async (req: Request, res: Response) => {
  const keyNames = [
    'MARKET_API_KEY',
    'PRIMARY_API_KEY', 
    'TWELVEDATA_API_KEY',
    'BINANCE_API_KEY',
    'BINANCE_SECRET_KEY',
    'BACKUP_API_KEYS'
  ];

  const migrationResults = [];

  for (const keyName of keyNames) {
    const envValue = process.env[keyName];
    
    if (envValue) {
      try {
        // التحقق من وجود المفتاح في قاعدة البيانات
        const existingKey = await storage.getConfigKey(keyName);
        
        if (!existingKey) {
          // إضافة المفتاح إلى قاعدة البيانات
          await storage.setConfigKey(
            keyName, 
            envValue, 
            `مفتاح ${keyName} المنقول من متغيرات البيئة`, 
            true
          );
          
          migrationResults.push({
            keyName,
            status: 'migrated',
            message: 'تم نقل المفتاح بنجاح'
          });
        } else {
          migrationResults.push({
            keyName,
            status: 'exists',
            message: 'المفتاح موجود بالفعل في قاعدة البيانات'
          });
        }
      } catch (error: any) {
        // معالجة أخطاء قاعدة البيانات على مستوى المفتاح الفردي
        migrationResults.push({
          keyName,
          status: 'error',
          message: `خطأ في النقل: ${error?.message || 'خطأ غير معروف'}`
        });
      }
    } else {
      migrationResults.push({
        keyName,
        status: 'not_found',
        message: 'المفتاح غير موجود في متغيرات البيئة'
      });
    }
  }

  res.json({
    success: true,
    migration: migrationResults
  });
}));
