import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// ⚠️ SECURITY WARNING - تحذير أمني ⚠️
// هذه القيم هي قيم افتراضية آمنة للتطوير المحلي فقط
// لا تستخدم مفاتيح API حقيقية في الكود المصدري أبداً
// في الإنتاج، يجب تعيين المفاتيح الحقيقية في متغيرات البيئة
// WARNING: These are safe default values for local development only
// Never use real API keys in source code!
// In production, set real keys in environment variables

// قيم افتراضية آمنة لقاعدة بيانات SQLite المحلية
const DEFAULT_DATABASE_URL = 'file:./data/database.sqlite';
const DEFAULT_PGDATABASE = 'local';
const DEFAULT_PGHOST = 'localhost';
const DEFAULT_PGPORT = '0';
const DEFAULT_PGUSER = 'local';
const DEFAULT_PGPASSWORD = 'local';

// ⚠️ استخدام مولد عشوائي آمن لمفتاح الجلسة بدلاً من القيمة الثابتة
// Generate random session secret instead of hardcoded value
const DEFAULT_SESSION_SECRET = generateRandomSecret(64);

// ⚠️ قيم وهمية آمنة لمفاتيح API - يجب استبدالها بالمفاتيح الحقيقية في الإنتاج
// Safe dummy values for API keys - replace with real keys in production
const DEFAULT_MARKET_API_KEY = 'YOUR_MARKET_API_KEY_HERE';
const DEFAULT_BACKUP_API_KEYS = 'YOUR_BACKUP_API_KEY_1,YOUR_BACKUP_API_KEY_2,YOUR_BACKUP_API_KEY_3';
const DEFAULT_PRIMARY_API_KEY = 'YOUR_ALPHA_VANTAGE_API_KEY_HERE';
const DEFAULT_TWELVEDATA_API_KEY = 'YOUR_TWELVEDATA_API_KEY_HERE';
const DEFAULT_BINANCE_API_KEY = 'YOUR_BINANCE_API_KEY_HERE';
const DEFAULT_BINANCE_SECRET_KEY = 'YOUR_BINANCE_SECRET_KEY_HERE';

// تعريف هيكل المتغيرات البيئية
interface EnvStructure {
  name: string;
  value: string;
  comment?: string;
  isSecret?: boolean;
}

// تحديد جميع المتغيرات البيئية التي يحتاجها المشروع
const requiredEnvVars: EnvStructure[] = [
  { name: 'MARKET_API_KEY', value: DEFAULT_MARKET_API_KEY, comment: 'مفتاح API الرئيسي', isSecret: true },
  { name: 'BACKUP_API_KEYS', value: DEFAULT_BACKUP_API_KEYS, comment: 'مفاتيح API الاحتياطية (مفصولة بفواصل)', isSecret: true },
  { name: 'PRIMARY_API_KEY', value: DEFAULT_PRIMARY_API_KEY, comment: 'مفتاح Alpha Vantage API', isSecret: true },
  { name: 'TWELVEDATA_API_KEY', value: DEFAULT_TWELVEDATA_API_KEY, comment: 'مفتاح TwelveData API', isSecret: true },
  { name: 'BINANCE_API_KEY', value: DEFAULT_BINANCE_API_KEY, comment: 'مفتاح منصة Binance', isSecret: true },
  { name: 'BINANCE_SECRET_KEY', value: DEFAULT_BINANCE_SECRET_KEY, comment: 'مفتاح سري منصة Binance', isSecret: true },
  { name: 'DATABASE_URL', value: DEFAULT_DATABASE_URL, comment: 'متغيرات قاعدة البيانات SQLite المحلية', isSecret: true },
  { name: 'PGDATABASE', value: DEFAULT_PGDATABASE, isSecret: false },
  { name: 'PGHOST', value: DEFAULT_PGHOST, isSecret: false },
  { name: 'PGPORT', value: DEFAULT_PGPORT, isSecret: false },
  { name: 'PGUSER', value: DEFAULT_PGUSER, isSecret: false },
  { name: 'PGPASSWORD', value: DEFAULT_PGPASSWORD, isSecret: true },
  { name: 'SESSION_SECRET', value: DEFAULT_SESSION_SECRET, comment: 'مفتاح الجلسة', isSecret: true },
  { name: 'PORT', value: '3000', comment: 'إعدادات الخادم', isSecret: false },
  { name: 'NODE_ENV', value: 'development', isSecret: false },
];

// دالة مساعدة لإنشاء مفتاح آمن عشوائي
function generateRandomSecret(length: number = 64): string {
  return crypto.randomBytes(length).toString('hex');
}

// آلية إنشاء ملف .env إذا لم يكن موجوداً
const envPath = path.resolve(process.cwd(), '.env');

// التحقق مما إذا كان ملف .env موجوداً بالفعل
if (fs.existsSync(envPath)) {
  console.log('تم العثور على ملف .env، جاري تحميله...');
  dotenv.config({ path: envPath });
} else {
  console.log('ملف .env غير موجود، جاري إنشاؤه...');
  
  try {
    // بناء محتوى ملف .env
    let envContent = '';
    
    requiredEnvVars.forEach((envVar, index) => {
      // إضافة تعليق إذا كان متوفراً
      if (envVar.comment) {
        if (index > 0) envContent += '\n'; // إضافة سطر فارغ بين المجموعات
        envContent += `# ${envVar.comment}\n`;
      }
      
      // استخدام القيمة من البيئة الحالية إذا كانت موجودة، وإلا استخدم القيمة الافتراضية
      const value = process.env[envVar.name] || envVar.value;
      envContent += `${envVar.name}=${value}\n`;
    });
    
    // كتابة الملف
    fs.writeFileSync(envPath, envContent, { encoding: 'utf8' });
    console.log('تم إنشاء ملف .env بنجاح!');
    
    // إعادة تحميل المتغيرات البيئية من الملف الجديد
    dotenv.config({ path: envPath });
    console.log('تم تحميل المتغيرات البيئية من الملف الجديد');
  } catch (error) {
    console.error('حدث خطأ أثناء إنشاء ملف .env:', error);
    console.log('سيتم استخدام القيم الافتراضية للمتغيرات البيئية');
  }
}

// تعريف الواجهة للمتغيرات البيئية
interface EnvVars {
  DATABASE_URL: string;
  PGDATABASE: string;
  PGHOST: string;
  PGPORT: string;
  PGUSER: string;
  PGPASSWORD: string;
  SESSION_SECRET: string;
  PORT: number;
  NODE_ENV: string;
  // إضافة مفاتيح API
  MARKET_API_KEY: string;
  BACKUP_API_KEYS: string;
  PRIMARY_API_KEY: string;
  TWELVEDATA_API_KEY: string;
  BINANCE_API_KEY: string;
  BINANCE_SECRET_KEY: string;
}

// إنشاء كائن للمتغيرات البيئية مع التحقق من وجودها
const env: EnvVars = {
  // إذا كان DATABASE_URL غير محدد، قم ببنائه من المتغيرات الفردية
  get DATABASE_URL(): string {
    // الخيار الأول: استخدام DATABASE_URL من المتغيرات البيئية
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }
    
    // للاستخدام مع SQLite، استخدام قيمة افتراضية تشير إلى ملف قاعدة البيانات المحلية
    console.log('استخدام قاعدة بيانات SQLite المحلية');
    return DEFAULT_DATABASE_URL;
  },

  // استرجاع قيم قاعدة البيانات الفردية مع التحقق من وجودها
  get PGDATABASE(): string {
    return process.env.PGDATABASE || DEFAULT_PGDATABASE;
  },

  get PGHOST(): string {
    return process.env.PGHOST || DEFAULT_PGHOST;
  },

  get PGPORT(): string {
    return process.env.PGPORT || DEFAULT_PGPORT;
  },

  get PGUSER(): string {
    return process.env.PGUSER || DEFAULT_PGUSER;
  },

  get PGPASSWORD(): string {
    return process.env.PGPASSWORD || DEFAULT_PGPASSWORD;
  },

  get SESSION_SECRET(): string {
    return process.env.SESSION_SECRET || DEFAULT_SESSION_SECRET;
  },

  get PORT(): number {
    return parseInt(process.env.PORT || '5000', 10);
  },

  get NODE_ENV(): string {
    return process.env.NODE_ENV || 'development';
  },

  get MARKET_API_KEY(): string {
    return process.env.MARKET_API_KEY || DEFAULT_MARKET_API_KEY;
  },

  get BACKUP_API_KEYS(): string {
    return process.env.BACKUP_API_KEYS || DEFAULT_BACKUP_API_KEYS;
  },

  get PRIMARY_API_KEY(): string {
    return process.env.PRIMARY_API_KEY || DEFAULT_PRIMARY_API_KEY;
  },

  get TWELVEDATA_API_KEY(): string {
    return process.env.TWELVEDATA_API_KEY || DEFAULT_TWELVEDATA_API_KEY;
  },

  get BINANCE_API_KEY(): string {
    return process.env.BINANCE_API_KEY || DEFAULT_BINANCE_API_KEY;
  },

  get BINANCE_SECRET_KEY(): string {
    return process.env.BINANCE_SECRET_KEY || DEFAULT_BINANCE_SECRET_KEY;
  }
};

// وظائف مساعدة لاستخراج أجزاء من DATABASE_URL (للاستخدام في حالة PostgreSQL فقط)
// ملاحظة: نستخدم SQLite حاليًا، لكن نحتفظ بهذه الوظائف لاستخدامات مستقبلية
function extractDbName(url: string): string {
  // file:./path/to/database.sqlite أو postgresql://user:password@host:port/dbname
  if (url.startsWith('file:')) {
    return 'sqlite';
  }
  const dbName = url.split('/').pop()?.split('?')[0];
  return dbName || 'local';
}

function extractHost(url: string): string {
  // file:./path/to/database.sqlite أو postgresql://user:password@host:port/dbname
  if (url.startsWith('file:')) {
    return 'localhost';
  }
  const hostWithPort = url.split('@')[1]?.split('/')[0];
  const host = hostWithPort?.split(':')[0];
  return host || 'localhost';
}

function extractPort(url: string): string {
  // file:./path/to/database.sqlite أو postgresql://user:password@host:port/dbname
  if (url.startsWith('file:')) {
    return '0';
  }
  const hostWithPort = url.split('@')[1]?.split('/')[0];
  const port = hostWithPort?.split(':')[1];
  return port || '5432';
}

function extractUser(url: string): string {
  // file:./path/to/database.sqlite أو postgresql://user:password@host:port/dbname
  if (url.startsWith('file:')) {
    return 'local';
  }
  const userWithPassword = url.split('://')[1]?.split('@')[0];
  const user = userWithPassword?.split(':')[0];
  return user || 'local';
}

function extractPassword(url: string): string {
  // file:./path/to/database.sqlite أو postgresql://user:password@host:port/dbname
  if (url.startsWith('file:')) {
    return 'local';
  }
  const userWithPassword = url.split('://')[1]?.split('@')[0];
  const password = userWithPassword?.split(':')[1];
  return password || 'local';
}

// التحقق من وجود متغيرات البيئة الأساسية وإظهار رسائل تحذير إذا كانت غائبة
function validateEnv() {
  console.log('🔒 التحقق من الأمان والمتغيرات البيئية...');
  
  if (!process.env.DATABASE_URL) {
    console.log('📊 استخدام قاعدة بيانات SQLite المحلية، لا حاجة لمتغيرات قاعدة بيانات خارجية.');
  }

  if (!process.env.SESSION_SECRET) {
    console.warn('⚠️ لم يتم تحديد SESSION_SECRET. سيتم استخدام مفتاح عشوائي مولد تلقائياً.');
    console.warn('🔐 للإنتاج: يرجى تعيين SESSION_SECRET في متغيرات البيئة');
  }

  // التحقق من مفاتيح API مع تحذيرات أمنية
  const apiKeys = ['PRIMARY_API_KEY', 'TWELVEDATA_API_KEY', 'BINANCE_API_KEY', 'BINANCE_SECRET_KEY', 'MARKET_API_KEY'];
  
  apiKeys.forEach(key => {
    if (!process.env[key]) {
      console.warn(`⚠️ ${key} غير محدد. سيتم استخدام القيمة الوهمية للتطوير المحلي.`);
      console.warn(`🔑 للإنتاج: يرجى تعيين ${key} في متغيرات البيئة`);
    } else if (process.env[key]?.startsWith('YOUR_')) {
      console.error(`❌ ${key} يحتوي على قيمة وهمية! يجب استبدالها بمفتاح حقيقي في الإنتاج.`);
    } else {
      console.log(`✅ ${key} تم تحديده بنجاح`);
    }
  });
  
  // تحذير عام للأمان
  if (process.env.NODE_ENV === 'production') {
    console.log('🚨 تحذير الإنتاج: تأكد من تعيين جميع مفاتيح API الحقيقية في متغيرات البيئة');
  } else {
    console.log('🛠️ وضع التطوير: يمكن استخدام القيم الافتراضية للاختبار المحلي');
  }
}

// التحقق من المتغيرات البيئية عند بدء التشغيل
validateEnv();

// دالة لتهيئة مفاتيح التكوين في قاعدة البيانات
// سيتم استدعاء هذه الدالة من ملف index.ts عند بدء التشغيل
export async function initConfigKeys(storage: any) {
  if (!storage || typeof storage.setConfigKey !== 'function') {
    console.error('خطأ: واجهة التخزين غير متوفرة أو غير صالحة');
    return;
  }
  
  console.log('جاري تهيئة مفاتيح التكوين في قاعدة البيانات...');
  
  try {
    // حفظ جميع المفاتيح المطلوبة في قاعدة البيانات
    for (const envVar of requiredEnvVars) {
      if (envVar.name.startsWith('MARKET_') || 
          envVar.name.startsWith('PRIMARY_') || 
          envVar.name.startsWith('BACKUP_') || 
          envVar.name.startsWith('TWELVEDATA_') || 
          envVar.name.startsWith('BINANCE_')) {
        
        // استرجاع قيمة المفتاح المحتملة من قاعدة البيانات
        const existingKey = await storage.getConfigKey(envVar.name);
        
        // الحصول على القيمة من متغيرات البيئة
        const envValue = process.env[envVar.name] || envVar.value;
        
        if (existingKey) {
          // تحديث القيمة فقط إذا تغيرت
          if (existingKey.value !== envValue) {
            console.log(`تحديث مفتاح التكوين: ${envVar.name}`);
            await storage.setConfigKey(
              envVar.name,
              envValue,
              envVar.comment,
              envVar.isSecret || false
            );
          }
        } else {
          // إنشاء مفتاح جديد
          console.log(`إنشاء مفتاح تكوين جديد: ${envVar.name}`);
          await storage.setConfigKey(
            envVar.name,
            envValue,
            envVar.comment,
            envVar.isSecret || false
          );
        }
      }
    }
    
    console.log('✅ تم تهيئة جميع مفاتيح التكوين في قاعدة البيانات بنجاح');
  } catch (error) {
    console.error('❌ حدث خطأ أثناء تهيئة مفاتيح التكوين في قاعدة البيانات:', error);
  }
}

// دالة للحصول على مفتاح من قاعدة البيانات إذا كانت متاحة
export async function getKeyFromDatabase(storage: any, keyName: string): Promise<string | null> {
  if (!storage || typeof storage.getConfigKey !== 'function') {
    return null;
  }
  
  try {
    const keyData = await storage.getConfigKey(keyName);
    if (keyData && keyData.value) {
      return keyData.value;
    }
  } catch (error) {
    console.error(`خطأ في استرجاع المفتاح ${keyName} من قاعدة البيانات:`, error);
  }
  
  return null;
}

export default env;