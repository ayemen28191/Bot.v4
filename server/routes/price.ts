import { Router } from 'express';
import { getCurrentPrice } from '../services/price-sources';
import { analyzeMarket } from '../services/technical-analysis';
import { storage } from '../storage';
import { getKeyFromDatabase } from '../env';
import { 
  createValidationError, 
  createNetworkError, 
  createError,
  ErrorCategory,
  ERROR_CODES,
  ERROR_MESSAGES
} from '@shared/error-types';
import { catchAsync } from '../middleware/global-error-handler';

const router = Router();

router.get('/api/current-price', catchAsync(async (req, res) => {
  const { symbol } = req.query;

  if (!symbol || typeof symbol !== 'string') {
    throw createValidationError(
      ERROR_CODES.VALIDATION_REQUIRED_FIELD,
      ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD.ar,
      'symbol',
      symbol
    );
  }

  console.log('طلب جديد للحصول على السعر:', symbol);

  const result = await getCurrentPrice(symbol);

  if (result.price !== null) {
    console.log('تم إرجاع السعر بنجاح:', result.price);
    return res.json({ price: result.price });
  }

  // إذا فشل في الحصول على السعر، ارم خطأ شبكة مناسب
  throw createNetworkError(
    ERROR_CODES.NETWORK_SERVICE_UNAVAILABLE,
    result.error || ERROR_MESSAGES.NETWORK.SERVICE_UNAVAILABLE.ar,
    'price-api'
  );
}));

// نقطة نهاية للتحليل الفني وإشارات التداول
router.get('/api/market-analysis', catchAsync(async (req, res) => {
  const { symbol, timeframe, marketType } = req.query;

  if (!symbol || typeof symbol !== 'string') {
    throw createValidationError(
      ERROR_CODES.VALIDATION_REQUIRED_FIELD,
      ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD.ar,
      'symbol',
      symbol
    );
  }

  if (!timeframe || typeof timeframe !== 'string' || 
      !['1M', '5M', '15M', '1H', '4H', '1D'].includes(timeframe)) {
    throw createValidationError(
      ERROR_CODES.VALIDATION_INVALID_FORMAT,
      'يجب تحديد إطار زمني صحيح (timeframe): 1M, 5M, 15M, 1H, 4H, 1D',
      'timeframe',
      timeframe
    );
  }

  if (!marketType || typeof marketType !== 'string' || 
      !['forex', 'crypto', 'stocks'].includes(marketType as string)) {
    throw createValidationError(
      ERROR_CODES.VALIDATION_INVALID_FORMAT,
      'يجب تحديد نوع سوق صحيح (marketType): forex, crypto, stocks',
      'marketType',
      marketType
    );
  }
  console.log(`طلب تحليل السوق للرمز: ${symbol}, الإطار الزمني: ${timeframe}, نوع السوق: ${marketType}`);

  // الحصول على السعر الحالي أولاً للاستخدام في التحليل
  let currentPrice = null;
  try {
    const priceResult = await getCurrentPrice(symbol);
    if (priceResult.price !== null) {
      currentPrice = priceResult.price;
      console.log(`تم الحصول على السعر الحالي للتحليل: ${currentPrice}`);
    }
  } catch (error) {
    const priceError = error as Error;
    console.warn(`تعذر الحصول على السعر الحالي للتحليل: ${priceError.message}`);
    // سنستمر بدون سعر حالي، وستستخدم دالة التحليل آلية بديلة
  }

  // التحقق من الوصول إلى الخدمة
  let hasApiAccess = false;
  try {
    // التحقق من ملاءمة مفاتيح API
    const keys = [
      { name: 'TWELVEDATA_API_KEY', envKey: 'env.TWELVEDATA_API_KEY' },
      { name: 'PRIMARY_API_KEY', envKey: 'env.PRIMARY_API_KEY' }
    ];
    
    for (const key of keys) {
      const apiKey = await getKeyFromDatabase(storage, key.name);
      if (apiKey && apiKey.length > 5) {
        hasApiAccess = true;
        break;
      }
    }
    
    if (!hasApiAccess) {
      console.warn('لم يتم العثور على مفاتيح API صالحة، سيتم استخدام البيانات المتاحة محليًا');
    }
  } catch (error) {
    const apiKeyError = error as Error;
    console.warn(`تعذر التحقق من مفاتيح API: ${apiKeyError.message}`);
  }

  // استخدام خدمة التحليل الفني للحصول على النتيجة
  const result = await analyzeMarket(
    symbol, 
    timeframe, 
    marketType as 'forex' | 'crypto' | 'stocks'
  );

  // تحسين بيانات النتيجة إذا توفر السعر الحالي
  if (currentPrice !== null) {
    // تحديث مستويات الدعم والمقاومة بناءً على السعر الحالي
    const volatilityFactor = result.volatility / 100 * 0.02; // مُعامل تقلب مناسب (0.2% إلى 2%)
    result.support = parseFloat((currentPrice * (1 - volatilityFactor)).toFixed(getPricePrecision(symbol)));
    result.resistance = parseFloat((currentPrice * (1 + volatilityFactor)).toFixed(getPricePrecision(symbol)));
  }

  // إضافة معلومات حول مصدر البيانات للشفافية
  result.dataSource = hasApiAccess ? "real_time_api" : "local_data";

  // سجل النتيجة وأعدها
  console.log(`تم تحليل السوق بنجاح للرمز ${symbol}, الإشارة: ${result.signal}`);
  return res.json(result);
}));

// دالة مساعدة للحصول على دقة عرض السعر المناسبة للرمز
function getPricePrecision(symbol: string): number {
  // تحديد عدد الأرقام العشرية المناسب لكل نوع من الأدوات المالية
  if (symbol.includes('/JPY') || symbol.includes('JPY/')) {
    return 3; // أزواج الين
  } else if (symbol.includes('BTC') || symbol.includes('ETH')) {
    return 2; // بيتكوين وإيثيريوم عادة بخانتين عشريتين
  } else if (
    symbol.includes('XRP') || 
    symbol.includes('ADA') || 
    symbol.includes('DOGE')
  ) {
    return 5; // العملات المشفرة منخفضة القيمة
  } else if (symbol.includes('/USD') || symbol.includes('USD/')) {
    return 5; // أزواج الفوركس مع الدولار
  } else if (symbol.includes('/')) {
    return 5; // أزواج فوركس أخرى
  } else {
    return 2; // أسهم وأدوات أخرى
  }
}

// نقطة نهاية للحصول على مؤشر فني محدد
router.get('/api/technical-indicator/:indicator', catchAsync(async (req, res) => {
  const { symbol, timeframe } = req.query;
  const { indicator } = req.params;

  if (!symbol || typeof symbol !== 'string') {
    throw createValidationError(
      ERROR_CODES.VALIDATION_REQUIRED_FIELD,
      ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD.ar,
      'symbol',
      symbol
    );
  }

  if (!timeframe || typeof timeframe !== 'string' || 
      !['1M', '5M', '15M', '1H', '4H', '1D'].includes(timeframe)) {
    throw createValidationError(
      ERROR_CODES.VALIDATION_INVALID_FORMAT,
      'يجب تحديد إطار زمني صحيح (timeframe): 1M, 5M, 15M, 1H, 4H, 1D',
      'timeframe',
      timeframe
    );
  }

  if (!indicator || !['rsi', 'macd', 'ema', 'bband', 'adx'].includes(indicator)) {
    throw createValidationError(
      ERROR_CODES.VALIDATION_INVALID_FORMAT,
      'يجب تحديد مؤشر صحيح: rsi, macd, ema, bband, adx',
      'indicator',
      indicator
    );
  }

  console.log(`طلب المؤشر الفني ${indicator} للرمز: ${symbol}, الإطار الزمني: ${timeframe}`);

  // الحصول على التحليل الكامل ثم استخراج المؤشر المطلوب فقط
  const marketType = determineMarketType(symbol);
  const analysis = await analyzeMarket(symbol, timeframe, marketType);
  
  if (analysis.indicators && analysis.indicators[indicator]) {
    return res.json({
      indicator: indicator,
      data: analysis.indicators[indicator],
      symbol,
      timeframe,
      lastUpdate: analysis.lastUpdate
    });
  }
  
  throw createError(
    ErrorCategory.BUSINESS_LOGIC,
    ERROR_CODES.BUSINESS_OPERATION_NOT_ALLOWED,
    `المؤشر ${indicator} غير متوفر`,
    { 
      messageAr: `المؤشر ${indicator} غير متوفر`,
      details: { indicator, symbol, timeframe }
    }
  );
}));

// دالة لتحديد نوع السوق من الرمز
function determineMarketType(symbol: string): 'forex' | 'crypto' | 'stocks' {
  // فحص الرموز المعروفة للعملات المشفرة
  const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'XRP', 'SOL', 'ADA', 'DOGE'];
  for (const crypto of cryptoSymbols) {
    if (symbol.includes(crypto)) {
      return 'crypto';
    }
  }
  
  // فحص أنماط الفوركس (زوج من العملات مفصول بشرطة)
  if (symbol.includes('/') && symbol.length <= 7) {
    return 'forex';
  }
  
  // الافتراضي هو الأسهم
  return 'stocks';
}

export default router;