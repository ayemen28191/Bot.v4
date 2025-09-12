import axios, { AxiosError } from 'axios';
import env, { getKeyFromDatabase } from '../env';
import { storage } from '../storage';

// تكوين المصادر
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const TWELVEDATA_BASE_URL = 'https://api.twelvedata.com';
const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';

// واجهة لنتيجة السعر
interface PriceResult {
  price: number | null;
  error?: string;
  source?: string;
}

// دالة مساعدة لتنسيق رمز العملة لـ Binance
function formatSymbolForBinance(symbol: string): string {
  // إزالة '/' وتحويل إلى التنسيق المناسب لـ Binance
  return symbol.replace('/', '');
}

// تنظيم مجموعات المفاتيح البديلة
interface ApiKeyGroup {
  baseName: string;         // اسم المفتاح الأساسي
  alternativeKeys: string[]; // أسماء المفاتيح البديلة
  lastUsedIndex: number;    // مؤشر آخر مفتاح تم استخدامه
}

// مجموعات مفاتيح API المتاحة
const API_KEY_GROUPS: ApiKeyGroup[] = [
  {
    baseName: 'TWELVEDATA_API_KEY',
    alternativeKeys: ['TWELVEDATA_API_KEY_1', 'TWELVEDATA_API_KEY_2', 'TWELVEDATA_API_KEY_3'],
    lastUsedIndex: -1
  },
  {
    baseName: 'PRIMARY_API_KEY',
    alternativeKeys: ['ALPHAVANTAGE_API_KEY_1', 'ALPHAVANTAGE_API_KEY_2', 'ALPHAVANTAGE_API_KEY_3'],
    lastUsedIndex: -1
  },
  {
    baseName: 'MARKET_API_KEY',
    alternativeKeys: ['FINNHUB_API_KEY', 'MARKETSTACK_API_KEY', 'POLYGON_API_KEY', 'TIINGO_API_KEY'],
    lastUsedIndex: -1
  }
];

// متابعة المفاتيح التي فشلت لتجنبها
const failedKeys = new Set<string>();

// دالة مساعدة للحصول على مفتاح API مع دعم التناوب
async function getApiKey(keyName: string, fallbackValue: string): Promise<string> {
  // البحث عن مجموعة المفاتيح المناسبة
  const keyGroup = API_KEY_GROUPS.find(group => 
    group.baseName === keyName || group.alternativeKeys.includes(keyName)
  );
  
  // إذا لم يتم العثور على مجموعة، استخدم الطريقة القديمة
  if (!keyGroup) {
    try {
      // محاولة الحصول على المفتاح من قاعدة البيانات أولاً
      const dbKey = await getKeyFromDatabase(storage, keyName);
      if (dbKey) {
        console.log(`تم استخدام المفتاح ${keyName} من قاعدة البيانات`);
        return dbKey;
      }
    } catch (error) {
      console.warn(`فشل في استرداد المفتاح ${keyName} من قاعدة البيانات:`, error);
    }
    
    // العودة إلى استخدام المتغيرات البيئية
    console.log(`تم استخدام المفتاح ${keyName} من متغيرات البيئة`);
    return fallbackValue;
  }
  
  // قائمة المفاتيح المحتملة لمحاولة استخدامها
  const allKeys = [keyGroup.baseName, ...keyGroup.alternativeKeys];
  
  // تحديد نقطة البداية في التناوب (المفتاح التالي في الدورة)
  keyGroup.lastUsedIndex = (keyGroup.lastUsedIndex + 1) % allKeys.length;
  const startIndex = keyGroup.lastUsedIndex;
  
  // محاولة الحصول على مفتاح صالح في دورة كاملة
  for (let i = 0; i < allKeys.length; i++) {
    const currentIndex = (startIndex + i) % allKeys.length;
    const currentKeyName = allKeys[currentIndex];
    
    // تخطي المفاتيح التي سبق أن فشلت
    if (failedKeys.has(currentKeyName)) {
      continue;
    }
    
    try {
      // محاولة الحصول على المفتاح من قاعدة البيانات أولاً
      const dbKey = await getKeyFromDatabase(storage, currentKeyName);
      if (dbKey) {
        console.log(`تم استخدام المفتاح ${currentKeyName} من قاعدة البيانات (تناوب)`);
        keyGroup.lastUsedIndex = currentIndex; // تحديث المؤشر
        return dbKey;
      }
    } catch (error) {
      console.warn(`فشل في استرداد المفتاح ${currentKeyName} من قاعدة البيانات:`, error);
    }
    
    // محاولة الحصول على المفتاح من متغيرات البيئة
    // الحصول على المفتاح اعتمادًا على اسمه
    const envKey = getEnvironmentKeyByName(currentKeyName);
    if (envKey && envKey.length > 5) {
      console.log(`تم استخدام المفتاح ${currentKeyName} من متغيرات البيئة (تناوب)`);
      keyGroup.lastUsedIndex = currentIndex; // تحديث المؤشر
      return envKey;
    }
  }
  
  // إذا فشلت جميع المحاولات، عد إلى المفتاح الأصلي
  console.log(`فشلت كل المفاتيح البديلة، العودة إلى المفتاح الأصلي ${keyName}`);
  return fallbackValue;
}

// دالة مساعدة للحصول على قيمة مفتاح معين من متغيرات البيئة
function getEnvironmentKeyByName(keyName: string): string {
  switch (keyName) {
    case 'TWELVEDATA_API_KEY': return env.TWELVEDATA_API_KEY;
    case 'TWELVEDATA_API_KEY_1': return process.env.TWELVEDATA_API_KEY_1 || '';
    case 'TWELVEDATA_API_KEY_2': return process.env.TWELVEDATA_API_KEY_2 || '';
    case 'TWELVEDATA_API_KEY_3': return process.env.TWELVEDATA_API_KEY_3 || '';
    case 'PRIMARY_API_KEY': return env.PRIMARY_API_KEY;
    case 'ALPHAVANTAGE_API_KEY_1': return process.env.ALPHAVANTAGE_API_KEY_1 || '';
    case 'ALPHAVANTAGE_API_KEY_2': return process.env.ALPHAVANTAGE_API_KEY_2 || '';
    case 'ALPHAVANTAGE_API_KEY_3': return process.env.ALPHAVANTAGE_API_KEY_3 || '';
    case 'MARKET_API_KEY': return env.MARKET_API_KEY;
    case 'FINNHUB_API_KEY': return process.env.FINNHUB_API_KEY || '';
    case 'MARKETSTACK_API_KEY': return process.env.MARKETSTACK_API_KEY || '';
    case 'POLYGON_API_KEY': return process.env.POLYGON_API_KEY || '';
    case 'TIINGO_API_KEY': return process.env.TIINGO_API_KEY || '';
    case 'BINANCE_API_KEY': return env.BINANCE_API_KEY;
    case 'BINANCE_SECRET_KEY': return env.BINANCE_SECRET_KEY;
    default: return '';
  }
}

// دالة لإضافة مفتاح إلى قائمة المفاتيح الفاشلة
function markKeyAsFailed(keyName: string): void {
  failedKeys.add(keyName);
  console.warn(`تم تمييز المفتاح ${keyName} كفاشل وسيتم تجاهله في المحاولات القادمة`);
}

// دالة لجلب السعر من Binance
async function fetchFromBinance(symbol: string): Promise<PriceResult> {
  try {
    console.log('محاولة جلب السعر من Binance للرمز:', symbol);
    const formattedSymbol = formatSymbolForBinance(symbol);
    
    // استخدام مفتاح API من قاعدة البيانات أو المتغيرات البيئية
    const apiKey = await getApiKey('BINANCE_API_KEY', env.BINANCE_API_KEY);
    
    const response = await axios.get(`${BINANCE_BASE_URL}/ticker/price`, {
      params: { symbol: formattedSymbol },
      timeout: 5000,
      headers: {
        'X-MBX-APIKEY': apiKey
      }
    });

    console.log('استجابة Binance:', response.data);

    if (response.data && response.data.price) {
      return { 
        price: parseFloat(response.data.price),
        source: 'binance'
      };
    }

    return { 
      price: null, 
      error: 'بيانات غير صالحة من Binance',
      source: 'binance'
    };
  } catch (error) {
    console.error('خطأ في جلب السعر من Binance:', error);
    return { 
      price: null, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
      source: 'binance'
    };
  }
}

// دالة لجلب السعر من TwelveData
async function fetchFromTwelveData(symbol: string): Promise<PriceResult> {
  try {
    console.log('محاولة جلب السعر من TwelveData للرمز:', symbol);
    
    // استخدام مفتاح API من قاعدة البيانات أو المتغيرات البيئية مع دعم التناوب
    const apiKey = await getApiKey('TWELVEDATA_API_KEY', env.TWELVEDATA_API_KEY);
    // احتفظ بمعلومات المفتاح المستخدم للتعامل مع الأخطاء
    const usedKeyName = API_KEY_GROUPS[0].alternativeKeys[API_KEY_GROUPS[0].lastUsedIndex] || 'TWELVEDATA_API_KEY';

    const response = await axios.get('https://api.twelvedata.com/price', {
      params: {
        symbol,
        apikey: apiKey,
      },
      timeout: 5000
    });

    console.log('استجابة TwelveData:', response.data);

    // التحقق من نجاح الاستجابة
    if (response.data && response.data.price) {
      return { 
        price: parseFloat(response.data.price),
        source: 'twelvedata'
      };
    }

    // التحقق من تجاوز حد API
    if (response.data && response.data.code === 429) {
      // تمييز المفتاح الحالي كفاشل لتجنبه في المرة القادمة
      markKeyAsFailed(usedKeyName);
      
      return { 
        price: null, 
        error: `API credits exceeded: ${response.data.message}`,
        source: 'twelvedata'
      };
    }

    return { 
      price: null, 
      error: 'بيانات غير صالحة من TwelveData',
      source: 'twelvedata'
    };
  } catch (error) {
    console.error('خطأ في جلب السعر من TwelveData:', error);
    
    // تحديد المفتاح المستخدم للتعامل مع الأخطاء
    const usedKeyName = API_KEY_GROUPS[0].alternativeKeys[API_KEY_GROUPS[0].lastUsedIndex] || 'TWELVEDATA_API_KEY';
    
    // التحقق من وجود خطأ محدد
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      // التحقق من خطأ تجاوز حد API في حالة الخطأ
      if (axiosError.response.status === 429 ||
         (axiosError.response.data && 
          typeof axiosError.response.data === 'object' && 
          'code' in axiosError.response.data && 
          axiosError.response.data.code === 429)) {
        
        const errorData = axiosError.response.data as any;
        const errorMessage = errorData?.message || 'تم تجاوز حد API';
        
        // تمييز المفتاح الحالي كفاشل لتجنبه في المرة القادمة
        markKeyAsFailed(usedKeyName);
        
        return { 
          price: null, 
          error: `API credits exceeded: ${errorMessage}`,
          source: 'twelvedata'
        };
      }
      
      return { 
        price: null, 
        error: `خطأ من TwelveData: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`,
        source: 'twelvedata'
      };
    }
    
    return { 
      price: null, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
      source: 'twelvedata'
    };
  }
}

// دالة لجلب السعر من Alpha Vantage
async function fetchFromAlphaVantage(symbol: string): Promise<PriceResult> {
  try {
    console.log('محاولة جلب السعر من Alpha Vantage للرمز:', symbol);
    
    // استخدام مفتاح API من قاعدة البيانات أو المتغيرات البيئية مع دعم التناوب
    const apiKey = await getApiKey('PRIMARY_API_KEY', env.PRIMARY_API_KEY);
    // احتفظ بمعلومات المفتاح المستخدم للتعامل مع الأخطاء
    const usedKeyName = API_KEY_GROUPS[1].alternativeKeys[API_KEY_GROUPS[1].lastUsedIndex] || 'PRIMARY_API_KEY';
    
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol,
        apikey: apiKey,
      },
      timeout: 5000
    });

    // Alpha Vantage يرسل رسالة خطأ محددة عند تجاوز الحد اليومي
    if (response.data && response.data.Note && response.data.Note.includes('API call frequency')) {
      console.warn('تم تجاوز حد استخدام واجهة Alpha Vantage API');
      // تمييز المفتاح الحالي كفاشل لتجنبه في المرة القادمة
      markKeyAsFailed(usedKeyName);
      
      return { 
        price: null, 
        error: `API credits exceeded: ${response.data.Note}`,
        source: 'alphavantage'
      };
    }

    if (response.data['Global Quote'] && response.data['Global Quote']['05. price']) {
      return { 
        price: parseFloat(response.data['Global Quote']['05. price']),
        source: 'alphavantage'
      };
    }

    // إذا لم تكن هناك بيانات ولكن لا توجد أيضًا رسالة خطأ واضحة
    if (response.data && Object.keys(response.data).length === 0) {
      console.warn('لا توجد بيانات من Alpha Vantage - قد يكون تم تجاوز الحد اليومي');
      // تمييز المفتاح كفاشل احتياطيًا
      markKeyAsFailed(usedKeyName);
    }

    return { 
      price: null, 
      error: 'بيانات غير صالحة من Alpha Vantage',
      source: 'alphavantage'
    };
  } catch (error) {
    console.error('خطأ في جلب السعر من Alpha Vantage:', error);
    
    // تحديد المفتاح المستخدم للتعامل مع الأخطاء
    const usedKeyName = API_KEY_GROUPS[1].alternativeKeys[API_KEY_GROUPS[1].lastUsedIndex] || 'PRIMARY_API_KEY';
    
    // التحقق من وجود خطأ محدد
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      // Alpha Vantage يستخدم الرمز 429 عندما يتم تجاوز الحد
      if (axiosError.response.status === 429) {
        // تمييز المفتاح الحالي كفاشل لتجنبه في المرة القادمة
        markKeyAsFailed(usedKeyName);
        
        return { 
          price: null, 
          error: 'API credits exceeded: تم تجاوز الحد اليومي للطلبات على Alpha Vantage',
          source: 'alphavantage'
        };
      }
    }
    
    return { 
      price: null, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
      source: 'alphavantage'
    };
  }
}

// دالة مساعدة للمحاولات المتكررة
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`محاولة فاشلة ${i + 1}/${maxRetries}, انتظار ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// تحديد مصدر السعر المناسب حسب نوع العملة
function determinePriceSource(symbol: string): 'binance' | 'twelvedata' | 'alphavantage' {
  // للعملات المشفرة، استخدم Binance
  if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('USDT')) {
    return 'binance';
  }
  // للفوركس والأسهم، استخدم TwelveData
  else if (symbol.includes('/')) {
    return 'twelvedata';
  }
  // للأسهم، استخدم Alpha Vantage
  else {
    return 'alphavantage';
  }
}

// دالة لجلب السعر من المصادر المتاحة
export async function getCurrentPrice(symbol: string): Promise<PriceResult> {
  console.log('بدء جلب السعر للرمز:', symbol);

  const source = determinePriceSource(symbol);
  console.log('المصدر المختار:', source);
  
  // مصفوفة لتتبع المصادر التي تمت محاولة استخدامها
  const attemptedSources: string[] = [];

  try {
    let result: PriceResult;
    
    // الوظيفة المساعدة لإطلاق حدث تجاوز حد API
    const triggerApiLimitExceededEvent = (source: string) => {
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('enableOfflineMode', {
          detail: {
            reason: 'api_limit_exceeded',
            source: source
          }
        });
        window.dispatchEvent(event);
      } else {
        // إرسال الحدث إلى العميل باستخدام WebSocket إذا كان متاحًا
        console.error(`تم تجاوز حد API لمصدر ${source}`);
      }
    };

    // المحاولة الأولى مع المصدر الرئيسي
    switch (source) {
      case 'binance':
        result = await retryOperation(() => fetchFromBinance(symbol));
        attemptedSources.push('binance');
        break;
      case 'twelvedata':
        result = await retryOperation(() => fetchFromTwelveData(symbol));
        attemptedSources.push('twelvedata');
        break;
      case 'alphavantage':
        result = await retryOperation(() => fetchFromAlphaVantage(symbol));
        attemptedSources.push('alphavantage');
        break;
      default:
        throw new Error('مصدر غير معروف للسعر');
    }

    // التحقق من نجاح عملية جلب السعر
    if (result.price !== null) {
      console.log(`تم الحصول على السعر بنجاح من ${result.source}:`, result.price);
      return result;
    }
    
    // التحقق من خطأ حد API
    if (result.error && result.error.includes('API credits') && result.source === 'twelvedata') {
      console.error('تم تجاوز حد استخدام واجهة TwelveData API، جاري استخدام مصدر بديل...');
      triggerApiLimitExceededEvent('twelvedata');
    }

    // المحاولة بمصادر بديلة إذا فشل المصدر الرئيسي
    const fallbackSources = ['binance', 'twelvedata', 'alphavantage'].filter(
      s => !attemptedSources.includes(s)
    );
    
    for (const fallbackSource of fallbackSources) {
      console.log(`محاولة استخدام ${fallbackSource} كمصدر بديل`);
      
      switch (fallbackSource) {
        case 'binance':
          result = await retryOperation(() => fetchFromBinance(symbol));
          break;
        case 'twelvedata':
          result = await retryOperation(() => fetchFromTwelveData(symbol));
          break;
        case 'alphavantage':
          result = await retryOperation(() => fetchFromAlphaVantage(symbol));
          break;
      }
      
      // التحقق مرة أخرى من خطأ حد API
      if (result.error && result.error.includes('API credits') && result.source === 'twelvedata') {
        console.error('تم تجاوز حد استخدام واجهة TwelveData API في المصدر البديل');
        triggerApiLimitExceededEvent('twelvedata');
        continue; // محاولة المصدر التالي
      }
      
      if (result.price !== null) {
        console.log(`تم الحصول على السعر بنجاح من المصدر البديل ${result.source}:`, result.price);
        return result;
      }
    }

    console.error('فشل في جلب السعر من جميع المصادر المتاحة');
    // إرسال إشعار لتفعيل وضع عدم الاتصال
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('enableOfflineMode', {
        detail: { reason: 'network_error' }
      });
      window.dispatchEvent(event);
    }
    
    return {
      price: null,
      error: 'فشل في جلب السعر من جميع المصادر المتاحة'
    };
  } catch (error) {
    console.error('خطأ في جلب السعر:', error);
    return {
      price: null,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}