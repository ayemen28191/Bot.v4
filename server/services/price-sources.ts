import axios, { AxiosError } from 'axios';
import env from '../env';
import { storage } from '../storage';
import { KeyManager } from './keyManager';

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

// إنشاء مثيل واحد لـ KeyManager
const keyManager = new KeyManager(storage);


// دالة لجلب السعر من Binance
async function fetchFromBinance(symbol: string): Promise<PriceResult> {
  let keyId: number | null = null;
  try {
    console.log('محاولة جلب السعر من Binance للرمز:', symbol);
    const formattedSymbol = formatSymbolForBinance(symbol);
    
    // استخدام KeyManager للحصول على مفتاح API
    const keyResult = await keyManager.getKeyForProvider('binance', 'BINANCE_API_KEY', env.BINANCE_API_KEY);
    if (!keyResult.key) {
      return {
        price: null,
        error: 'لا يوجد مفتاح API متاح للـ Binance',
        source: 'binance'
      };
    }
    const { key: apiKey, keyId: resultKeyId } = keyResult;
    keyId = resultKeyId;
    
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
    // في حالة الخطأ، وسم المفتاح كفاشل إذا كان من قاعدة البيانات
    if (keyId) {
      await keyManager.markKeyFailed(keyId, 30 * 60); // 30 دقيقة
    }
    return { 
      price: null, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
      source: 'binance'
    };
  }
}

// دالة لجلب السعر من TwelveData
async function fetchFromTwelveData(symbol: string): Promise<PriceResult> {
  let keyId: number | null = null;
  try {
    console.log('محاولة جلب السعر من TwelveData للرمز:', symbol);
    
    // استخدام KeyManager للحصول على مفتاح API
    const keyResult = await keyManager.getKeyForProvider('twelvedata', 'TWELVEDATA_API_KEY', env.TWELVEDATA_API_KEY);
    if (!keyResult.key) {
      return {
        price: null,
        error: 'لا يوجد مفتاح API متاح لـ TwelveData',
        source: 'twelvedata'
      };
    }
    const { key: apiKey, keyId: resultKeyId } = keyResult;
    keyId = resultKeyId;

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
      if (keyId) {
        await keyManager.markKeyFailed(keyId, 24 * 60 * 60); // 24 ساعة
      }
      
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
        if (keyId) {
          await keyManager.markKeyFailed(keyId, 24 * 60 * 60); // 24 ساعة
        }
        
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
  let keyId: number | null = null;
  try {
    console.log('محاولة جلب السعر من Alpha Vantage للرمز:', symbol);
    
    // استخدام KeyManager للحصول على مفتاح API
    const keyResult = await keyManager.getKeyForProvider('alphavantage', 'PRIMARY_API_KEY', env.PRIMARY_API_KEY);
    if (!keyResult.key) {
      return {
        price: null,
        error: 'لا يوجد مفتاح API متاح لـ Alpha Vantage',
        source: 'alphavantage'
      };
    }
    const { key: apiKey, keyId: resultKeyId } = keyResult;
    keyId = resultKeyId;
    
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
      if (keyId) {
        await keyManager.markKeyFailed(keyId, 24 * 60 * 60); // 24 ساعة
      }
      
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
      if (keyId) {
        await keyManager.markKeyFailed(keyId, 24 * 60 * 60); // 24 ساعة
      }
    }

    return { 
      price: null, 
      error: 'بيانات غير صالحة من Alpha Vantage',
      source: 'alphavantage'
    };
  } catch (error) {
    console.error('خطأ في جلب السعر من Alpha Vantage:', error);
    
    // التحقق من وجود خطأ محدد
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      // Alpha Vantage يستخدم الرمز 429 عندما يتم تجاوز الحد
      if (axiosError.response.status === 429) {
        // تمييز المفتاح الحالي كفاشل لتجنبه في المرة القادمة
        if (keyId) {
          await keyManager.markKeyFailed(keyId, 24 * 60 * 60); // 24 ساعة
        }
        
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