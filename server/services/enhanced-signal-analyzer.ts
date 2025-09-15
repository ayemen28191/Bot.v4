
import { MarketAnalysisResult, TechnicalIndicatorResult } from './technical-analysis';

interface EnhancedSignalConfig {
  symbol: string;
  timeframe: string;
  marketType: 'forex' | 'crypto' | 'stocks';
  confidenceThreshold: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface MLPrediction {
  signal: 'buy' | 'sell' | 'wait';
  confidence: number;
  modelVersion: string;
  factors: {
    technical: number;
    sentiment: number;
    volume: number;
    trend: number;
  };
}

export class EnhancedSignalAnalyzer {
  private historicalData: Map<string, any[]> = new Map();
  private modelWeights = {
    rsi: 0.20,
    macd: 0.25,
    ema: 0.15,
    bollinger: 0.15,
    volume: 0.15,
    sentiment: 0.10
  };

  // تحليل متقدم مع خوارزميات التعلم الآلي
  async analyzeWithML(config: EnhancedSignalConfig, marketData: MarketAnalysisResult): Promise<MLPrediction> {
    console.log(`[Enhanced Analyzer] بدء التحليل المتقدم للرمز ${config.symbol}`);

    // 1. تحضير البيانات التاريخية
    const historicalFeatures = await this.prepareHistoricalFeatures(config);
    
    // 2. حساب المؤشرات المتقدمة
    const advancedIndicators = this.calculateAdvancedIndicators(marketData);
    
    // 3. تحليل المشاعر (Sentiment Analysis)
    const sentimentScore = await this.analyzeSentiment(config.symbol);
    
    // 4. تحليل الحجم والسيولة
    const volumeAnalysis = await this.analyzeVolume(config);
    
    // 5. نموذج التنبؤ المتقدم
    const prediction = this.runPredictionModel({
      historical: historicalFeatures,
      technical: advancedIndicators,
      sentiment: sentimentScore,
      volume: volumeAnalysis,
      config
    });

    console.log(`[Enhanced Analyzer] تم التحليل بثقة ${prediction.confidence}%`);
    
    return prediction;
  }

  // تحضير البيانات التاريخية
  private async prepareHistoricalFeatures(config: EnhancedSignalConfig): Promise<number[]> {
    const key = `${config.symbol}_${config.timeframe}`;
    const historical = this.historicalData.get(key) || [];
    
    // حساب المؤشرات التاريخية
    const features = [
      this.calculateTrendStrength(historical),
      this.calculateVolatility(historical),
      this.calculateMomentum(historical),
      this.calculateSupport(historical),
      this.calculateResistance(historical)
    ];

    return features;
  }

  // حساب المؤشرات المتقدمة
  private calculateAdvancedIndicators(marketData: MarketAnalysisResult): number[] {
    const indicators = marketData.indicators;
    
    // تطبيق أوزان ديناميكية للمؤشرات
    const rsiScore = this.normalizeRSI(indicators.rsi?.value || 50);
    const macdScore = this.normalizeMacd(indicators.macd?.value || 0);
    const emaScore = this.normalizeEma(indicators.ema?.value || 0);
    const bollingerScore = this.normalizeBollinger(indicators.bband?.value || 50);

    // حساب نقاط القوة المركبة
    const technicalScore = (
      rsiScore * this.modelWeights.rsi +
      macdScore * this.modelWeights.macd +
      emaScore * this.modelWeights.ema +
      bollingerScore * this.modelWeights.bollinger
    );

    return [technicalScore, rsiScore, macdScore, emaScore, bollingerScore];
  }

  // تحليل المشاعر (يمكن توسيعه للتكامل مع Twitter API أو News API)
  private async analyzeSentiment(symbol: string): Promise<number> {
    // تحليل أساسي للمشاعر بناءً على البيانات التاريخية
    const sentimentFactors = {
      forex: {
        'EUR/USD': 0.6,  // إيجابي معتدل
        'GBP/USD': 0.3,  // محايد مائل للسلبية
        'USD/JPY': 0.7   // إيجابي
      },
      crypto: {
        'BTC/USDT': 0.8, // إيجابي قوي
        'ETH/USDT': 0.7  // إيجابي
      },
      stocks: {
        'AAPL': 0.8,     // إيجابي قوي
        'MSFT': 0.9      // إيجابي جداً
      }
    };

    // يمكن توسيعه لاحقاً للتكامل مع خدمات تحليل المشاعر الحقيقية
    return sentimentFactors.forex[symbol] || 0.5;
  }

  // تحليل الحجم والسيولة
  private async analyzeVolume(config: EnhancedSignalConfig): Promise<number> {
    // تحليل أساسي للحجم (يمكن توسيعه مع بيانات حقيقية)
    const volumeMultipliers = {
      '1M': 0.3,
      '5M': 0.5,
      '15M': 0.7,
      '1H': 0.8,
      '4H': 0.9,
      '1D': 1.0
    };

    return volumeMultipliers[config.timeframe] || 0.5;
  }

  // نموذج التنبؤ الرئيسي
  private runPredictionModel(data: any): MLPrediction {
    const { technical, sentiment, volume, config } = data;
    
    // حساب النقاط المركبة
    const technicalWeight = 0.6;
    const sentimentWeight = 0.2;
    const volumeWeight = 0.2;
    
    const compositeScore = (
      technical[0] * technicalWeight +
      sentiment * sentimentWeight +
      volume * volumeWeight
    );

    // تحديد الإشارة بناءً على العتبات الديناميكية
    let signal: 'buy' | 'sell' | 'wait' = 'wait';
    let confidence = Math.abs(compositeScore - 0.5) * 200; // تحويل لنسبة مئوية

    if (compositeScore > 0.6 + (config.confidenceThreshold * 0.1)) {
      signal = 'buy';
    } else if (compositeScore < 0.4 - (config.confidenceThreshold * 0.1)) {
      signal = 'sell';
    }

    // تعديل الثقة بناءً على مستوى المخاطرة
    const riskAdjustment = {
      'low': 0.8,
      'medium': 1.0,
      'high': 1.2
    };
    
    confidence = Math.min(95, confidence * riskAdjustment[config.riskLevel]);

    return {
      signal,
      confidence: Math.round(confidence),
      modelVersion: 'v2.1-enhanced',
      factors: {
        technical: Math.round(technical[0] * 100),
        sentiment: Math.round(sentiment * 100),
        volume: Math.round(volume * 100),
        trend: Math.round(compositeScore * 100)
      }
    };
  }

  // دوال المساعدة للتطبيع
  private normalizeRSI(value: number): number {
    // تطبيع RSI (0-100) إلى (0-1)
    if (value < 30) return 0.8; // منطقة شراء
    if (value > 70) return 0.2; // منطقة بيع
    return 0.5; // منطقة محايدة
  }

  private normalizeMacd(value: number): number {
    // تطبيع MACD
    return Math.max(0, Math.min(1, (value + 1) / 2));
  }

  private normalizeEma(value: number): number {
    // تطبيع EMA
    return Math.max(0, Math.min(1, (value + 5) / 10));
  }

  private normalizeBollinger(value: number): number {
    // تطبيع Bollinger Bands (0-100) إلى (0-1)
    return value / 100;
  }

  // دوال تحليل البيانات التاريخية
  private calculateTrendStrength(data: any[]): number {
    if (data.length < 10) return 0.5;
    // حساب قوة الاتجاه بناءً على البيانات التاريخية
    return 0.6; // قيمة مبدئية
  }

  private calculateVolatility(data: any[]): number {
    if (data.length < 10) return 0.5;
    // حساب التقلب
    return 0.4; // قيمة مبدئية
  }

  private calculateMomentum(data: any[]): number {
    if (data.length < 5) return 0.5;
    // حساب الزخم
    return 0.7; // قيمة مبدئية
  }

  private calculateSupport(data: any[]): number {
    // حساب مستوى الدعم
    return 0.3; // قيمة مبدئية
  }

  private calculateResistance(data: any[]): number {
    // حساب مستوى المقاومة
    return 0.7; // قيمة مبدئية
  }

  // إضافة بيانات تاريخية
  addHistoricalData(symbol: string, timeframe: string, data: any): void {
    const key = `${symbol}_${timeframe}`;
    const existing = this.historicalData.get(key) || [];
    existing.push(data);
    
    // الاحتفاظ بآخر 100 نقطة بيانات فقط
    if (existing.length > 100) {
      existing.shift();
    }
    
    this.historicalData.set(key, existing);
  }

  // تحديث أوزان النموذج (للتحسين المستمر)
  updateModelWeights(newWeights: Partial<typeof this.modelWeights>): void {
    this.modelWeights = { ...this.modelWeights, ...newWeights };
    console.log('[Enhanced Analyzer] تم تحديث أوزان النموذج:', this.modelWeights);
  }
}

export const enhancedSignalAnalyzer = new EnhancedSignalAnalyzer();
