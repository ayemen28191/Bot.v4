/**
 * خدمة الخريطة الحرارية لتحليل إشارات التداول
 * توفر بيانات منظمة لعرض مستويات الثقة في الإشارات عبر أزواج التداول المختلفة
 */

import { getCurrentPrice } from './price-sources';
import { analyzeMarket, MarketAnalysisResult } from './technical-analysis';
import { storage } from '../storage';

// نوع بيانات الخلية في الخريطة الحرارية
export interface HeatmapCell {
  symbol: string;
  timeframe: string;
  signal: 'UP' | 'DOWN' | 'WAIT';
  probability: number;
  strength?: number;
  timestamp: number;
  price?: number;
  analysis?: {
    trend: string;
    strength: number;
    volatility: number;
    support?: number;
    resistance?: number;
  };
}

// بنية بيانات الخريطة الحرارية
export interface HeatmapData {
  forex: HeatmapCell[];
  crypto: HeatmapCell[];
  stocks: HeatmapCell[];
  lastUpdate: number;
}

// العملات المتاحة
const availableSymbols = {
  forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'EUR/JPY', 'GBP/JPY'],
  crypto: ['BTC/USDT', 'ETH/USDT', 'XRP/USDT'],
  stocks: ['AAPL', 'MSFT', 'GOOGL', 'AMZN']
};

// الأطر الزمنية المتاحة
const timeframes = ['1M', '5M', '15M', '1H', '4H', '1D'];

// الذاكرة المؤقتة للبيانات
let heatmapCache: HeatmapData | null = null;
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

/**
 * تحويل إشارة التحليل إلى نوع إشارة الخريطة الحرارية
 */
function convertSignal(signal: 'buy' | 'sell' | 'wait'): 'UP' | 'DOWN' | 'WAIT' {
  if (signal === 'buy') return 'UP';
  if (signal === 'sell') return 'DOWN';
  return 'WAIT';
}

/**
 * الحصول على بيانات الخريطة الحرارية من قاعدة البيانات
 */
async function getStoredHeatmapData(): Promise<HeatmapData | null> {
  try {
    const configKey = await storage.getConfigKey('heatmap_data');
    if (configKey && configKey.value) {
      return JSON.parse(configKey.value);
    }
  } catch (error) {
    console.error('خطأ في استرجاع بيانات الخريطة الحرارية من قاعدة البيانات:', error);
  }
  return null;
}

/**
 * حفظ بيانات الخريطة الحرارية في قاعدة البيانات
 */
async function storeHeatmapData(data: HeatmapData): Promise<void> {
  try {
    await storage.setConfigKey(
      'heatmap_data',
      JSON.stringify(data),
      'بيانات الخريطة الحرارية للإشارات التداولية',
      false
    );
  } catch (error) {
    console.error('خطأ في حفظ بيانات الخريطة الحرارية في قاعدة البيانات:', error);
  }
}

/**
 * تحليل زوج تداول محدد وإطار زمني
 */
async function analyzeTradingPair(
  symbol: string,
  timeframe: string,
  marketType: 'forex' | 'crypto' | 'stocks'
): Promise<HeatmapCell> {
  try {
    // الحصول على السعر الحالي
    const priceResult = await getCurrentPrice(symbol);
    const currentPrice = priceResult.price;

    // تحليل السوق
    const analysisResult = await analyzeMarket(symbol, timeframe, marketType);

    // تحويل البيانات إلى تنسيق خلية الخريطة الحرارية
    return {
      symbol,
      timeframe,
      signal: convertSignal(analysisResult.signal),
      probability: analysisResult.probability,
      strength: analysisResult.strength,
      timestamp: Date.now(),
      price: currentPrice || undefined,
      analysis: {
        trend: analysisResult.trend,
        strength: analysisResult.strength,
        volatility: analysisResult.volatility,
        support: analysisResult.support === null ? undefined : analysisResult.support,
        resistance: analysisResult.resistance === null ? undefined : analysisResult.resistance
      }
    };
  } catch (error) {
    console.error(`خطأ في تحليل الزوج ${symbol} في الإطار الزمني ${timeframe}:`, error);
    
    // إرجاع بيانات افتراضية في حالة الخطأ
    return {
      symbol,
      timeframe,
      signal: 'WAIT',
      probability: 0,
      timestamp: Date.now()
    };
  }
}

/**
 * تحديث جزء محدد من الخريطة الحرارية (فوركس/عملات مشفرة/أسهم)
 */
async function updateMarketTypeData(marketType: 'forex' | 'crypto' | 'stocks'): Promise<HeatmapCell[]> {
  const symbols = availableSymbols[marketType];
  const results: HeatmapCell[] = [];

  // تحليل كل زوج مع إطاره الزمني
  for (const symbol of symbols) {
    // تحليل الإطارات الزمنية القصيرة فقط لتوفير الوقت والموارد
    for (const timeframe of timeframes.slice(0, 3)) {
      const cellData = await analyzeTradingPair(symbol, timeframe, marketType);
      results.push(cellData);
    }
  }

  return results;
}

/**
 * تحديث كامل بيانات الخريطة الحرارية
 */
export async function generateFullHeatmapData(): Promise<HeatmapData> {
  // التحقق مما إذا كانت هناك بيانات مخزنة مؤقتًا صالحة
  if (heatmapCache && Date.now() < cacheExpiry) {
    return heatmapCache;
  }

  // محاولة استرجاع البيانات من قاعدة البيانات
  const storedData = await getStoredHeatmapData();
  if (storedData && Date.now() - storedData.lastUpdate < CACHE_DURATION) {
    heatmapCache = storedData;
    cacheExpiry = storedData.lastUpdate + CACHE_DURATION;
    return storedData;
  }

  console.log('بدء تحديث بيانات الخريطة الحرارية...');

  // تحديث البيانات لكل نوع سوق
  const [forexData, cryptoData, stocksData] = await Promise.all([
    updateMarketTypeData('forex'),
    updateMarketTypeData('crypto'),
    updateMarketTypeData('stocks')
  ]);

  // تجميع البيانات
  const heatmapData: HeatmapData = {
    forex: forexData,
    crypto: cryptoData,
    stocks: stocksData,
    lastUpdate: Date.now()
  };

  // تخزين البيانات محليًا وفي قاعدة البيانات
  heatmapCache = heatmapData;
  cacheExpiry = Date.now() + CACHE_DURATION;
  await storeHeatmapData(heatmapData);

  console.log('تم تحديث بيانات الخريطة الحرارية بنجاح');
  return heatmapData;
}

/**
 * الحصول على بيانات الخريطة الحرارية
 * يستخدم البيانات المخزنة مؤقتًا إذا كانت متاحة، وإلا يقوم بتوليد بيانات جديدة
 */
export async function getHeatmapData(): Promise<HeatmapData> {
  // التحقق من وجود بيانات مخزنة مؤقتًا
  if (heatmapCache && Date.now() < cacheExpiry) {
    return heatmapCache;
  }

  // محاولة استرجاع البيانات من قاعدة البيانات
  const storedData = await getStoredHeatmapData();
  if (storedData) {
    heatmapCache = storedData;
    cacheExpiry = Date.now() + CACHE_DURATION;
    
    // بدء التحديث في الخلفية إذا كانت البيانات قديمة
    if (Date.now() - storedData.lastUpdate > CACHE_DURATION) {
      generateFullHeatmapData().catch(console.error);
    }
    
    return storedData;
  }

  // توليد بيانات جديدة إذا لم تكن هناك بيانات مخزنة
  return generateFullHeatmapData();
}

/**
 * الحصول على بيانات محددة من الخريطة الحرارية
 * مفيدة عندما نحتاج فقط جزء من البيانات
 */
export async function getFilteredHeatmapData(
  marketType?: 'forex' | 'crypto' | 'stocks',
  timeframe?: string,
  symbol?: string
): Promise<HeatmapCell[]> {
  const fullData = await getHeatmapData();
  
  let filteredData: HeatmapCell[] = [];
  
  // تحديد نوع السوق المطلوب تصفيته
  if (marketType) {
    filteredData = fullData[marketType];
  } else {
    filteredData = [...fullData.forex, ...fullData.crypto, ...fullData.stocks];
  }
  
  // تصفية حسب الإطار الزمني
  if (timeframe) {
    filteredData = filteredData.filter(cell => cell.timeframe === timeframe);
  }
  
  // تصفية حسب الرمز
  if (symbol) {
    filteredData = filteredData.filter(cell => cell.symbol === symbol);
  }
  
  return filteredData;
}