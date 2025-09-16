import axios, { AxiosError } from 'axios';
import env from '../env';
import { storage } from '../storage';
import { KeyManager } from './keyManager';
import { logsService } from './logs-service';
import {
  AppError,
  ErrorCategory,
  createError,
  createNetworkError,
  createApiLimitError,
  convertJavaScriptError,
  ERROR_CODES,
  ERROR_MESSAGES
} from '@shared/error-types';

// تكوين المصادر
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const TWELVEDATA_BASE_URL = 'https://api.twelvedata.com';
const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';

// واجهة لنتيجة السعر - محدثة لدعم النظام الموحد
interface PriceResult {
  price: number | null;
  error?: string; // للتوافق مع المستهلكين الحاليين
  source?: string;
  appError?: AppError; // للاستخدام الداخلي مع النظام الموحد
}

// دالة مساعدة لتنسيق رمز العملة لـ Binance
function formatSymbolForBinance(symbol: string): string {
  // إزالة '/' وتحويل إلى التنسيق المناسب لـ Binance
  return symbol.replace('/', '');
}

// إنشاء مثيل واحد لـ KeyManager
const keyManager = new KeyManager(storage);


// =============================================================================
// دوال مساعدة لمعالجة الأخطاء المخصصة للـ API providers
// =============================================================================

// دالة لتحويل الأخطاء إلى PriceResult مع AppError للاستخدام الداخلي
function createPriceErrorResult(appError: AppError, provider: string): PriceResult {
  return {
    price: null,
    error: appError.messageAr || appError.message,
    source: provider,
    appError: appError
  };
}

async function handleProviderError(
  error: any, 
  provider: string, 
  keyId: number | null,
  failureDurationMinutes: number = 30
): Promise<never> {
  let appError: AppError;

  // معالجة الأخطاء المختلفة وتحويلها إلى AppError
  if (error instanceof AxiosError) {
    if (error.response?.status === 429) {
      // تمييز المفتاح كفاشل إذا كان من قاعدة البيانات
      if (keyId) {
        await keyManager.markKeyFailed(keyId, failureDurationMinutes * 60);
      }
      
      appError = createApiLimitError(
        ERROR_CODES.API_RATE_LIMITED,
        ERROR_MESSAGES.API_LIMIT.RATE_LIMITED.ar,
        provider,
        keyId || undefined
      );
      appError.messageAr = `تم تجاوز حد استخدام API للمزود ${provider}`;
      throw appError;
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      // تمييز المفتاح كفاشل لفترة أطول للأخطاء المصادقة (24 ساعة)
      if (keyId) {
        await keyManager.markKeyFailed(keyId, 24 * 60 * 60); // 24 ساعة
      }
      
      appError = createNetworkError(
        ERROR_CODES.NETWORK_BAD_REQUEST,
        ERROR_MESSAGES.NETWORK.BAD_REQUEST.ar,
        error.config?.url,
        error.response?.status,
        false // retryable: false - أخطاء المصادقة غير قابلة للإعادة
      );
      appError.messageAr = `فشل في المصادقة مع مزود API ${provider}`;
      throw appError;
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      // تمييز المفتاح كفاشل إذا كان من قاعدة البيانات
      if (keyId) {
        await keyManager.markKeyFailed(keyId, failureDurationMinutes * 60);
      }
      
      appError = createNetworkError(
        ERROR_CODES.NETWORK_CONNECTION_FAILED,
        ERROR_MESSAGES.NETWORK.CONNECTION_FAILED.ar,
        error.config?.url,
        undefined,
        true // retryable
      );
      appError.messageAr = `فشل الاتصال بالمزود ${provider}`;
      throw appError;
    }
  }

  // تمييز المفتاح كفاشل للأخطاء الأخرى
  if (keyId) {
    await keyManager.markKeyFailed(keyId, failureDurationMinutes * 60);
  }

  // تحويل أي خطأ آخر إلى AppError
  appError = convertJavaScriptError(error);
  appError.messageAr = `خطأ غير متوقع من المزود ${provider}`;
  
  throw appError;
}


// =============================================================================
// دوال جلب الأسعار المحسنة
// =============================================================================

// دالة لجلب السعر من Binance مع النظام الموحد
async function fetchFromBinance(symbol: string): Promise<PriceResult> {
  await logsService.info('price-sources', `محاولة جلب السعر من Binance للرمز: ${symbol}`);
  const formattedSymbol = formatSymbolForBinance(symbol);
  let keyId: number | null = null;
  
  // استخدام KeyManager للحصول على مفتاح API
  const keyResult = await keyManager.getKeyForProvider('binance', 'BINANCE_API_KEY', env.BINANCE_API_KEY);
  if (!keyResult.key) {
      const appError = createError(
      ErrorCategory.SYSTEM,
      ERROR_CODES.SYSTEM_INTERNAL_ERROR,
      ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR.ar,
      {}
    );
    appError.messageAr = 'لا يوجد مفتاح API متاح للـ Binance';
    return createPriceErrorResult(appError, 'binance');
  }
  
  const { key: apiKey, keyId: resultKeyId } = keyResult;
  keyId = resultKeyId;
  
  // استخدام try-catch للتعامل مع الأخطاء
  let response: any;
  try {
    response = await axios.get(`${BINANCE_BASE_URL}/ticker/price`, {
      params: { symbol: formattedSymbol },
      timeout: 5000,
      headers: {
        'X-MBX-APIKEY': apiKey
      }
    });
  } catch (error) {
    // معالجة خاصة للأخطاء مع فترات فشل مختلفة حسب نوع الخطأ
    const axiosError = error as AxiosError;
    const failureDuration = (axiosError.response?.status === 401 || axiosError.response?.status === 403) ? 24 * 60 : 30;
    await handleProviderError(error, 'binance', keyId, failureDuration);
    // هذا السطر لن يُنفذ أبداً لأن handleProviderError ترمي خطأ
    throw error;
  }

  await logsService.debug('price-sources', `استجابة Binance: ${JSON.stringify(response.data)}`);

  if (response.data && response.data.price) {
    return { 
      price: parseFloat(response.data.price),
      source: 'binance'
    };
  }

  // إنشاء خطأ للبيانات غير الصالحة
  const appError = createError(
    ErrorCategory.SYSTEM,
    ERROR_CODES.SYSTEM_INTERNAL_ERROR,
    ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR.ar,
    {}
  );
  appError.messageAr = 'بيانات غير صالحة من Binance';
  return createPriceErrorResult(appError, 'binance');
}

// دالة لجلب السعر من TwelveData مع النظام الموحد
async function fetchFromTwelveData(symbol: string): Promise<PriceResult> {
  await logsService.info('price-sources', `محاولة جلب السعر من TwelveData للرمز: ${symbol}`);
  let keyId: number | null = null;
  
  // استخدام KeyManager للحصول على مفتاح API
  const keyResult = await keyManager.getKeyForProvider('twelvedata', 'TWELVEDATA_API_KEY', env.TWELVEDATA_API_KEY);
  if (!keyResult.key) {
    const appError = createError(
      ErrorCategory.SYSTEM,
      ERROR_CODES.SYSTEM_INTERNAL_ERROR,
      ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR.ar,
      {}
    );
    appError.messageAr = 'لا يوجد مفتاح API متاح لـ TwelveData';
    return createPriceErrorResult(appError, 'twelvedata');
  }
  
  const { key: apiKey, keyId: resultKeyId } = keyResult;
  keyId = resultKeyId;

  // استخدام try-catch للتعامل مع الأخطاء
  let response: any;
  try {
    response = await axios.get('https://api.twelvedata.com/price', {
      params: {
        symbol,
        apikey: apiKey,
      },
      timeout: 5000
    });
  } catch (error) {
    // معالجة خاصة لـ TwelveData rate limits
    const axiosError = error as AxiosError;
    
    // تحديد مدة الفشل حسب نوع الخطأ
    let failureDuration = 24 * 60; // افتراضي 24 ساعة
    
    if (axiosError.response?.status === 429 ||
        (axiosError.response?.data && 
         typeof axiosError.response.data === 'object' && 
         'code' in axiosError.response.data && 
         axiosError.response.data.code === 429)) {
      
      if (keyId) {
        await keyManager.markKeyFailed(keyId, 24 * 60 * 60); // 24 ساعة
      }
      failureDuration = 24 * 60; // rate limits: 24 ساعة
    } else if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
      failureDuration = 24 * 60; // authentication errors: 24 ساعة
    }
    
    // handleProviderError سترمي AppError
    await handleProviderError(error, 'twelvedata', keyId, failureDuration);
    // هذا السطر لن يُنفذ أبداً لأن handleProviderError ترمي خطأ
    throw error;
  }

  await logsService.debug('price-sources', `استجابة TwelveData: ${JSON.stringify(response.data)}`);

  // التحقق من تجاوز حد API في الاستجابة
  if (response.data && response.data.code === 429) {
    if (keyId) {
      await keyManager.markKeyFailed(keyId, 24 * 60 * 60); // 24 ساعة
    }
    
    const appError = createApiLimitError(
      ERROR_CODES.API_QUOTA_EXCEEDED,
      ERROR_MESSAGES.API_LIMIT.QUOTA_EXCEEDED.ar,
      'twelvedata',
      keyId || undefined
    );
    appError.messageAr = `تم تجاوز حد API: ${response.data.message}`;
    return createPriceErrorResult(appError, 'twelvedata');
  }

  // التحقق من نجاح الاستجابة
  if (response.data && response.data.price) {
    return { 
      price: parseFloat(response.data.price),
      source: 'twelvedata'
    };
  }

  // إنشاء خطأ للبيانات غير الصالحة
  const appError = createError(
    ErrorCategory.SYSTEM,
    ERROR_CODES.SYSTEM_INTERNAL_ERROR,
    ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR.ar,
    {}
  );
  appError.messageAr = 'بيانات غير صالحة من TwelveData';
  return createPriceErrorResult(appError, 'twelvedata');
}

// دالة لجلب السعر من Alpha Vantage مع النظام الموحد
async function fetchFromAlphaVantage(symbol: string): Promise<PriceResult> {
  await logsService.info('price-sources', `محاولة جلب السعر من Alpha Vantage للرمز: ${symbol}`);
  let keyId: number | null = null;
  
  // استخدام KeyManager للحصول على مفتاح API
  const keyResult = await keyManager.getKeyForProvider('alphavantage', 'PRIMARY_API_KEY', env.PRIMARY_API_KEY);
  if (!keyResult.key) {
    const appError = createError(
      ErrorCategory.SYSTEM,
      ERROR_CODES.SYSTEM_INTERNAL_ERROR,
      ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR.ar,
      {}
    );
    appError.messageAr = 'لا يوجد مفتاح API متاح لـ Alpha Vantage';
    return createPriceErrorResult(appError, 'alphavantage');
  }
  const { key: apiKey, keyId: resultKeyId } = keyResult;
  keyId = resultKeyId;
  
  // استخدام try-catch للتعامل مع الأخطاء
  let response: any;
  try {
    response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol,
        apikey: apiKey,
      },
      timeout: 5000
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    
    // تحديد مدة الفشل حسب نوع الخطأ
    let failureDuration = 24 * 60; // افتراضي 24 ساعة
    
    if (axiosError.response?.status === 429) {
      // تمييز المفتاح الحالي كفاشل لتجنبه في المرة القادمة
      if (keyId) {
        await keyManager.markKeyFailed(keyId, 24 * 60 * 60); // 24 ساعة
      }
      failureDuration = 24 * 60; // rate limits: 24 ساعة
    } else if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
      failureDuration = 24 * 60; // authentication errors: 24 ساعة
    }
    
    // handleProviderError سترمي AppError
    await handleProviderError(error, 'alphavantage', keyId, failureDuration);
    // هذا السطر لن يُنفذ أبداً لأن handleProviderError ترمي خطأ
    throw error;
  }

  // Alpha Vantage يرسل رسالة خطأ محددة عند تجاوز الحد اليومي
  if (response.data && response.data.Note && response.data.Note.includes('API call frequency')) {
    await logsService.warn('price-sources', 'تم تجاوز حد استخدام واجهة Alpha Vantage API');
    // تمييز المفتاح الحالي كفاشل لتجنبه في المرة القادمة
    if (keyId) {
      await keyManager.markKeyFailed(keyId, 24 * 60 * 60); // 24 ساعة
    }
    
    const appError = createApiLimitError(
      ERROR_CODES.API_QUOTA_EXCEEDED,
      ERROR_MESSAGES.API_LIMIT.QUOTA_EXCEEDED.ar,
      'alphavantage',
      keyId || undefined
    );
    appError.messageAr = `تم تجاوز حد API: ${response.data.Note}`;
    return createPriceErrorResult(appError, 'alphavantage');
  }

  if (response.data['Global Quote'] && response.data['Global Quote']['05. price']) {
    return { 
      price: parseFloat(response.data['Global Quote']['05. price']),
      source: 'alphavantage'
    };
  }

  // إذا لم تكن هناك بيانات ولكن لا توجد أيضًا رسالة خطأ واضحة
  if (response.data && Object.keys(response.data).length === 0) {
    await logsService.warn('price-sources', 'لا توجد بيانات من Alpha Vantage - قد يكون تم تجاوز الحد اليومي');
    // تمييز المفتاح كفاشل احتياطياً
    if (keyId) {
      await keyManager.markKeyFailed(keyId, 24 * 60 * 60); // 24 ساعة
    }
    
    const appError = createApiLimitError(
      ERROR_CODES.API_QUOTA_EXCEEDED,
      ERROR_MESSAGES.API_LIMIT.QUOTA_EXCEEDED.ar,
      'alphavantage',
      keyId || undefined
    );
    appError.messageAr = 'قد يكون تم تجاوز الحد اليومي لـ Alpha Vantage';
    return createPriceErrorResult(appError, 'alphavantage');
  }

  // إنشاء خطأ للبيانات غير الصالحة
  const appError = createError(
    ErrorCategory.SYSTEM,
    ERROR_CODES.SYSTEM_INTERNAL_ERROR,
    ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR.ar,
    {}
  );
  appError.messageAr = 'بيانات غير صالحة من Alpha Vantage';
  return createPriceErrorResult(appError, 'alphavantage');
}

// دالة مساعدة للمحاولات المتكررة مع النظام الموحد
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
      
      // فحص إذا كان الخطأ غير قابل للإعادة - مع type guard صحيح
      const isAppError = error && typeof error === 'object' && 'category' in error;
      const appError = isAppError ? error as AppError : null;
      
      // فحص الأخطاء غير القابلة للإعادة
      const isNotRetryable = appError && (
        appError.retryable === false || 
        appError.category === ErrorCategory.API_LIMIT ||
        appError.category === ErrorCategory.AUTHENTICATION ||
        appError.category === ErrorCategory.AUTHORIZATION ||
        // فحص إضافي للأخطاء Network مع رموز استجابة المصادقة
        (appError.category === ErrorCategory.NETWORK && 
         'details' in appError && 
         appError.details?.statusCode && 
         (appError.details.statusCode === 401 || appError.details.statusCode === 403))
      );

      if (isNotRetryable) {
        const errorCode = appError?.code || 'unknown';
        const statusCode = appError?.details?.statusCode ? ` (${appError.details.statusCode})` : '';
        await logsService.warn('price-sources', `إيقاف إعادة المحاولة للخطأ غير القابل للإعادة: ${errorCode}${statusCode}`);
        throw error; // إيقاف فوري للأخطاء غير القابلة للإعادة
      }

      await logsService.debug('price-sources', `محاولة فاشلة ${i + 1}/${maxRetries}, انتظار ${delay}ms`);
      
      // إذا لم تكن هذه المحاولة الأخيرة، انتظر ثم حاول مرة أخرى
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // تحويل الخطأ الأخير إلى AppError إذا لم يكن كذلك بالفعل - مع type guard صحيح
  const hasCategory = lastError && typeof lastError === 'object' && 'category' in lastError;
  const finalError = hasCategory ? lastError as AppError : convertJavaScriptError(lastError);
  throw finalError;
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

// دالة لجلب السعر من المصادر المتاحة مع النظام الموحد
export async function getCurrentPrice(symbol: string): Promise<PriceResult> {
  await logsService.info('price-sources', `بدء جلب السعر للرمز: ${symbol}`);

  const source = determinePriceSource(symbol);
  await logsService.debug('price-sources', `المصدر المختار: ${source}`);
  
  // مصفوفة لتتبع المصادر التي تمت محاولة استخدامها
  const attemptedSources: string[] = [];

  // الوظيفة المساعدة لإطلاق حدث تجاوز حد API
  const triggerApiLimitExceededEvent = async (source: string) => {
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
      await logsService.error('price-sources', `تم تجاوز حد API لمصدر ${source}`);
    }
  };

  // دالة مساعدة لجلب السعر من مصدر معين مع معالجة الأخطاء
  const fetchFromSource = async (sourceName: 'binance' | 'twelvedata' | 'alphavantage'): Promise<PriceResult> => {
    try {
      switch (sourceName) {
        case 'binance':
          return await retryOperation(() => fetchFromBinance(symbol));
        case 'twelvedata':
          return await retryOperation(() => fetchFromTwelveData(symbol));
        case 'alphavantage':
          return await retryOperation(() => fetchFromAlphaVantage(symbol));
        default:
          const appError = createError(
            ErrorCategory.SYSTEM,
            ERROR_CODES.SYSTEM_INTERNAL_ERROR,
            ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR.ar,
            {}
          );
          appError.messageAr = `مصدر غير معروف للسعر: ${sourceName}`;
          return createPriceErrorResult(appError, sourceName);
      }
    } catch (error) {
      // تحويل الخطأ إلى PriceResult مع AppError
      const appError = (error as any).category ? error as AppError : convertJavaScriptError(error as Error);
      return createPriceErrorResult(appError, sourceName);
    }
  };

  // المحاولة الأولى مع المصدر الرئيسي
  let result = await fetchFromSource(source);
  attemptedSources.push(source);

  // التحقق من نجاح عملية جلب السعر
  if (result.price !== null) {
    await logsService.info('price-sources', `تم الحصول على السعر بنجاح من ${result.source}: ${result.price}`);
    return result;
  }
  
  // التحقق من خطأ حد API وإطلاق الأحداث المناسبة
  if (result.appError?.category === ErrorCategory.API_LIMIT) {
    await logsService.warn('price-sources', `تم تجاوز حد استخدام واجهة ${result.source} API، جاري استخدام مصدر بديل`);
    triggerApiLimitExceededEvent(result.source || 'unknown');
  }

  // المحاولة بمصادر بديلة إذا فشل المصدر الرئيسي
  const fallbackSources = (['binance', 'twelvedata', 'alphavantage'] as const).filter(
    s => !attemptedSources.includes(s)
  );
  
  for (const fallbackSource of fallbackSources) {
    await logsService.info('price-sources', `محاولة استخدام ${fallbackSource} كمصدر بديل`);
    
    result = await fetchFromSource(fallbackSource);
    
    // التحقق من خطأ حد API في المصدر البديل
    if (result.appError?.category === ErrorCategory.API_LIMIT) {
      await logsService.warn('price-sources', `تم تجاوز حد استخدام واجهة ${result.source} API في المصدر البديل`);
      triggerApiLimitExceededEvent(result.source || fallbackSource);
      continue; // محاولة المصدر التالي
    }
    
    if (result.price !== null) {
      await logsService.info('price-sources', `تم الحصول على السعر بنجاح من المصدر البديل ${result.source}: ${result.price}`);
      return result;
    }
  }

  await logsService.error('price-sources', 'فشل في جلب السعر من جميع المصادر المتاحة');
  // إرسال إشعار لتفعيل وضع عدم الاتصال
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('enableOfflineMode', {
      detail: { reason: 'network_error' }
    });
    window.dispatchEvent(event);
  }
  
  // إنشاء خطأ نهائي عندما تفشل جميع المصادر
  const finalError = createError(
    ErrorCategory.SYSTEM,
    ERROR_CODES.SYSTEM_SERVICE_UNAVAILABLE,
    ERROR_MESSAGES.SYSTEM.SERVICE_UNAVAILABLE.ar,
    {}
  );
  finalError.messageAr = 'فشل في جلب السعر من جميع المصادر المتاحة';
  
  return createPriceErrorResult(finalError, 'all');
}