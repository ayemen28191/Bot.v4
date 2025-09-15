
import { signalLogger } from './signal-logger';

interface DataSource {
  id: string;
  name: string;
  type: 'primary' | 'secondary' | 'fallback';
  priority: number;
  healthScore: number;
  lastCheck: Date;
  rateLimitRemaining: number;
  rateLimitReset: Date;
  responseTime: number;
  errorRate: number;
  successCount: number;
  errorCount: number;
}

interface DataRequest {
  symbol: string;
  type: 'price' | 'indicators' | 'historical';
  timeframe?: string;
  requestId: string;
}

export class DataSourceManager {
  private sources: Map<string, DataSource> = new Map();
  private requestQueue: DataRequest[] = [];
  private isProcessing = false;

  constructor() {
    this.initializeDataSources();
    this.startHealthMonitoring();
    this.startQueueProcessor();
  }

  // تهيئة مصادر البيانات
  private initializeDataSources(): void {
    const dataSources: DataSource[] = [
      {
        id: 'twelvedata_primary',
        name: 'TwelveData Primary',
        type: 'primary',
        priority: 1,
        healthScore: 100,
        lastCheck: new Date(),
        rateLimitRemaining: 800,
        rateLimitReset: new Date(Date.now() + 24 * 60 * 60 * 1000),
        responseTime: 500,
        errorRate: 0,
        successCount: 0,
        errorCount: 0
      },
      {
        id: 'twelvedata_secondary',
        name: 'TwelveData Secondary Keys',
        type: 'secondary',
        priority: 2,
        healthScore: 95,
        lastCheck: new Date(),
        rateLimitRemaining: 600,
        rateLimitReset: new Date(Date.now() + 24 * 60 * 60 * 1000),
        responseTime: 600,
        errorRate: 5,
        successCount: 0,
        errorCount: 0
      },
      {
        id: 'binance_crypto',
        name: 'Binance Crypto Data',
        type: 'primary',
        priority: 1,
        healthScore: 98,
        lastCheck: new Date(),
        rateLimitRemaining: 1200,
        rateLimitReset: new Date(Date.now() + 60 * 60 * 1000),
        responseTime: 200,
        errorRate: 1,
        successCount: 0,
        errorCount: 0
      },
      {
        id: 'cached_data',
        name: 'Cached Data',
        type: 'fallback',
        priority: 10,
        healthScore: 80,
        lastCheck: new Date(),
        rateLimitRemaining: 9999,
        rateLimitReset: new Date(Date.now() + 24 * 60 * 60 * 1000),
        responseTime: 50,
        errorRate: 0,
        successCount: 0,
        errorCount: 0
      }
    ];

    dataSources.forEach(source => {
      this.sources.set(source.id, source);
    });

    console.log('[DataSourceManager] تم تهيئة', dataSources.length, 'مصادر بيانات');
  }

  // اختيار أفضل مصدر بيانات
  async getBestDataSource(request: DataRequest): Promise<DataSource | null> {
    const availableSources = Array.from(this.sources.values())
      .filter(source => {
        // فلترة المصادر حسب النوع
        if (request.type === 'price' && request.symbol.includes('BTC')) {
          return source.id.includes('binance') || source.id.includes('twelvedata');
        }
        if (request.type === 'indicators') {
          return source.id.includes('twelvedata');
        }
        return true;
      })
      .filter(source => {
        // فلترة المصادر الصحية
        return source.healthScore > 50 && 
               source.rateLimitRemaining > 0 &&
               source.errorRate < 50;
      })
      .sort((a, b) => {
        // ترتيب حسب الجودة المركبة
        const scoreA = this.calculateCompositeScore(a);
        const scoreB = this.calculateCompositeScore(b);
        return scoreB - scoreA;
      });

    if (availableSources.length === 0) {
      console.warn('[DataSourceManager] لا توجد مصادر بيانات متاحة للطلب:', request);
      await signalLogger.logTechnicalData(request.requestId, {
        analysisData: 'فشل في العثور على مصدر بيانات متاح'
      });
      return null;
    }

    const selectedSource = availableSources[0];
    console.log(`[DataSourceManager] تم اختيار المصدر: ${selectedSource.name} (نقاط: ${this.calculateCompositeScore(selectedSource)})`);
    
    return selectedSource;
  }

  // حساب النقاط المركبة للمصدر
  private calculateCompositeScore(source: DataSource): number {
    const healthWeight = 0.4;
    const speedWeight = 0.3;
    const reliabilityWeight = 0.2;
    const priorityWeight = 0.1;

    const healthScore = source.healthScore;
    const speedScore = Math.max(0, 100 - (source.responseTime / 10)); // كلما قل الوقت كان أفضل
    const reliabilityScore = Math.max(0, 100 - source.errorRate);
    const priorityScore = Math.max(0, 100 - (source.priority * 10)); // كلما قل الرقم كان أفضل

    return (
      healthScore * healthWeight +
      speedScore * speedWeight +
      reliabilityScore * reliabilityWeight +
      priorityScore * priorityWeight
    );
  }

  // تحديث إحصائيات المصدر
  updateSourceStats(sourceId: string, success: boolean, responseTime: number): void {
    const source = this.sources.get(sourceId);
    if (!source) return;

    if (success) {
      source.successCount++;
      source.responseTime = (source.responseTime + responseTime) / 2; // متوسط متحرك
      
      // تحسين النقاط عند النجاح
      source.healthScore = Math.min(100, source.healthScore + 1);
      source.errorRate = Math.max(0, source.errorRate - 0.5);
    } else {
      source.errorCount++;
      
      // تقليل النقاط عند الفشل
      source.healthScore = Math.max(0, source.healthScore - 5);
      source.errorRate = Math.min(100, source.errorRate + 2);
    }

    source.lastCheck = new Date();
    console.log(`[DataSourceManager] تحديث إحصائيات ${source.name}: نقاط=${source.healthScore}, أخطاء=${source.errorRate}%`);
  }

  // تحديث حدود الاستخدام
  updateRateLimit(sourceId: string, remaining: number, resetTime: Date): void {
    const source = this.sources.get(sourceId);
    if (!source) return;

    source.rateLimitRemaining = remaining;
    source.rateLimitReset = resetTime;

    if (remaining < 10) {
      console.warn(`[DataSourceManager] تحذير: مصدر ${source.name} اقترب من حد الاستخدام (${remaining} متبقي)`);
      source.healthScore = Math.max(20, source.healthScore - 20);
    }
  }

  // مراقبة صحة المصادر
  private startHealthMonitoring(): void {
    setInterval(async () => {
      console.log('[DataSourceManager] فحص صحة مصادر البيانات...');
      
      for (const [sourceId, source] of this.sources) {
        // فحص انتهاء حدود الاستخدام
        if (source.rateLimitReset <= new Date()) {
          source.rateLimitRemaining = 800; // إعادة تعيين افتراضية
          source.rateLimitReset = new Date(Date.now() + 24 * 60 * 60 * 1000);
          source.healthScore = Math.min(100, source.healthScore + 10);
          console.log(`[DataSourceManager] تم إعادة تعيين حدود الاستخدام لـ ${source.name}`);
        }

        // تحسين تدريجي للنقاط بمرور الوقت
        if (source.healthScore < 90) {
          source.healthScore = Math.min(100, source.healthScore + 0.5);
        }
      }
    }, 60000); // كل دقيقة
  }

  // معالج طابور الطلبات
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.requestQueue.length === 0) return;

      this.isProcessing = true;
      const request = this.requestQueue.shift();
      
      if (request) {
        await this.processRequest(request);
      }
      
      this.isProcessing = false;
    }, 100); // معالجة كل 100ms
  }

  // معالجة طلب واحد
  private async processRequest(request: DataRequest): Promise<void> {
    const source = await this.getBestDataSource(request);
    if (!source) return;

    const startTime = Date.now();
    
    try {
      // هنا يتم التكامل مع الطلب الفعلي
      console.log(`[DataSourceManager] معالجة طلب ${request.type} للرمز ${request.symbol} من ${source.name}`);
      
      // محاكاة طلب (سيتم استبداله بالطلب الحقيقي)
      await new Promise(resolve => setTimeout(resolve, source.responseTime));
      
      const responseTime = Date.now() - startTime;
      this.updateSourceStats(source.id, true, responseTime);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateSourceStats(source.id, false, responseTime);
      console.error(`[DataSourceManager] فشل في الطلب من ${source.name}:`, error);
    }
  }

  // إضافة طلب إلى الطابور
  addRequest(request: DataRequest): void {
    this.requestQueue.push(request);
    console.log(`[DataSourceManager] تم إضافة طلب إلى الطابور. العدد الحالي: ${this.requestQueue.length}`);
  }

  // الحصول على إحصائيات المصادر
  getSourcesStatus(): any[] {
    return Array.from(this.sources.values()).map(source => ({
      id: source.id,
      name: source.name,
      type: source.type,
      healthScore: source.healthScore,
      errorRate: source.errorRate,
      responseTime: source.responseTime,
      rateLimitRemaining: source.rateLimitRemaining,
      successCount: source.successCount,
      errorCount: source.errorCount,
      compositeScore: Math.round(this.calculateCompositeScore(source))
    }));
  }

  // تعطيل مصدر مؤقتاً
  disableSource(sourceId: string, duration: number = 300000): void { // 5 دقائق افتراضي
    const source = this.sources.get(sourceId);
    if (!source) return;

    source.healthScore = 0;
    console.log(`[DataSourceManager] تم تعطيل المصدر ${source.name} لمدة ${duration / 1000} ثانية`);

    setTimeout(() => {
      source.healthScore = 50; // إعادة تفعيل جزئي
      console.log(`[DataSourceManager] تم إعادة تفعيل المصدر ${source.name}`);
    }, duration);
  }
}

export const dataSourceManager = new DataSourceManager();
