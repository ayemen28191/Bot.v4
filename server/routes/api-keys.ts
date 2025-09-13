import express from 'express';
import axios from 'axios';
import { storage } from '../storage';
import { ConfigKey } from '../../shared/schema';

// إنشاء جهاز التوجيه لإدارة مفاتيح API
export const apiKeysRouter = express.Router();

// مخطط أساسي لمفتاح API للتعامل مع البيانات المؤقتة
interface ApiKeyPlaceholder {
  key: string;
  value: string;
  description: string;
  isSecret: boolean;
  id?: number;
  createdAt?: string;
  updatedAt?: string;
}

// التحقق من أن المستخدم مسؤول
function isAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.isAuthenticated() && req.user && (req.user as any).role === 'ADMIN') {
    return next();
  }
  
  res.status(403).json({ message: 'غير مسموح. هذه العملية تتطلب صلاحيات المشرف.' });
}

// أولاً: المسارات الخاصة بالكل (بما فيها المفاتيح الافتراضية والعامة)

// اختبار سريع للتأكد من أن الخدمة تعمل
apiKeysRouter.get('/check', async (req, res) => {
  console.log('تم استدعاء نقطة نهاية التحقق من الخدمة');
  res.json({ status: 'ok', message: 'خدمة مفاتيح API تعمل بشكل صحيح' });
});

// اختبار مباشر للمفاتيح (أبسط من نقطة النهاية الرئيسية)
apiKeysRouter.get('/quicktest/:keyname', async (req, res) => {
  const keyName = req.params.keyname;
  console.log(`اختبار سريع للمفتاح: ${keyName}`);
  
  try {
    // تحديد URL الاختبار بناءً على نوع المفتاح
    let testUrl = '';
    let params = {};
    let headers = {};
    
    // الحصول على قيمة المفتاح
    const keyData = await storage.getConfigKey(keyName);
    if (!keyData) {
      console.log(`المفتاح ${keyName} غير موجود`);
      return res.json({ 
        success: false, 
        message: `المفتاح ${keyName} غير موجود في النظام`,
        key: keyName
      });
    }
    
    console.log(`تم العثور على المفتاح: ${keyName}`);
    
    switch(keyName) {
      case 'TWELVEDATA_API_KEY':
        testUrl = 'https://api.twelvedata.com/price';
        params = { symbol: 'EUR/USD', apikey: keyData.value };
        break;
      case 'PRIMARY_API_KEY':
        testUrl = 'https://www.alphavantage.co/query';
        params = { function: 'GLOBAL_QUOTE', symbol: 'IBM', apikey: keyData.value };
        break;
      case 'BINANCE_API_KEY':
        testUrl = 'https://api.binance.com/api/v3/ticker/price';
        params = { symbol: 'BTCUSDT' };
        headers = { 'X-MBX-APIKEY': keyData.value };
        break;
      default:
        // اختبار نظري فقط للمفاتيح الأخرى
        return res.json({
          success: true,
          message: `تم العثور على المفتاح: ${keyName} (المفتاح لا يحتاج لاختبار مباشر)`,
          key: keyName,
          value: `${keyData.value.substring(0, 4)}...`,
          testStatus: 'not_applicable'
        });
    }
    
    // تنفيذ طلب الاختبار
    console.log(`جاري إرسال طلب اختبار إلى: ${testUrl}`);
    const response = await axios.get(testUrl, { params, headers, timeout: 5000 });
    console.log(`Response received from ${testUrl}`);
    
    return res.json({
      success: true,
      message: `Key ${keyName} tested successfully`,
      key: keyName,
      value: `${keyData.value.substring(0, 4)}...`,
      response: response.status
    });
  } catch (error: any) {
    console.error(`Error testing key ${keyName}:`, error);
    return res.json({
      success: false,
      message: `Failed to test key ${keyName}: ${error.message}`,
      key: keyName
    });
  }
});

// مسار لاسترجاع المفاتيح العامة دون الحاجة للمصادقة - للاستخدام في واجهة المستخدم
apiKeysRouter.get('/defaults', async (req, res) => {
  try {
    // قائمة المفاتيح الافتراضية المسموح بعرضها للجميع
    const defaultKeys = [
      {
        key: 'MARKET_API_KEY',
        value: '6KCF...bf75',
        description: 'Primary API Key',
        isSecret: true
      },
      {
        key: 'PRIMARY_API_KEY',
        value: 'CWMH...N26B',
        description: 'Primary Alpha Vantage API Key',
        isSecret: true
      },
      {
        key: 'TWELVEDATA_API_KEY',
        value: '820e...d496',
        description: 'مفتاح TwelveData API',
        isSecret: true
      },
      {
        key: 'BINANCE_API_KEY',
        value: 'GteP...eb62',
        description: 'مفتاح منصة Binance',
        isSecret: true
      },
      {
        key: 'BINANCE_SECRET_KEY',
        value: '0cRz...5noe',
        description: 'مفتاح سري منصة Binance',
        isSecret: true
      },
      {
        key: 'BACKUP_API_KEYS',
        value: 'CWMH...OOQA',
        description: 'مفاتيح API الاحتياطية',
        isSecret: true
      }
    ];
    
    res.json(defaultKeys);
  } catch (error) {
    console.error('خطأ في استرجاع المفاتيح الافتراضية:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء استرجاع المفاتيح الافتراضية' });
  }
});

// مسار لاسترجاع المفاتيح العامة دون الحاجة لصلاحيات المشرف
apiKeysRouter.get('/all', async (req, res) => {
  try {
    // استرجاع المفاتيح من قاعدة البيانات إذا أمكن
    let keys: ConfigKey[] = [];
    try {
      keys = await storage.getAllConfigKeys();
    } catch (dbError) {
      console.error('خطأ في استرجاع المفاتيح من قاعدة البيانات:', dbError);
    }
    
    // إذا لم تكن هناك مفاتيح في قاعدة البيانات، استخدم القيم الافتراضية من ملف .env
    if (keys.length === 0) {
      // إنشاء المفاتيح الافتراضية مع إضافة معرف وهمي
      const defaultKeys: ApiKeyPlaceholder[] = [
        {
          id: 1,
          key: 'MARKET_API_KEY',
          value: process.env.MARKET_API_KEY || '6KCFn5wGm4Litnw1akWUDICnZQjdli5LZ68B70TJ54edbf75',
          description: 'مفتاح API الرئيسي',
          isSecret: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 2,
          key: 'PRIMARY_API_KEY',
          value: process.env.PRIMARY_API_KEY || 'CWMHAEQ94V4ON26B',
          description: 'مفتاح Alpha Vantage API الرئيسي',
          isSecret: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 3,
          key: 'TWELVEDATA_API_KEY',
          value: process.env.TWELVEDATA_API_KEY || '820e25efeb6e445183486276ba98d496',
          description: 'مفتاح TwelveData API',
          isSecret: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 4,
          key: 'BINANCE_API_KEY',
          value: process.env.BINANCE_API_KEY || 'GtePZkeqyJEylXk7JFQUZfjV9YWel44kEcnRy4KltHUQgL9MqJtVzi4xNlbqeb62',
          description: 'مفتاح منصة Binance',
          isSecret: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 5,
          key: 'BINANCE_SECRET_KEY',
          value: process.env.BINANCE_SECRET_KEY || '0cRzirxgsOXy1QtvTYYdZYS5oNmF2q5zzjUiDYnam8wEXNaDoHnDfxIOf5wy5noe',
          description: 'مفتاح سري منصة Binance',
          isSecret: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 6,
          key: 'BACKUP_API_KEYS',
          value: process.env.BACKUP_API_KEYS || 'CWMHAEQ94V4ON26B,PXI11JF8693EGC2R,ZJQ9ZTAM618ZOOQA',
          description: 'مفاتيح API الاحتياطية',
          isSecret: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      // تحويل المفاتيح الافتراضية إلى نوع ConfigKey
      keys = defaultKeys as unknown as ConfigKey[];
    }
    
    // إخفاء جزء من قيمة المفاتيح للعرض
    const safeKeys = keys.map(key => {
      if (key.isSecret) {
        const value = key.value;
        const maskedValue = value.length > 8 
          ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
          : '****';
        
        return {
          ...key,
          value: maskedValue
        };
      }
      return key;
    });
    
    res.json(safeKeys);
  } catch (error) {
    console.error('خطأ في استرجاع المفاتيح:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء استرجاع مفاتيح API' });
  }
});

// اختبار مفتاح API (مفتوح للجميع)
apiKeysRouter.get('/test/:key', async (req, res) => {
  try {
    console.log(`بدء اختبار المفتاح: ${req.params.key} للمستخدم: ${req.user ? 'مسجل الدخول' : 'غير مسجل الدخول'}`);
    
    // استخراج اسم المفتاح من المسار
    const keyName = req.params.key;
    
    // تسجيل عملية البدء في اختبار المفتاح
    console.log(`بدء اختبار المفتاح: ${keyName}`);
    
    // الحصول على بيانات المفتاح
    const keyData = await storage.getConfigKey(keyName);
    
    if (!keyData) {
      console.log(`المفتاح ${keyName} غير موجود في قاعدة البيانات`);
      return res.status(404).json({ message: `المفتاح ${keyName} غير موجود` });
    }
    
    console.log(`تم العثور على المفتاح ${keyName} في قاعدة البيانات، جاري اختباره...`);
    
    // اختبار المفتاح مع الخدمة المناسبة
    let success = false;
    let message = '';
    
    try {
      switch(keyName) {
        case 'TWELVEDATA_API_KEY':
          // اختبار مع TwelveData
          console.log(`اختبار مفتاح TwelveData: ${keyData.value.substring(0, 4)}...`);
          
          const twelveDataResponse = await axios.get('https://api.twelvedata.com/time_series', {
            params: {
              symbol: 'EUR/USD',
              interval: '1min',
              outputsize: 1,
              apikey: keyData.value
            },
            timeout: 8000 // زيادة مهلة الاتصال
          });
          
          console.log('استجابة TwelveData:', JSON.stringify(twelveDataResponse.data));
          
          if (twelveDataResponse.data && !twelveDataResponse.data.code) {
            success = true;
            message = `تم التحقق من مفتاح TwelveData بنجاح`;
          } else {
            success = false;
            message = twelveDataResponse.data.message || 'مفتاح TwelveData غير صالح';
          }
          break;
          
        case 'PRIMARY_API_KEY':
          // اختبار مع Alpha Vantage
          console.log(`اختبار مفتاح Alpha Vantage: ${keyData.value.substring(0, 4)}...`);
          
          const alphaVantageResponse = await axios.get('https://www.alphavantage.co/query', {
            params: {
              function: 'GLOBAL_QUOTE',  // استخدام Global Quote بدلاً من البيانات الدقيقة
              symbol: 'IBM',
              apikey: keyData.value
            },
            timeout: 8000 // زيادة مهلة الاتصال
          });
          
          console.log('استجابة Alpha Vantage:', JSON.stringify(alphaVantageResponse.data));
          
          if (alphaVantageResponse.data && !alphaVantageResponse.data['Error Message']) {
            success = true;
            message = `تم التحقق من مفتاح Alpha Vantage بنجاح`;
          } else {
            success = false;
            message = alphaVantageResponse.data['Error Message'] || 'مفتاح Alpha Vantage غير صالح';
          }
          break;
          
        case 'BINANCE_API_KEY':
          // اختبار مع Binance (قراءة فقط، لا حاجة للمفتاح السري)
          console.log(`اختبار مفتاح Binance: ${keyData.value.substring(0, 4)}...`);
          
          const binanceResponse = await axios.get('https://api.binance.com/api/v3/ticker/price', {
            params: { symbol: 'BTCUSDT' },
            headers: {
              'X-MBX-APIKEY': keyData.value
            },
            timeout: 8000 // زيادة مهلة الاتصال
          });
          
          console.log('استجابة Binance:', JSON.stringify(binanceResponse.data));
          
          if (binanceResponse.data && binanceResponse.data.symbol) {
            success = true;
            message = `تم التحقق من مفتاح Binance بنجاح`;
          } else {
            success = false;
            message = 'مفتاح Binance غير صالح';
          }
          break;
          
        default:
          // مفاتيح أخرى
          console.log(`تم إجراء اختبار نظري للمفتاح ${keyName}`);
          success = true;
          message = `تم التحقق من وجود المفتاح ${keyName} (اختبار نظري)`;
      }
    } catch (testError: any) {
      console.error(`فشل اختبار المفتاح ${keyName}:`, testError);
      success = false;
      // تحسين رسالة الخطأ لتكون أكثر تفصيلاً وفائدة
      let errorDetails = testError.message || 'خطأ غير معروف';
      
      // إضافة تفاصيل إضافية إذا كان الخطأ من الاستجابة
      if (testError.response) {
        errorDetails += ` (رمز الحالة: ${testError.response.status})`;
        console.log('بيانات استجابة الخطأ:', JSON.stringify(testError.response.data));
      }
      
      message = `فشل اختبار المفتاح: ${errorDetails}`;
    }
    
    // إخفاء قيمة المفتاح للأمان
    const maskedValue = keyData.value.length > 8 
      ? `${keyData.value.substring(0, 4)}...${keyData.value.substring(keyData.value.length - 4)}`
      : '****';
    
    console.log(`اكتمل اختبار المفتاح ${keyName}، النتيجة: ${success ? 'ناجح' : 'فاشل'}`);
    
    // إرسال النتائج
    res.json({ 
      success, 
      message, 
      key: keyName,
      maskedValue,
      source: 'database'
    });
  } catch (error: any) {
    console.error(`خطأ في اختبار المفتاح ${req.params.key}:`, error);
    res.status(500).json({ 
      success: false,
      message: `حدث خطأ أثناء اختبار مفتاح API: ${error.message || 'خطأ غير معروف'}`
    });
  }
});

// ثانياً: المسارات الخاصة بالمشرفين فقط

// الحصول على جميع مفاتيح API (للمشرفين فقط)
apiKeysRouter.get('/', isAdmin, async (req, res) => {
  try {
    const keys = await storage.getAllConfigKeys();
    
    // حماية المفاتيح السرية بإخفاء جزء من قيمتها
    const safeKeys = keys.map(key => {
      if (key.isSecret) {
        // إظهار الجزء الأول والأخير فقط من المفتاح السري
        const value = key.value;
        const maskedValue = value.length > 8 
          ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
          : '****';
        
        return {
          ...key,
          value: maskedValue,
          fullValue: undefined
        };
      }
      return key;
    });
    
    res.json(safeKeys);
  } catch (error: any) {
    console.error('خطأ في استرجاع مفاتيح API:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء استرجاع مفاتيح API' });
  }
});

// إنشاء أو تحديث مفتاح API (للمشرفين فقط)
apiKeysRouter.post('/', isAdmin, async (req, res) => {
  try {
    const { key, value, description, isSecret = true } = req.body;
    
    if (!key || !value) {
      return res.status(400).json({ message: 'المفتاح والقيمة مطلوبان' });
    }
    
    const configKey = await storage.setConfigKey(key, value, description, isSecret);
    
    // لا تعرض قيمة المفتاح في الاستجابة إذا كان سرياً
    if (configKey.isSecret) {
      configKey.value = '****';
    }
    
    res.status(201).json(configKey);
  } catch (error: any) {
    console.error('خطأ في إنشاء/تحديث مفتاح API:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء إنشاء/تحديث مفتاح API' });
  }
});

// حذف مفتاح API (للمشرفين فقط)
apiKeysRouter.delete('/:key', isAdmin, async (req, res) => {
  try {
    const keyName = req.params.key;
    
    // التحقق من وجود المفتاح أولاً
    const keyExists = await storage.getConfigKey(keyName);
    
    if (!keyExists) {
      return res.status(404).json({ message: `المفتاح ${keyName} غير موجود` });
    }
    
    await storage.deleteConfigKey(keyName);
    
    res.status(200).json({ message: `تم حذف المفتاح ${keyName} بنجاح` });
  } catch (error: any) {
    console.error(`خطأ في حذف المفتاح ${req.params.key}:`, error);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف مفتاح API' });
  }
});

// الحصول على مفتاح API محدد (للمشرفين فقط)
// ملاحظة: يجب أن يكون هذا المسار آخر مسار لأنه يتعامل مع المعلمة المتغيرة :key
apiKeysRouter.get('/:key', isAdmin, async (req, res) => {
  try {
    const keyName = req.params.key;
    const keyData = await storage.getConfigKey(keyName);
    
    if (!keyData) {
      return res.status(404).json({ message: `المفتاح ${keyName} غير موجود` });
    }
    
    // لا تعرض القيمة الكاملة للمفتاح السري في الاستجابة
    if (keyData.isSecret) {
      const maskedValue = keyData.value.length > 8
        ? `${keyData.value.substring(0, 4)}...${keyData.value.substring(keyData.value.length - 4)}`
        : '****';
      
      keyData.value = maskedValue;
    }
    
    res.json(keyData);
  } catch (error: any) {
    console.error(`خطأ في استرجاع المفتاح ${req.params.key}:`, error);
    res.status(500).json({ message: 'حدث خطأ أثناء استرجاع مفتاح API' });
  }
});