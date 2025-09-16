import axios from 'axios';
import env, { getKeyFromDatabase } from '../env';
import { storage } from '../storage';
import { signalLogger } from './signal-logger';
import {
  AppError,
  ErrorCategory,
  createNetworkError,
  createApiLimitError,
  ERROR_CODES,
  ERROR_MESSAGES
} from '@shared/error-types';

// تعريف واجهة نتيجة المؤشرات الفنية
export interface TechnicalIndicatorResult {
  value: number;
  signal: 'buy' | 'sell' | 'neutral';
  timeframe: string;
}

// تعريف واجهة نتيجة تحليل السوق
export interface MarketAnalysisResult {
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  volatility: number; // 0-100
  support: number | null; // السعر
  resistance: number | null; // السعر
  indicators: {
    [key: string]: TechnicalIndicatorResult;
  };
  lastUpdate: string;
  nextUpdate: string | null;
  probability: number; // 0-100
  signal: 'buy' | 'sell' | 'wait'; // الإشارة النهائية
  dataSource?: string; // مصدر البيانات ('real_time_api' أو 'local_data')
}

// =========== دوال مساعدة =============

// تحويل الإطار الزمني إلى صيغة TwelveData
function convertTimeframe(timeframe: string): string {
  const mapping: Record<string, string> = {
    '1M': '1min',
    '5M': '5min',
    '15M': '15min',
    '1H': '1h',
    '4H': '4h',
    '1D': '1day'
  };
  return mapping[timeframe] || '1h';
}

// =============================================================================
// دوال مساعدة لمعالجة الأخطاء في التحليل الفني
// =============================================================================

async function handleTechnicalAnalysisError(
  error: any, 
  operation: string, 
  symbol?: string,
  usedKeyName?: string,
  timeframe: string = '1H'
): Promise<TechnicalIndicatorResult> {
  // معالجة أخطاء محددة
  if (error.response?.status === 429 || error.message?.includes('429')) {
    // تمييز المفتاح كفاشل فقط لأخطاء تجاوز الحد
    if (usedKeyName) {
      markKeyAsFailed(usedKeyName);
    }
    console.warn(`تم تجاوز حد API للعملية: ${operation}${symbol ? ` للرمز ${symbol}` : ''}`);
    return {
      value: 50, // قيمة محايدة
      signal: 'neutral',
      timeframe
    };
  }

  if (error.response?.status === 401 || error.response?.status === 403) {
    // تمييز المفتاح كفاشل لأخطاء المصادقة
    if (usedKeyName) {
      markKeyAsFailed(usedKeyName);
    }
    console.error(`خطأ في المصادقة للعملية: ${operation}${symbol ? ` للرمز ${symbol}` : ''}`);
    return {
      value: 50,
      signal: 'neutral', 
      timeframe
    };
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    // لا تميز المفتاح كفاشل لأخطاء الاتصال العادية
    console.error(`خطأ في الاتصال للعملية: ${operation}${symbol ? ` للرمز ${symbol}` : ''}`);
    return {
      value: 50,
      signal: 'neutral',
      timeframe
    };
  }

  // خطأ عام - لا تميز المفتاح كفاشل للأخطاء العامة
  console.error(`خطأ في ${operation}${symbol ? ` للرمز ${symbol}` : ''}:`, error.message || error);
  return {
    value: 50,
    signal: 'neutral',
    timeframe
  };
}

// دالة مساعدة لمعالجة أخطاء تحليل السوق
function handleMarketAnalysisError(error: any, operation: string): MarketAnalysisResult {
  console.error(`خطأ في تحليل السوق - ${operation}:`, error.message || error);
  
  return {
    trend: 'neutral',
    strength: 50,
    volatility: 50,
    support: null,
    resistance: null,
    indicators: {},
    lastUpdate: new Date().toISOString(),
    nextUpdate: null,
    probability: 50,
    signal: 'wait',
    dataSource: 'error_fallback'
  };
}

// الحصول على مفتاح API من قاعدة البيانات أو المتغيرات البيئية
async function getApiKey(keyName: string, fallbackValue: string): Promise<string> {
  // محاولة الحصول على المفتاح من قاعدة البيانات
  const dbKey = await getKeyFromDatabase(storage, keyName);
  if (dbKey) {
    return dbKey;
  }
  
  // استخدام المفتاح من المتغيرات البيئية كبديل
  console.log(`استخدام ${keyName} من المتغيرات البيئية`);
  return fallbackValue;
}

// ============ دوال الحصول على المؤشرات الفنية ===============

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
    alternativeKeys: ['TWELVEDATA_API_KEY_1', 'TWELVEDATA_API_KEY_2', 'TWELVEDATA_API_KEY_3', 'TWELVEDATA_API_KEY_4', 'TWELVEDATA_API_KEY_5', 'TWELVEDATA_API_KEY_6', 'TWELVEDATA_API_KEY_7', 'TWELVEDATA_API_KEY_8'],
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

// دالة مساعدة للحصول على قيمة مفتاح معين من متغيرات البيئة
function getEnvironmentKeyByName(keyName: string): string {
  switch (keyName) {
    case 'TWELVEDATA_API_KEY': return env.TWELVEDATA_API_KEY;
    case 'TWELVEDATA_API_KEY_1': return process.env.TWELVEDATA_API_KEY_1 || '';
    case 'TWELVEDATA_API_KEY_2': return process.env.TWELVEDATA_API_KEY_2 || '';
    case 'TWELVEDATA_API_KEY_3': return process.env.TWELVEDATA_API_KEY_3 || '';
    case 'TWELVEDATA_API_KEY_4': return process.env.TWELVEDATA_API_KEY_4 || '';
    case 'TWELVEDATA_API_KEY_5': return process.env.TWELVEDATA_API_KEY_5 || '';
    case 'TWELVEDATA_API_KEY_6': return process.env.TWELVEDATA_API_KEY_6 || '';
    case 'TWELVEDATA_API_KEY_7': return process.env.TWELVEDATA_API_KEY_7 || '';
    case 'TWELVEDATA_API_KEY_8': return process.env.TWELVEDATA_API_KEY_8 || '';
    case 'PRIMARY_API_KEY': return env.PRIMARY_API_KEY;
    case 'ALPHAVANTAGE_API_KEY_1': return process.env.ALPHAVANTAGE_API_KEY_1 || '';
    case 'ALPHAVANTAGE_API_KEY_2': return process.env.ALPHAVANTAGE_API_KEY_2 || '';
    case 'ALPHAVANTAGE_API_KEY_3': return process.env.ALPHAVANTAGE_API_KEY_3 || '';
    case 'MARKET_API_KEY': return env.MARKET_API_KEY;
    case 'FINNHUB_API_KEY': return process.env.FINNHUB_API_KEY || '';
    case 'MARKETSTACK_API_KEY': return process.env.MARKETSTACK_API_KEY || '';
    case 'POLYGON_API_KEY': return process.env.POLYGON_API_KEY || '';
    case 'TIINGO_API_KEY': return process.env.TIINGO_API_KEY || '';
    default: return '';
  }
}

// دالة مساعدة للحصول على مفتاح API مع دعم التناوب مع إرجاع اسم المفتاح أيضاً
async function getRotatedApiKey(baseName: string, fallbackValue: string): Promise<string> {
  // البحث عن مجموعة المفاتيح المناسبة
  const keyGroup = API_KEY_GROUPS.find(group => 
    group.baseName === baseName || group.alternativeKeys.includes(baseName)
  );
  
  // إذا لم يتم العثور على مجموعة، استخدم الطريقة العادية
  if (!keyGroup) {
    return await getKeyFromDatabase(storage, baseName) || fallbackValue;
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
        console.log(`تم استخدام المفتاح ${currentKeyName} من قاعدة البيانات (تناوب في التحليل الفني)`);
        keyGroup.lastUsedIndex = currentIndex; // تحديث المؤشر
        return dbKey;
      }
    } catch (error) {
      console.warn(`فشل في استرداد المفتاح ${currentKeyName} من قاعدة البيانات:`, error);
    }
    
    // محاولة الحصول على المفتاح من متغيرات البيئة
    const envKey = getEnvironmentKeyByName(currentKeyName);
    if (envKey && envKey.length > 5) {
      console.log(`تم استخدام المفتاح ${currentKeyName} من متغيرات البيئة (تناوب في التحليل الفني)`);
      keyGroup.lastUsedIndex = currentIndex; // تحديث المؤشر
      return envKey;
    }
  }
  
  // إذا فشلت جميع المحاولات، عد إلى المفتاح الأصلي
  console.log(`فشلت كل المفاتيح البديلة، العودة إلى المفتاح الأصلي ${baseName}`);
  return fallbackValue;
}

// دالة مساعدة للحصول على اسم المفتاح المستخدم من مجموعة معينة
function getUsedKeyName(baseName: string): string {
  const keyGroup = API_KEY_GROUPS.find(group => 
    group.baseName === baseName || group.alternativeKeys.includes(baseName)
  );
  
  if (!keyGroup) {
    return baseName;
  }
  
  const allKeys = [keyGroup.baseName, ...keyGroup.alternativeKeys];
  const currentIndex = keyGroup.lastUsedIndex;
  
  // التأكد من صحة المؤشر
  if (currentIndex >= 0 && currentIndex < allKeys.length) {
    return allKeys[currentIndex];
  }
  
  return keyGroup.baseName;
}

// دالة لإضافة مفتاح إلى قائمة المفاتيح الفاشلة
function markKeyAsFailed(keyName: string): void {
  failedKeys.add(keyName);
  console.warn(`تم تمييز المفتاح ${keyName} كفاشل وسيتم تجاهله في المحاولات القادمة للتحليل`);
}

// دالة للحصول على مؤشر RSI (مؤشر القوة النسبية) من TwelveData
async function getRSI(symbol: string, timeframe: string): Promise<TechnicalIndicatorResult> {
  const apiKey = await getRotatedApiKey('TWELVEDATA_API_KEY', env.TWELVEDATA_API_KEY);
  const interval = convertTimeframe(timeframe);
  
  // احتفظ بمعلومات المفتاح المستخدم للتعامل مع الأخطاء
  const usedKeyName = getUsedKeyName('TWELVEDATA_API_KEY');
  
  try {
    const response = await axios.get('https://api.twelvedata.com/rsi', {
      params: {
        symbol,
        interval,
        series_type: 'close',
        outputsize: 1,
        apikey: apiKey,
      },
      timeout: 5000
    });

    // التحقق من وجود خطأ تجاوز الحد اليومي
    if (response.data && response.data.code === 429) {
      const error = createApiLimitError(
        ERROR_CODES.API_RATE_LIMITED,
        ERROR_MESSAGES.API_LIMIT.RATE_LIMITED.ar,
        'TwelveData',
        undefined,
        undefined
      );
      throw error;
    }

    if (response.data && response.data.values && response.data.values.length > 0) {
      const rsiValue = parseFloat(response.data.values[0].rsi);
      
      // تحديد الإشارة بناءً على قيمة RSI
      let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
      if (rsiValue < 30) {
        signal = 'buy'; // منطقة التشبع البيعي
      } else if (rsiValue > 70) {
        signal = 'sell'; // منطقة التشبع الشرائي
      }
      
      return {
        value: rsiValue,
        signal,
        timeframe
      };
    }
    
    const error = createNetworkError(
      ERROR_CODES.NETWORK_BAD_REQUEST,
      'لا توجد بيانات RSI متاحة',
      'https://api.twelvedata.com/rsi'
    );
    throw error;
  } catch (error) {
    return await handleTechnicalAnalysisError(error, 'getRSI', symbol, usedKeyName, timeframe);
  }
}

// دالة للحصول على مؤشر MACD من TwelveData
async function getMACD(symbol: string, timeframe: string): Promise<TechnicalIndicatorResult> {
  const apiKey = await getRotatedApiKey('TWELVEDATA_API_KEY', env.TWELVEDATA_API_KEY);
  const interval = convertTimeframe(timeframe);
  
  // احتفظ بمعلومات المفتاح المستخدم للتعامل مع الأخطاء
  const usedKeyName = getUsedKeyName('TWELVEDATA_API_KEY');
  
  try {
    const response = await axios.get('https://api.twelvedata.com/macd', {
      params: {
        symbol,
        interval,
        series_type: 'close',
        outputsize: 1,
        apikey: apiKey,
      },
      timeout: 5000
    });

    // التحقق من وجود خطأ تجاوز الحد اليومي
    if (response.data && response.data.code === 429) {
      const error = createApiLimitError(
        ERROR_CODES.API_RATE_LIMITED,
        ERROR_MESSAGES.API_LIMIT.RATE_LIMITED.ar,
        'TwelveData',
        undefined,
        undefined
      );
      throw error;
    }
    
    if (response.data && response.data.values && response.data.values.length > 0) {
      const macdValue = parseFloat(response.data.values[0].macd);
      const signalValue = parseFloat(response.data.values[0].macd_signal);
      
      // تحديد الإشارة بناءً على قيم MACD
      let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
      
      if (macdValue > signalValue) {
        signal = 'buy'; // خط MACD فوق خط الإشارة
      } else if (macdValue < signalValue) {
        signal = 'sell'; // خط MACD تحت خط الإشارة
      }
      
      // حساب الفرق (القوة)
      const diff = macdValue - signalValue;
      
      return {
        value: diff,
        signal,
        timeframe
      };
    }
    
    const error = createNetworkError(
      ERROR_CODES.NETWORK_BAD_REQUEST,
      'لا توجد بيانات MACD متاحة',
      'https://api.twelvedata.com/macd'
    );
    throw error;
  } catch (error) {
    return await handleTechnicalAnalysisError(error, 'getMACD', symbol, usedKeyName, timeframe);
  }
}

// دالة للحصول على مؤشر المتوسطات المتحركة (ema/sma) من TwelveData
async function getMovingAverages(symbol: string, timeframe: string): Promise<TechnicalIndicatorResult> {
  const apiKey = await getRotatedApiKey('TWELVEDATA_API_KEY', env.TWELVEDATA_API_KEY);
  const interval = convertTimeframe(timeframe);
  
  // احتفظ بمعلومات المفتاح المستخدم للتعامل مع الأخطاء
  let usedKeyName = getUsedKeyName('TWELVEDATA_API_KEY');
  
  try {
    // جلب المتوسط المتحرك الأسي القصير (9)
    const ema9Response = await axios.get('https://api.twelvedata.com/ema', {
      params: {
        symbol,
        interval,
        time_period: 9,
        series_type: 'close',
        outputsize: 1,
        apikey: apiKey,
      },
      timeout: 5000
    });
    
    // التحقق من وجود خطأ تجاوز الحد اليومي في الاستجابة الأولى
    if (ema9Response.data && ema9Response.data.code === 429) {
      const error = createApiLimitError(
        ERROR_CODES.API_RATE_LIMITED,
        ERROR_MESSAGES.API_LIMIT.RATE_LIMITED.ar,
        'TwelveData',
        undefined,
        undefined
      );
      throw error;
    }
    
    // الحصول على مفتاح جديد للطلب الثاني للتقليل من احتمالية تجاوز الحد
    const apiKey2 = await getRotatedApiKey('TWELVEDATA_API_KEY', env.TWELVEDATA_API_KEY);
    usedKeyName = getUsedKeyName('TWELVEDATA_API_KEY');
    
    // جلب المتوسط المتحرك الأسي الطويل (21)
    const ema21Response = await axios.get('https://api.twelvedata.com/ema', {
      params: {
        symbol,
        interval,
        time_period: 21,
        series_type: 'close',
        outputsize: 1,
        apikey: apiKey2,
      },
      timeout: 5000
    });
    
    // التحقق من وجود خطأ تجاوز الحد اليومي في الاستجابة الثانية
    if (ema21Response.data && ema21Response.data.code === 429) {
      const error = createApiLimitError(
        ERROR_CODES.API_RATE_LIMITED,
        ERROR_MESSAGES.API_LIMIT.RATE_LIMITED.ar,
        'TwelveData',
        undefined,
        undefined
      );
      throw error;
    }

    if (ema9Response.data?.values?.[0] && ema21Response.data?.values?.[0]) {
      const ema9Value = parseFloat(ema9Response.data.values[0].ema);
      const ema21Value = parseFloat(ema21Response.data.values[0].ema);
      
      // تحديد الإشارة بناءً على قيم المتوسطات المتحركة
      let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
      
      if (ema9Value > ema21Value) {
        signal = 'buy'; // المتوسط القصير فوق المتوسط الطويل
      } else if (ema9Value < ema21Value) {
        signal = 'sell'; // المتوسط القصير تحت المتوسط الطويل
      }
      
      // حساب النسبة المئوية للفرق
      const percentDifference = ((ema9Value - ema21Value) / ema21Value) * 100;
      
      return {
        value: percentDifference,
        signal,
        timeframe
      };
    }
    
    const error = createNetworkError(
      ERROR_CODES.NETWORK_BAD_REQUEST,
      'لا توجد بيانات المتوسطات المتحركة متاحة',
      'https://api.twelvedata.com/ema'
    );
    throw error;
  } catch (error) {
    return await handleTechnicalAnalysisError(error, 'getMovingAverages', symbol, usedKeyName, timeframe);
  }
}

// دالة للحصول على مؤشر Bollinger Bands من TwelveData
async function getBollingerBands(symbol: string, timeframe: string): Promise<TechnicalIndicatorResult> {
  const apiKey = await getRotatedApiKey('TWELVEDATA_API_KEY', env.TWELVEDATA_API_KEY);
  const interval = convertTimeframe(timeframe);
  
  // احتفظ بمعلومات المفتاح المستخدم للتعامل مع الأخطاء
  let usedKeyName = getUsedKeyName('TWELVEDATA_API_KEY');
  
  try {
    // طلب الحصول على Bollinger Bands
    const bbResponse = await axios.get('https://api.twelvedata.com/bbands', {
      params: {
        symbol,
        interval,
        time_period: 20,
        series_type: 'close',
        outputsize: 1,
        sd: 2, // الانحراف المعياري
        apikey: apiKey,
      },
      timeout: 5000
    });
    
    // التحقق من وجود خطأ تجاوز الحد اليومي في الاستجابة الأولى
    if (bbResponse.data && bbResponse.data.code === 429) {
      const error = createApiLimitError(
        ERROR_CODES.API_RATE_LIMITED,
        ERROR_MESSAGES.API_LIMIT.RATE_LIMITED.ar,
        'TwelveData',
        undefined,
        undefined
      );
      throw error;
    }
    
    // الحصول على مفتاح جديد للطلب الثاني للتقليل من احتمالية تجاوز الحد
    const apiKey2 = await getRotatedApiKey('TWELVEDATA_API_KEY', env.TWELVEDATA_API_KEY);
    usedKeyName = getUsedKeyName('TWELVEDATA_API_KEY');
    
    // طلب الحصول على السعر الحالي
    const priceResponse = await axios.get('https://api.twelvedata.com/price', {
      params: {
        symbol,
        apikey: apiKey2,
      },
      timeout: 5000
    });
    
    // التحقق من وجود خطأ تجاوز الحد اليومي في الاستجابة الثانية
    if (priceResponse.data && priceResponse.data.code === 429) {
      const error = createApiLimitError(
        ERROR_CODES.API_RATE_LIMITED,
        ERROR_MESSAGES.API_LIMIT.RATE_LIMITED.ar,
        'TwelveData',
        undefined,
        undefined
      );
      throw error;
    }

    if (bbResponse.data?.values?.[0] && priceResponse.data?.price) {
      const upperBand = parseFloat(bbResponse.data.values[0].upper_band);
      const middleBand = parseFloat(bbResponse.data.values[0].middle_band);
      const lowerBand = parseFloat(bbResponse.data.values[0].lower_band);
      const currentPrice = parseFloat(priceResponse.data.price);
      
      // حساب موقع السعر بالنسبة لنطاق Bollinger Bands (0-100)
      // 0 يعني أن السعر عند الحزام السفلي، 100 يعني أن السعر عند الحزام العلوي
      const bandWidth = upperBand - lowerBand;
      const pricePosition = (currentPrice - lowerBand) / bandWidth * 100;
      
      // تحديد الإشارة بناءً على موقع السعر
      let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
      
      if (pricePosition < 20) {
        signal = 'buy'; // السعر قريب من الحزام السفلي
      } else if (pricePosition > 80) {
        signal = 'sell'; // السعر قريب من الحزام العلوي
      }
      
      return {
        value: pricePosition,
        signal,
        timeframe
      };
    }
    
    const error = createNetworkError(
      ERROR_CODES.NETWORK_BAD_REQUEST,
      'لا توجد بيانات Bollinger Bands متاحة',
      'https://api.twelvedata.com/bbands'
    );
    throw error;
  } catch (error) {
    return await handleTechnicalAnalysisError(error, 'getBollingerBands', symbol, usedKeyName, timeframe);
  }
}

// دالة للحصول على مؤشر ADX (Average Directional Index) من TwelveData
async function getADX(symbol: string, timeframe: string): Promise<TechnicalIndicatorResult> {
  const apiKey = await getRotatedApiKey('TWELVEDATA_API_KEY', env.TWELVEDATA_API_KEY);
  const interval = convertTimeframe(timeframe);
  
  // احتفظ بمعلومات المفتاح المستخدم للتعامل مع الأخطاء
  const usedKeyName = getUsedKeyName('TWELVEDATA_API_KEY');
  
  try {
    const adxResponse = await axios.get('https://api.twelvedata.com/adx', {
      params: {
        symbol,
        interval,
        time_period: 14,
        outputsize: 1,
        apikey: apiKey,
      },
      timeout: 5000
    });
    
    // التحقق من وجود خطأ تجاوز الحد اليومي
    if (adxResponse.data && adxResponse.data.code === 429) {
      const error = createApiLimitError(
        ERROR_CODES.API_RATE_LIMITED,
        ERROR_MESSAGES.API_LIMIT.RATE_LIMITED.ar,
        'TwelveData',
        undefined,
        undefined
      );
      throw error;
    }

    if (adxResponse.data?.values?.[0]) {
      const adxValue = parseFloat(adxResponse.data.values[0].adx);
      
      // تحديد الإشارة بناءً على قيمة ADX
      // ADX هو مؤشر قوة الاتجاه وليس اتجاهي بطبيعته
      let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
      
      // نستخدم مؤشرات إضافية لتحديد الاتجاه مع ADX
      // نحتاج لقيم +DI و -DI لتحديد الاتجاه
      if (adxValue > 25) {
        // عادة نحتاج +DI و -DI لتحديد الاتجاه
        // هنا تعامل معها كمؤشر قوة فقط
        signal = 'neutral';
      }
      
      return {
        value: adxValue,
        signal,
        timeframe
      };
    }
    
    const error = createNetworkError(
      ERROR_CODES.NETWORK_BAD_REQUEST,
      'لا توجد بيانات ADX متاحة',
      'https://api.twelvedata.com/adx'
    );
    throw error;
  } catch (error) {
    return await handleTechnicalAnalysisError(error, 'getADX', symbol, usedKeyName, timeframe);
  }
}

// =============== الدالة الرئيسية للتحليل الفني =================

// واجهة معاملات التسجيل الاختيارية
interface AnalysisLoggingParams {
  userId?: number;
  username?: string;
  platform?: string;
  requestIp?: string;
  userAgent?: string;
  sessionId?: string;
  marketOpen?: boolean;
  offlineMode?: boolean;
}

// دالة مساعدة لجلب السعر الحالي مع نظام fallback موحد
async function getCurrentPriceWithFallback(
  symbol: string, 
  marketType: 'forex' | 'crypto' | 'stocks',
  requestId: string | null
): Promise<number> {
  try {
    // محاولة استخدام دالة getCurrentPrice المتوفرة في price-sources
    const { getCurrentPrice } = await import('./price-sources');
    const priceResult = await getCurrentPrice(symbol);
    
    if (priceResult.price !== null) {
      const currentPrice = priceResult.price;
      console.log(`تم جلب السعر الحالي من المصدر: ${priceResult.source || 'unknown'}: ${currentPrice}`);
      
      // تسجيل جلب السعر الناجح
      if (requestId) {
        void signalLogger.logTechnicalData(requestId, {
          currentPrice: currentPrice.toString(),
          priceSource: priceResult.source || 'price-sources'
        }).catch(err => console.warn('فشل في تسجيل جلب السعر:', err));
      }
      return currentPrice;
    }
    
    // إذا لم نحصل على سعر، نرمي خطأ للانتقال للطريقة البديلة
    const priceError = createNetworkError(
      ERROR_CODES.NETWORK_BAD_REQUEST,
      'لم يتم العثور على سعر من المصادر المتاحة',
      undefined,
      undefined,
      true
    );
    throw priceError;
    
  } catch (error) {
    console.warn('فشل في جلب السعر من price-sources، محاولة استخدام TwelveData مباشرة:', error);
    
    try {
      // استخدام نظام تناوب المفاتيح مع TwelveData API
      const apiKey = await getRotatedApiKey('TWELVEDATA_API_KEY', env.TWELVEDATA_API_KEY);
      const usedKeyName = getUsedKeyName('TWELVEDATA_API_KEY');
      
      const priceResponse = await axios.get('https://api.twelvedata.com/price', {
        params: {
          symbol,
          apikey: apiKey,
        },
        timeout: 5000
      });
      
      // التحقق من وجود خطأ تجاوز الحد اليومي
      if (priceResponse.data && priceResponse.data.code === 429) {
        markKeyAsFailed(usedKeyName);
        const limitError = createApiLimitError(
          ERROR_CODES.API_RATE_LIMITED,
          ERROR_MESSAGES.API_LIMIT.RATE_LIMITED.ar,
          'TwelveData',
          undefined,
          undefined
        );
        throw limitError;
      }
      
      if (priceResponse.data?.price) {
        const currentPrice = parseFloat(priceResponse.data.price);
        console.log(`تم جلب السعر الحالي مباشرة من TwelveData: ${currentPrice}`);
        
        // تسجيل جلب السعر الناجح
        if (requestId) {
          void signalLogger.logTechnicalData(requestId, {
            currentPrice: currentPrice.toString(),
            priceSource: 'TwelveData API',
            apiKeysUsed: [usedKeyName]
          }).catch(err => console.warn('فشل في تسجيل جلب السعر من TwelveData:', err));
        }
        return currentPrice;
      }
      
      const noDataError = createNetworkError(
        ERROR_CODES.NETWORK_BAD_REQUEST,
        'لا يوجد بيانات سعر متاحة من TwelveData',
        'https://api.twelvedata.com/price'
      );
      throw noDataError;
      
    } catch (apiError: any) {
      // معالجة أخطاء API مع تمييز المفاتيح الفاشلة
      if (apiError.response?.status === 429) {
        const usedKeyName = getUsedKeyName('TWELVEDATA_API_KEY');
        markKeyAsFailed(usedKeyName);
        console.error(`تم تجاوز الحد اليومي للمفتاح ${usedKeyName} عند محاولة جلب السعر`);
      }
      
      // استخدام قيمة تقديرية للسعر بناءً على نوع السوق والرمز
      const approximatePrice = getApproximatePrice(symbol, marketType);
      console.log(`استخدام سعر تقديري للرمز ${symbol}: ${approximatePrice}`);
      
      // تسجيل استخدام سعر تقديري
      if (requestId) {
        void signalLogger.logTechnicalData(requestId, {
          currentPrice: approximatePrice.toString(),
          priceSource: 'approximate_price',
          analysisData: `تم استخدام سعر تقديري بسبب فشل المصادر الأخرى - ${symbol}: ${approximatePrice}`
        }).catch(err => console.warn('فشل في تسجيل السعر التقديري:', err));
      }
      
      return approximatePrice;
    }
  }
}

// تجميع كل المؤشرات وتحليل السوق
export async function analyzeMarket(
  symbol: string, 
  timeframe: string, 
  marketType: 'forex' | 'crypto' | 'stocks',
  loggingParams?: AnalysisLoggingParams
): Promise<MarketAnalysisResult> {
  // بدء تسجيل طلب التحليل
  let requestId: string | null = null;
  
  try {
    // بدء تسجيل الطلب باستخدام SignalLogger
    requestId = await signalLogger.startSignalRequest({
      userId: loggingParams?.userId,
      username: loggingParams?.username,
      symbol,
      marketType,
      timeframe,
      platform: loggingParams?.platform,
      requestIp: loggingParams?.requestIp,
      userAgent: loggingParams?.userAgent,
      sessionId: loggingParams?.sessionId,
      marketOpen: loggingParams?.marketOpen,
      offlineMode: loggingParams?.offlineMode
    });
    
    console.log(`تحليل السوق للرمز ${symbol} - الإطار الزمني: ${timeframe} - نوع السوق: ${marketType} - طلب التسجيل: ${requestId}`);
    
    // جلب السعر الحالي باستخدام النظام الموحد
    const currentPrice = await getCurrentPriceWithFallback(symbol, marketType, requestId);
    
    // جلب المؤشرات بالتوازي مع تسجيل تفصيلي
    let indicators = {};
    
    try {
      // تسجيل بداية حساب المؤشرات (fire-and-forget)
      if (requestId) {
        void signalLogger.logTechnicalData(requestId, {
          analysisData: `بدء حساب المؤشرات الفنية للرمز ${symbol} - ${timeframe}`
        }).catch(err => console.warn('فشل في تسجيل بداية المؤشرات:', err));
      }
      
      const [rsi, macd, ema, bband, adx] = await Promise.all([
        getRSI(symbol, timeframe),
        getMACD(symbol, timeframe),
        getMovingAverages(symbol, timeframe),
        getBollingerBands(symbol, timeframe),
        getADX(symbol, timeframe)
      ]);
      
      // تجميع المؤشرات
      indicators = {
        rsi,
        macd,
        ema,
        bband,
        adx
      };
      
      // تسجيل تفصيلي لكل مؤشر (fire-and-forget)
      if (requestId) {
        void signalLogger.logTechnicalData(requestId, {
          indicators: JSON.stringify(indicators),
          analysisData: JSON.stringify({
            step: 'indicators_calculated_parallel',
            rsi: { value: rsi.value, signal: rsi.signal },
            macd: { value: macd.value, signal: macd.signal },
            ema: { value: ema.value, signal: ema.signal },
            bband: { value: bband.value, signal: bband.signal },
            adx: { value: adx.value, signal: adx.signal }
          })
        }).catch(err => console.warn('فشل في تسجيل المؤشرات المحسوبة:', err));
      }
    } catch (indicatorsError) {
      console.error('خطأ في جلب المؤشرات بالتوازي:', indicatorsError);
      
      // تسجيل فشل الحساب بالتوازي (fire-and-forget)
      if (requestId) {
        void signalLogger.logTechnicalData(requestId, {
          analysisData: `فشل الحساب بالتوازي، المحاولة الفردية: ${indicatorsError}`
        }).catch(err => console.warn('فشل في تسجيل فشل المؤشرات:', err));
      }
      
      // محاولة جلب كل مؤشر على حدة مع تسجيل منفصل
      const rsi = await getRSI(symbol, timeframe).catch(() => {
        // تسجيل فشل RSI (fire-and-forget)
        if (requestId) {
          void signalLogger.logTechnicalData(requestId, {
            analysisData: 'فشل حساب مؤشر RSI - استخدام القيمة الافتراضية 50'
          }).catch(err => console.warn('فشل في تسجيل فشل RSI:', err));
        }
        return { value: 50, signal: 'neutral', timeframe };
      });
      
      const macd = await getMACD(symbol, timeframe).catch(() => {
        // تسجيل فشل MACD (fire-and-forget)
        if (requestId) {
          void signalLogger.logTechnicalData(requestId, {
            analysisData: 'فشل حساب مؤشر MACD - استخدام القيمة الافتراضية 0'
          }).catch(err => console.warn('فشل في تسجيل فشل MACD:', err));
        }
        return { value: 0, signal: 'neutral', timeframe };
      });
      
      const ema = await getMovingAverages(symbol, timeframe).catch(() => {
        // تسجيل فشل EMA (fire-and-forget)
        if (requestId) {
          void signalLogger.logTechnicalData(requestId, {
            analysisData: 'فشل حساب المتوسطات المتحركة - استخدام القيمة الافتراضية 0'
          }).catch(err => console.warn('فشل في تسجيل فشل EMA:', err));
        }
        return { value: 0, signal: 'neutral', timeframe };
      });
      
      const bband = await getBollingerBands(symbol, timeframe).catch(() => {
        // تسجيل فشل Bollinger Bands (fire-and-forget)
        if (requestId) {
          void signalLogger.logTechnicalData(requestId, {
            analysisData: 'فشل حساب Bollinger Bands - استخدام القيمة الافتراضية 50'
          }).catch(err => console.warn('فشل في تسجيل فشل Bollinger:', err));
        }
        return { value: 50, signal: 'neutral', timeframe };
      });
      
      const adx = await getADX(symbol, timeframe).catch(() => {
        // تسجيل فشل ADX (fire-and-forget)
        if (requestId) {
          void signalLogger.logTechnicalData(requestId, {
            analysisData: 'فشل حساب مؤشر ADX - استخدام القيمة الافتراضية 15'
          }).catch(err => console.warn('فشل في تسجيل فشل ADX:', err));
        }
        return { value: 15, signal: 'neutral', timeframe };
      });
      
      indicators = { rsi, macd, ema, bband, adx };
      
      // تسجيل نجاح الحساب الفردي (fire-and-forget)
      if (requestId) {
        void signalLogger.logTechnicalData(requestId, {
          indicators: JSON.stringify(indicators),
          analysisData: JSON.stringify({
            step: 'indicators_calculated_individually',
            rsi: { value: rsi.value, signal: rsi.signal },
            macd: { value: macd.value, signal: macd.signal },
            ema: { value: ema.value, signal: ema.signal },
            bband: { value: bband.value, signal: bband.signal },
            adx: { value: adx.value, signal: adx.signal }
          })
        }).catch(err => console.warn('فشل في تسجيل المؤشرات الفردية:', err));
      }
    }
    
    // تحديد الوزن لكل مؤشر حسب نوع السوق والإطار الزمني
    const weights = getIndicatorWeights(marketType, timeframe);
    
    // تسجيل أوزان المؤشرات المحسوبة
    if (requestId) {
      void signalLogger.logTechnicalData(requestId, {
        analysisData: `تم حساب أوزان المؤشرات لنوع السوق ${marketType} والإطار الزمني ${timeframe}`,
        indicators: JSON.stringify({ weights, indicatorsData: indicators })
      }).catch(err => console.warn('فشل في تسجيل أوزان المؤشرات:', err));
    }
    
    // حساب النقاط لكل اتجاه مع تسجيل تفصيلي
    let buyPoints = 0;
    let sellPoints = 0;
    let totalWeight = 0;
    let pointsBreakdown: Record<string, { value: number; signal: string; weight: number; points: number }> = {};
    
    // جمع النقاط من المؤشرات
    for (const [indicator, data] of Object.entries(indicators)) {
      const weight = weights[indicator] || 1;
      totalWeight += weight;
      
      // التحقق من نوع البيانات وتوفر حقل signal
      const indicatorData = data as any;
      if (indicatorData && typeof indicatorData === 'object') {
        let points = 0;
        if (indicatorData.signal === 'buy') {
          buyPoints += weight;
          points = weight;
        } else if (indicatorData.signal === 'sell') {
          sellPoints += weight;
          points = -weight;
        }
        
        // تسجيل تفصيلي لمساهمة كل مؤشر
        pointsBreakdown[indicator] = {
          value: indicatorData.value,
          signal: indicatorData.signal,
          weight,
          points
        };
      }
    }
    
    // تسجيل حساب النقاط والأوزان (fire-and-forget)
    if (requestId) {
      void signalLogger.logTechnicalData(requestId, {
        analysisData: JSON.stringify({
          step: 'points_calculation',
          buyPoints,
          sellPoints,
          totalWeight,
          pointsBreakdown,
          weights
        })
      }).catch(err => console.warn('فشل في تسجيل حساب النقاط:', err));
    }
    
    // حساب قوة الإشارة (0-100)
    const strength = Math.max(
      (buyPoints / totalWeight) * 100,
      (sellPoints / totalWeight) * 100
    );
    
    // تحديد الاتجاه الغالب بشكل أكثر حسماً
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    
    // إذا كانت المؤشرات متوازنة تمامًا، نستخدم 'neutral'
    const pointsDifference = Math.abs(buyPoints - sellPoints);
    const pointsRatio = totalWeight > 0 ? pointsDifference / totalWeight : 0;
    
    // اتخاذ قرار أكثر حسماً حتى مع فروق بسيطة
    if (buyPoints > sellPoints) {
      trend = 'bullish';
    } else if (sellPoints > buyPoints) {
      trend = 'bearish';
    }
    
    // حساب قوة الاتجاه بناءً على الفرق النسبي
    // إذا كان الفرق كبيرًا، فهذا يعني اتجاه قوي
    const trendStrength = pointsRatio * 100; // القيمة من 0 إلى 100
    
    // تقييم الاحتمالية للإشارة (0-100) بطريقة موزونة أفضل
    let probability = 50; // محايد افتراضي
    
    if (trend === 'bullish') {
      // استخدام معادلة مُحسّنة للاحتمالية تعطي نتائج أكثر حسماً
      probability = 50 + (buyPoints - sellPoints) / totalWeight * 65;
    } else if (trend === 'bearish') {
      probability = 50 + (sellPoints - buyPoints) / totalWeight * 65;
    }
    
    // ضمان أن الاحتمالية لا تتجاوز الحدود المنطقية
    probability = Math.min(Math.max(probability, 0), 100);
    
    // تحديد الإشارة النهائية مع تسجيل مراحل اتخاذ القرار
    let signal: 'buy' | 'sell' | 'wait' = 'wait';
    
    // تحديد عتبات القرار حسب نوع السوق
    const thresholds = getSignalThresholds(marketType, timeframe);
    
    // تسجيل بيانات اتخاذ القرار (fire-and-forget)
    if (requestId) {
      void signalLogger.logTechnicalData(requestId, {
        analysisData: JSON.stringify({
          step: 'decision_making_data',
          trend,
          buyPoints,
          sellPoints,
          totalWeight,
          probability,
          thresholds,
          strength: Math.max((buyPoints / totalWeight) * 100, (sellPoints / totalWeight) * 100)
        })
      }).catch(err => console.warn('فشل في تسجيل بيانات اتخاذ القرار:', err));
    }
    
    // إضافة منطق أكثر تفصيلاً لاتخاذ القرار مع تسجيل كل خطوة
    if (trend === 'bullish') {
      if (probability >= thresholds.buy) {
        signal = 'buy';
        // تسجيل سبب قرار الشراء (fire-and-forget)
        if (requestId) {
          void signalLogger.logTechnicalData(requestId, {
            analysisData: JSON.stringify({
              step: 'final_decision',
              decision: 'buy',
              reason: `probability ${probability.toFixed(2)} >= threshold ${thresholds.buy}`,
              trend,
              rsi_value: (indicators as any).rsi?.value
            })
          }).catch(err => console.warn('فشل في تسجيل قرار الشراء:', err));
        }
      } else if (probability >= thresholds.buy - 5 && (indicators as any).rsi?.value > 55) {
        // إذا كان الاحتمال قريب من العتبة وقيمة RSI تدعم ذلك
        signal = 'buy';
        // تسجيل سبب قرار الشراء المشروط (fire-and-forget)
        if (requestId) {
          void signalLogger.logTechnicalData(requestId, {
            analysisData: JSON.stringify({
              step: 'final_decision',
              decision: 'conditional_buy',
              reason: `probability ${probability.toFixed(2)} near threshold and RSI ${(indicators as any).rsi?.value} > 55`,
              trend,
              rsi_value: (indicators as any).rsi?.value
            })
          }).catch(err => console.warn('فشل في تسجيل قرار الشراء المشروط:', err));
        }
      } else {
        // تسجيل سبب عدم الشراء (fire-and-forget)
        if (requestId) {
          void signalLogger.logTechnicalData(requestId, {
            analysisData: JSON.stringify({
              step: 'final_decision',
              decision: 'no_buy',
              reason: `bullish trend but probability ${probability.toFixed(2)} < threshold ${thresholds.buy}`,
              trend,
              rsi_value: (indicators as any).rsi?.value
            })
          }).catch(err => console.warn('فشل في تسجيل عدم الشراء:', err));
        }
      }
    } else if (trend === 'bearish') {
      if (probability >= thresholds.sell) {
        signal = 'sell';
        // تسجيل سبب قرار البيع (fire-and-forget)
        if (requestId) {
          void signalLogger.logTechnicalData(requestId, {
            analysisData: JSON.stringify({
              step: 'final_decision',
              decision: 'sell',
              reason: `probability ${probability.toFixed(2)} >= threshold ${thresholds.sell}`,
              trend,
              rsi_value: (indicators as any).rsi?.value
            })
          }).catch(err => console.warn('فشل في تسجيل قرار البيع:', err));
        }
      } else if (probability >= thresholds.sell - 5 && (indicators as any).rsi?.value < 45) {
        // إذا كان الاحتمال قريب من العتبة وقيمة RSI تدعم ذلك
        signal = 'sell';
        // تسجيل سبب قرار البيع المشروط (fire-and-forget)
        if (requestId) {
          void signalLogger.logTechnicalData(requestId, {
            analysisData: JSON.stringify({
              step: 'final_decision',
              decision: 'conditional_sell',
              reason: `probability ${probability.toFixed(2)} near threshold and RSI ${(indicators as any).rsi?.value} < 45`,
              trend,
              rsi_value: (indicators as any).rsi?.value
            })
          }).catch(err => console.warn('فشل في تسجيل قرار البيع المشروط:', err));
        }
      } else {
        // تسجيل سبب عدم البيع (fire-and-forget)
        if (requestId) {
          void signalLogger.logTechnicalData(requestId, {
            analysisData: JSON.stringify({
              step: 'final_decision',
              decision: 'no_sell',
              reason: `bearish trend but probability ${probability.toFixed(2)} < threshold ${thresholds.sell}`,
              trend,
              rsi_value: (indicators as any).rsi?.value
            })
          }).catch(err => console.warn('فشل في تسجيل عدم البيع:', err));
        }
      }
    } else {
      // تسجيل قرار الانتظار (fire-and-forget)
      if (requestId) {
        void signalLogger.logTechnicalData(requestId, {
          analysisData: JSON.stringify({
            step: 'final_decision',
            decision: 'wait',
            reason: `neutral trend with probability ${probability.toFixed(2)}`,
            trend,
            buyPoints,
            sellPoints
          })
        }).catch(err => console.warn('فشل في تسجيل قرار الانتظار:', err));
      }
    }
    
    // تسجيل قرار الإشارة للتصحيح
    console.log(`تم تحليل السوق بنجاح للرمز ${symbol}, الإشارة: ${signal}`);
    
    // حساب مستويات الدعم والمقاومة البسيطة
    const volatilityFactor = getVolatilityFactor(symbol, marketType);
    const support = currentPrice * (1 - volatilityFactor);
    const resistance = currentPrice * (1 + volatilityFactor);
    
    // تجهيز الوقت
    const now = new Date();
    const nextUpdateMinutes = getNextUpdateTime(timeframe);
    const nextUpdate = new Date(now.getTime() + nextUpdateMinutes * 60 * 1000);
    
    const analysisResult = {
      trend,
      strength,
      volatility: (indicators as any).adx.value, // استخدام قيمة ADX كمؤشر للتقلب
      support,
      resistance,
      indicators: indicators as any,
      lastUpdate: now.toISOString(),
      nextUpdate: nextUpdate.toISOString(),
      probability,
      signal,
      dataSource: 'real_time_api' // إعداد مصدر البيانات
    };
    
    // تسجيل نجاح التحليل
    if (requestId) {
      await signalLogger.logSignalSuccess(requestId, {
        signal,
        probability: probability.toFixed(2),
        currentPrice: currentPrice.toString(),
        priceSource: analysisResult.dataSource,
        analysisData: JSON.stringify({
          trend,
          strength,
          volatility: analysisResult.volatility,
          support,
          resistance,
          buyPoints,
          sellPoints,
          totalWeight
        }),
        indicators: JSON.stringify(indicators),
        cacheUsed: false
      });
    }
    
    return analysisResult;
  } catch (error) {
    console.error('خطأ في تحليل السوق:', error);
    
    // تسجيل الخطأ في نظام SignalLogger مع ضمان التنظيف
    if (requestId) {
      await signalLogger.logSignalError(requestId, {
        errorCode: 'ANALYSIS_FAILED',
        errorMessage: error instanceof Error ? error.message : String(error),
        analysisData: JSON.stringify({
          symbol,
          timeframe, 
          marketType,
          errorStep: 'تحليل السوق - خطأ عام',
          timestamp: new Date().toISOString()
        }),
        indicators: '{}'
      });
    }
    
    // استخدام النظام الموحد لمعالجة أخطاء تحليل السوق
    return handleMarketAnalysisError(error, `analyzeMarket for ${symbol} (${timeframe})`);
  } finally {
    // ضمان التنظيف في جميع الحالات
    if (requestId) {
      console.log(`[analyzeMarket] تم الانتهاء من معالجة الطلب: ${requestId}`);
    }
  }
}

// دالة مساعدة للحصول على سعر تقريبي للرمز عند فشل المصادر الأخرى
function getApproximatePrice(symbol: string, marketType: 'forex' | 'crypto' | 'stocks'): number {
  const approxPrices: Record<string, number> = {
    // أزواج الفوركس الرئيسية
    'EUR/USD': 1.0865,
    'GBP/USD': 1.3120,
    'USD/JPY': 151.55,
    'AUD/USD': 0.6540,
    'USD/CAD': 1.3650,
    'USD/CHF': 0.8980,
    'NZD/USD': 0.5990,
    'EUR/GBP': 0.8390,
    
    // العملات المشفرة
    'BTC/USDT': 86500.0,
    'ETH/USDT': 3450.0,
    'BNB/USDT': 570.0,
    'XRP/USDT': 0.57,
    'ADA/USDT': 0.45,
    'SOL/USDT': 165.0,
    'DOT/USDT': 7.2,
    
    // أسهم التكنولوجيا
    'AAPL': 172.0,
    'MSFT': 425.0,
    'GOOGL': 175.0,
    'AMZN': 182.0,
    'META': 485.0,
    'TSLA': 172.0,
    'NVDA': 950.0,
  };
  
  // محاولة العثور على السعر المطابق
  if (symbol in approxPrices) {
    return approxPrices[symbol];
  }
  
  // تطبيق تقديرات عامة بناءً على نوع السوق
  switch (marketType) {
    case 'forex':
      return symbol.includes('JPY') ? 135.0 : 1.15;
    case 'crypto':
      return 250.0;
    case 'stocks':
      return 150.0;
    default:
      return 100.0;
  }
}

// ================ دوال مساعدة إضافية ================

// تحديد توقيت التحديث التالي بالدقائق
function getNextUpdateTime(timeframe: string): number {
  switch (timeframe) {
    case '1M': return 1;
    case '5M': return 5;
    case '15M': return 15;
    case '1H': return 60;
    case '4H': return 240;
    case '1D': return 1440;
    default: return 60;
  }
}

// تحديد أوزان المؤشرات حسب نوع السوق والإطار الزمني
function getIndicatorWeights(marketType: 'forex' | 'crypto' | 'stocks', timeframe: string): Record<string, number> {
  // الأوزان الأساسية حسب نوع السوق
  const baseWeights: Record<string, Record<string, number>> = {
    forex: {
      rsi: 25,
      macd: 20,
      ema: 20,
      bband: 15,
      adx: 10
    },
    crypto: {
      rsi: 20,
      macd: 25,
      ema: 15,
      bband: 20,
      adx: 10
    },
    stocks: {
      rsi: 20,
      macd: 20,
      ema: 20,
      bband: 15,
      adx: 15
    }
  };
  
  // مضاعفات الإطار الزمني
  const timeframeMultipliers: Record<string, Record<string, number>> = {
    '1M': { rsi: 1.2, macd: 0.8, ema: 0.8, bband: 1.2, adx: 0.8 },
    '5M': { rsi: 1.1, macd: 0.9, ema: 0.9, bband: 1.1, adx: 0.9 },
    '15M': { rsi: 1.0, macd: 1.0, ema: 1.0, bband: 1.0, adx: 1.0 },
    '1H': { rsi: 0.9, macd: 1.1, ema: 1.1, bband: 0.9, adx: 1.1 },
    '4H': { rsi: 0.8, macd: 1.2, ema: 1.2, bband: 0.8, adx: 1.2 },
    '1D': { rsi: 0.7, macd: 1.3, ema: 1.3, bband: 0.7, adx: 1.3 }
  };
  
  // الوزن النهائي = الوزن الأساسي × مضاعف الإطار الزمني
  const weights: Record<string, number> = {};
  const multipliers = timeframeMultipliers[timeframe] || timeframeMultipliers['15M'];
  
  for (const indicator in baseWeights[marketType]) {
    weights[indicator] = baseWeights[marketType][indicator] * (multipliers[indicator] || 1);
  }
  
  return weights;
}

// تحديد عتبات الإشارة حسب نوع السوق والإطار الزمني
function getSignalThresholds(marketType: 'forex' | 'crypto' | 'stocks', timeframe: string): { buy: number, sell: number } {
  // القيم الافتراضية - تخفيض العتبات لزيادة الحسم في الإشارات
  let thresholds = { buy: 55, sell: 55 };
  
  // تعديل حسب نوع السوق
  if (marketType === 'crypto') {
    thresholds = { buy: 58, sell: 58 }; // أقل تشددًا للعملات المشفرة
  } else if (marketType === 'stocks') {
    thresholds = { buy: 56, sell: 56 }; // متوسط للأسهم
  }
  
  // تعديل حسب الإطار الزمني
  switch (timeframe) {
    case '1M':
    case '5M':
      // تقليل العتبة للإطارات القصيرة لزيادة عدد الإشارات
      thresholds.buy -= 2;
      thresholds.sell -= 2;
      break;
    case '15M':
      // لا تغيير للإطار المتوسط
      break;
    case '1H':
      // زيادة قليلة للإطار الساعي
      thresholds.buy += 2;
      thresholds.sell += 2;
      break;
    case '4H':
    case '1D':
      // زيادة العتبة للإطارات الطويلة للتأكد من دقتها
      thresholds.buy += 4;
      thresholds.sell += 4;
      break;
  }
  
  // ضمان أن العتبات لا تقل عن 50 ولا تزيد عن 70
  thresholds.buy = Math.min(Math.max(thresholds.buy, 50), 70);
  thresholds.sell = Math.min(Math.max(thresholds.sell, 50), 70);
  
  return thresholds;
}

// تحديد معامل التقلب حسب الزوج ونوع السوق
function getVolatilityFactor(symbol: string, marketType: 'forex' | 'crypto' | 'stocks'): number {
  // معاملات التقلب التقريبية للأزواج المختلفة
  const volatilityMap: Record<string, number> = {
    // فوركس
    'EUR/USD': 0.004,
    'GBP/USD': 0.006,
    'USD/JPY': 0.005,
    'AUD/USD': 0.007,
    'USD/CAD': 0.006,
    'USD/CHF': 0.005,
    // عملات مشفرة
    'BTC/USD': 0.025,
    'ETH/USD': 0.035,
    'BNB/USD': 0.040,
    'XRP/USD': 0.050,
    // أسهم
    'AAPL': 0.015,
    'MSFT': 0.014,
    'AMZN': 0.018,
    'GOOGL': 0.016,
    'TSLA': 0.025
  };
  
  // إذا كان الزوج موجود في القائمة
  if (symbol in volatilityMap) {
    return volatilityMap[symbol];
  }
  
  // الافتراضي حسب نوع السوق
  switch (marketType) {
    case 'forex': return 0.006;
    case 'crypto': return 0.040;
    case 'stocks': return 0.018;
    default: return 0.010;
  }
}