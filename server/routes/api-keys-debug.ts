
import express from 'express';
import { storage } from '../storage';

export const apiKeysDebugRouter = express.Router();

// مسار للتحقق من مصادر مفاتيح API
apiKeysDebugRouter.get('/sources', async (req, res) => {
  try {
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
      } catch (error) {
        fromDatabase = { exists: false, error: error.message };
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

  } catch (error) {
    console.error('خطأ في فحص مصادر المفاتيح:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء فحص مصادر المفاتيح',
      error: error.message
    });
  }
});

// مسار لنقل المفاتيح من متغيرات البيئة إلى قاعدة البيانات
apiKeysDebugRouter.post('/migrate-to-database', async (req, res) => {
  try {
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
        } catch (error) {
          migrationResults.push({
            keyName,
            status: 'error',
            message: `خطأ في النقل: ${error.message}`
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

  } catch (error) {
    console.error('خطأ في نقل المفاتيح:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء نقل المفاتيح',
      error: error.message
    });
  }
});
