import { storage } from "../storage";
import { InsertSignalLog, SignalLog } from "@shared/schema";
import { logsService } from "./logs-service";

/**
 * ===================== وثائق الأمان والخصوصية - مهمة جداً =====================
 * 
 * تحذيرات أمنية مهمة:
 * 
 * 1. **API KEYS SECURITY**: 
 *    - لا تخزن أبداً قيم مفاتيح API الخام في قاعدة البيانات
 *    - استخدم معرفات المفاتيح من جدول config_keys فقط
 *    - الوظيفة safeApiKeyIds() تضمن عدم تسريب القيم الخام
 * 
 * 2. **PERSONAL DATA PRIVACY**:
 *    - requestIp, userAgent, sessionId هي بيانات شخصية حساسة
 *    - يجب الالتزام بقوانين الخصوصية (GDPR, CCPA)
 *    - تأكد من موافقة المستخدم قبل جمع هذه البيانات
 *    - قم بحذف البيانات القديمة بانتظام
 * 
 * 3. **DATABASE SECURITY**:
 *    - تم إضافة فهارس الأداء للحقول المهمة
 *    - استخدم الاستعلامات المُعاملة لمنع SQL Injection
 *    - قم بمراقبة الوصول لجدول signal_logs
 * 
 * 4. **LOGGING BEST PRACTICES**:
 *    - لا تسجل كلمات المرور أو المفاتيح السرية
 *    - استخدم التشفير للبيانات الحساسة
 *    - قم بمراجعة السجلات دورياً للتأكد من الأمان
 * 
 * ============================================================================
 */

// مدير سجلات الإشارات المالية مع buffer ذكي وإحصائيات متقدمة
class SignalLogger {
  private signalBuffer: SignalLog[] = [];
  private bufferSize = 500; // حجم أصغر للذاكرة المؤقتة مخصص للإشارات
  private newSignalCallbacks: Array<(signal: SignalLog) => void> = [];
  private activeRequests: Map<string, { startTime: number; data: Partial<InsertSignalLog> & { id?: number } }> = new Map();

  // ========================= تسجيل العمليات الأساسية =========================

  // بدء طلب إشارة جديد
  async startSignalRequest(requestData: {
    userId?: number;
    username?: string;
    symbol: string;
    marketType: string;
    timeframe: string;
    platform?: string;
    requestIp?: string;
    userAgent?: string;
    sessionId?: string;
    marketOpen?: boolean;
    offlineMode?: boolean;
  }): Promise<string> {
    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    // حفظ في الذاكرة المؤقتة للطلبات النشطة
    this.activeRequests.set(requestId, {
      startTime: Date.now(),
      data: {
        ...requestData,
        status: 'processing',
        requestedAt: now
      }
    });

    try {
      // إنشاء سجل أولي في قاعدة البيانات
      const logData: InsertSignalLog = {
        userId: requestData.userId || null,
        username: requestData.username || null,
        symbol: requestData.symbol,
        marketType: requestData.marketType,
        timeframe: requestData.timeframe,
        platform: requestData.platform || null,
        status: 'processing',
        requestIp: requestData.requestIp || null,
        userAgent: requestData.userAgent || null,
        sessionId: requestData.sessionId || null,
        marketOpen: requestData.marketOpen || null,
        offlineMode: requestData.offlineMode || false,
        requestedAt: now
      };

      const savedLog = await storage.createSignalLog(logData);
      
      // تحديث معرف قاعدة البيانات في الطلبات النشطة
      const activeRequest = this.activeRequests.get(requestId);
      if (activeRequest) {
        activeRequest.data.id = savedLog.id;
      }

      // إضافة للـ buffer
      this.addToBuffer(savedLog);
      
      // إشعار المستمعين
      this.notifyNewSignal(savedLog);
      
      // تسجيل في النظام
      await logsService.logInfo('signal-logger', `بدء طلب إشارة: ${requestData.symbol} (${requestData.timeframe})`, {
        requestId,
        symbol: requestData.symbol,
        marketType: requestData.marketType,
        platform: requestData.platform
      }, requestData.userId);

      console.log(`[SignalLogger] Started request: ${requestId} for ${requestData.symbol}`);
      return requestId;
    } catch (error) {
      console.error('[SignalLogger] Failed to start signal request:', error);
      // في حالة فشل قاعدة البيانات، احتفظ بالطلب في الذاكرة المؤقتة
      await logsService.logError('signal-logger', `فشل في بدء طلب الإشارة: ${error}`, { requestId }, requestData.userId);
      return requestId;
    }
  }

  // تسجيل نجاح الإشارة
  async logSignalSuccess(requestId: string, resultData: {
    signal: string;
    probability?: string;
    currentPrice?: string;
    priceSource?: string;
    analysisData?: string;
    indicators?: string;
    cacheUsed?: boolean;
  }): Promise<SignalLog | null> {
    const activeRequest = this.activeRequests.get(requestId);
    if (!activeRequest) {
      console.warn(`[SignalLogger] Request ${requestId} not found in active requests`);
      return null;
    }

    const executionTime = Date.now() - activeRequest.startTime;
    const completedAt = new Date().toISOString();

    try {
      const updates: Partial<InsertSignalLog> = {
        status: 'success',
        signal: resultData.signal,
        probability: resultData.probability,
        currentPrice: resultData.currentPrice,
        priceSource: resultData.priceSource,
        analysisData: resultData.analysisData,
        indicators: resultData.indicators,
        executionTime,
        cacheUsed: resultData.cacheUsed || false,
        completedAt
      };

      let updatedLog: SignalLog | null = null;

      // تحديث في قاعدة البيانات إذا كان لدينا معرف
      if (activeRequest.data.id) {
        updatedLog = await storage.updateSignalLog(activeRequest.data.id, updates);
        this.updateInBuffer(activeRequest.data.id, updatedLog);
      } else {
        // إنشاء سجل جديد إذا لم يكن موجوداً
        const fullLogData: InsertSignalLog = {
          userId: activeRequest.data.userId || null,
          username: activeRequest.data.username || null,
          symbol: activeRequest.data.symbol!,
          marketType: activeRequest.data.marketType!,
          timeframe: activeRequest.data.timeframe!,
          platform: activeRequest.data.platform || null,
          requestIp: activeRequest.data.requestIp || null,
          userAgent: activeRequest.data.userAgent || null,
          sessionId: activeRequest.data.sessionId || null,
          marketOpen: activeRequest.data.marketOpen || null,
          offlineMode: activeRequest.data.offlineMode || false,
          requestedAt: activeRequest.data.requestedAt!,
          status: activeRequest.data.status || 'processing',
          ...updates
        };
        updatedLog = await storage.createSignalLog(fullLogData);
        this.addToBuffer(updatedLog);
      }

      // إشعار المستمعين
      this.notifyNewSignal(updatedLog);
      
      // تسجيل في النظام
      await logsService.logInfo('signal-logger', `إشارة ناجحة: ${activeRequest.data.symbol} -> ${resultData.signal}`, {
        requestId,
        executionTime,
        signal: resultData.signal,
        probability: resultData.probability
      }, activeRequest.data.userId || undefined);

      // إزالة من الطلبات النشطة
      this.activeRequests.delete(requestId);

      console.log(`[SignalLogger] Success: ${requestId} -> ${resultData.signal} (${executionTime}ms)`);
      return updatedLog;
    } catch (error) {
      console.error('[SignalLogger] Failed to log signal success:', error);
      await logsService.logError('signal-logger', `فشل في تسجيل نجاح الإشارة: ${error}`, { requestId }, activeRequest.data.userId || undefined);
      return null;
    }
  }

  // تسجيل فشل الإشارة
  async logSignalError(requestId: string, errorData: {
    errorCode?: string;
    errorMessage: string;
    analysisData?: string;
    indicators?: string;
  }): Promise<SignalLog | null> {
    const activeRequest = this.activeRequests.get(requestId);
    if (!activeRequest) {
      console.warn(`[SignalLogger] Request ${requestId} not found in active requests`);
      return null;
    }

    const executionTime = Date.now() - activeRequest.startTime;
    const completedAt = new Date().toISOString();

    try {
      const updates: Partial<InsertSignalLog> = {
        status: 'failed',
        errorCode: errorData.errorCode,
        errorMessage: errorData.errorMessage,
        analysisData: errorData.analysisData,
        indicators: errorData.indicators,
        executionTime,
        completedAt
      };

      let updatedLog: SignalLog | null = null;

      // تحديث في قاعدة البيانات إذا كان لدينا معرف
      if (activeRequest.data.id) {
        updatedLog = await storage.updateSignalLog(activeRequest.data.id, updates);
        this.updateInBuffer(activeRequest.data.id, updatedLog);
      } else {
        // إنشاء سجل جديد إذا لم يكن موجوداً
        const fullLogData: InsertSignalLog = {
          userId: activeRequest.data.userId || null,
          username: activeRequest.data.username || null,
          symbol: activeRequest.data.symbol!,
          marketType: activeRequest.data.marketType!,
          timeframe: activeRequest.data.timeframe!,
          platform: activeRequest.data.platform || null,
          requestIp: activeRequest.data.requestIp || null,
          userAgent: activeRequest.data.userAgent || null,
          sessionId: activeRequest.data.sessionId || null,
          marketOpen: activeRequest.data.marketOpen || null,
          offlineMode: activeRequest.data.offlineMode || false,
          requestedAt: activeRequest.data.requestedAt!,
          status: activeRequest.data.status || 'processing',
          ...updates
        };
        updatedLog = await storage.createSignalLog(fullLogData);
        this.addToBuffer(updatedLog);
      }

      // إشعار المستمعين
      this.notifyNewSignal(updatedLog);
      
      // تسجيل في النظام
      await logsService.logError('signal-logger', `فشل في الإشارة: ${activeRequest.data.symbol} - ${errorData.errorMessage}`, {
        requestId,
        executionTime,
        errorCode: errorData.errorCode
      }, activeRequest.data.userId || undefined);

      // إزالة من الطلبات النشطة
      this.activeRequests.delete(requestId);

      console.log(`[SignalLogger] Error: ${requestId} -> ${errorData.errorMessage} (${executionTime}ms)`);
      return updatedLog;
    } catch (error) {
      console.error('[SignalLogger] Failed to log signal error:', error);
      await logsService.logError('signal-logger', `فشل في تسجيل خطأ الإشارة: ${error}`, { requestId }, activeRequest.data.userId || undefined);
      return null;
    }
  }

  // **SECURITY**: تحويل معرفات المفاتيح بدلاً من القيم الخام - حماية أمنية حرجة
  private safeApiKeyIds(apiKeysData?: string | number[] | any[]): string | undefined {
    if (!apiKeysData) return undefined;
    
    try {
      // إذا كانت البيانات عبارة عن string، حاول تحليلها بأمان
      if (typeof apiKeysData === 'string') {
        // إذا كانت تبدو كمعرفات (أرقام مفصولة بفواصل)
        if (/^[\d,\s]+$/.test(apiKeysData)) {
          return apiKeysData;
        }
        
        // محاولة تحليل JSON بحذر
        const parsed = JSON.parse(apiKeysData);
        if (Array.isArray(parsed)) {
          // استخراج معرفات المفاتيح فقط من المجموعة
          return parsed.map(item => {
            if (typeof item === 'number') return item;
            if (typeof item === 'object' && item.id) return item.id;
            if (typeof item === 'object' && item.keyId) return item.keyId;
            // إذا كان نوع غير متوقع، احمِ البيانات
            return 'masked';
          }).join(',');
        }
        
        // إذا كان JSON لكن ليس مجموعة، قم بإخفاء البيانات
        return 'masked_object';
      }
      
      // إذا كانت مجموعة من المعرفات مباشرة
      if (Array.isArray(apiKeysData)) {
        return apiKeysData.map(item => {
          if (typeof item === 'number') return item;
          if (typeof item === 'object' && item.id) return item.id;
          if (typeof item === 'object' && item.keyId) return item.keyId;
          return 'masked';
        }).join(',');
      }
      
      // في حالة عدم التعرف على النوع، أرجع قيمة آمنة
      return 'unknown_format';
    } catch (error) {
      console.warn('[SignalLogger] SECURITY: Failed to parse API keys data safely:', error);
      return 'parsing_error';
    }
  }

  // تسجيل البيانات التقنية فقط (تحديث جزئي)
  // **SECURITY WARNING**: apiKeysUsed يجب أن تحتوي على معرفات المفاتيح فقط، وليس القيم الخام
  async logTechnicalData(requestId: string, technicalData: {
    analysisData?: string;
    indicators?: string;
    currentPrice?: string;
    priceSource?: string;
    apiKeysUsed?: string | number[] | any[]; // **SECURITY**: يجب أن تكون معرفات المفاتيح فقط
  }): Promise<boolean> {
    const activeRequest = this.activeRequests.get(requestId);
    if (!activeRequest || !activeRequest.data.id) {
      console.warn(`[SignalLogger] Request ${requestId} not found or not saved yet`);
      return false;
    }

    try {
      // **SECURITY**: استخدام الطريقة الآمنة لمعالجة معرفات المفاتيح
      const safeApiKeyIds = this.safeApiKeyIds(technicalData.apiKeysUsed);
      
      const updates: Partial<InsertSignalLog> = {
        analysisData: technicalData.analysisData,
        indicators: technicalData.indicators,
        currentPrice: technicalData.currentPrice,
        priceSource: technicalData.priceSource,
        apiKeysUsed: safeApiKeyIds // **SECURITY**: تخزين معرفات المفاتيح المُعالجة بأمان فقط
      };

      const updatedLog = await storage.updateSignalLog(activeRequest.data.id, updates);
      this.updateInBuffer(activeRequest.data.id, updatedLog);

      console.log(`[SignalLogger] Technical data updated for ${requestId}`);
      return true;
    } catch (error) {
      console.error('[SignalLogger] Failed to log technical data:', error);
      return false;
    }
  }

  // ========================= إدارة الذاكرة المؤقتة =========================

  private addToBuffer(signal: SignalLog): void {
    this.signalBuffer.push(signal);
    if (this.signalBuffer.length > this.bufferSize) {
      this.signalBuffer = this.signalBuffer.slice(-this.bufferSize);
    }
  }

  private updateInBuffer(id: number, updatedSignal: SignalLog): void {
    const index = this.signalBuffer.findIndex(s => s.id === id);
    if (index !== -1) {
      this.signalBuffer[index] = updatedSignal;
    } else {
      this.addToBuffer(updatedSignal);
    }
  }

  // ========================= الاستعلامات والإحصائيات =========================

  // الحصول على سجلات الإشارات مع فلترة
  async getSignalLogs(filters: {
    since?: string;
    status?: string;
    symbol?: string;
    marketType?: string;
    userId?: number;
    platform?: string;
    limit?: number;
    offset?: number;
  }): Promise<SignalLog[]> {
    try {
      return await storage.getSignalLogs(filters);
    } catch (error) {
      console.error('[SignalLogger] Failed to get signal logs from database:', error);
      // استخدام الـ buffer كـ fallback
      return this.getSignalsFromBuffer(filters);
    }
  }

  // الحصول على إحصائيات مفصلة
  async getSignalStats(): Promise<{
    total: number;
    statusCounts: Record<string, number>;
    symbolCounts: Record<string, number>;
    platformCounts: Record<string, number>;
    recentErrors: SignalLog[];
    averageExecutionTime: number;
    successRate: number;
    activeRequests: number;
  }> {
    try {
      const stats = await storage.getSignalLogStats();
      const successRate = stats.total > 0 ? ((stats.statusCounts.success || 0) / stats.total) * 100 : 0;
      
      return {
        ...stats,
        successRate: Math.round(successRate * 100) / 100, // تقريب لرقمين عشريين
        activeRequests: this.activeRequests.size
      };
    } catch (error) {
      console.error('[SignalLogger] Failed to get signal stats:', error);
      return this.getBufferStats();
    }
  }

  // إحصائيات تفصيلية حسب الفترة الزمنية
  async getSignalStatsByTimeframe(): Promise<Record<string, {
    count: number;
    successRate: number;
    avgExecutionTime: number;
  }>> {
    try {
      const allSignals = await storage.getSignalLogs({ limit: 1000 });
      const timeframeStats: Record<string, { total: number; success: number; totalTime: number; timeCount: number }> = {};

      for (const signal of allSignals) {
        if (!timeframeStats[signal.timeframe]) {
          timeframeStats[signal.timeframe] = { total: 0, success: 0, totalTime: 0, timeCount: 0 };
        }

        timeframeStats[signal.timeframe].total++;
        if (signal.status === 'success') {
          timeframeStats[signal.timeframe].success++;
        }
        if (signal.executionTime) {
          timeframeStats[signal.timeframe].totalTime += signal.executionTime;
          timeframeStats[signal.timeframe].timeCount++;
        }
      }

      const result: Record<string, { count: number; successRate: number; avgExecutionTime: number }> = {};
      for (const [timeframe, stats] of Object.entries(timeframeStats)) {
        result[timeframe] = {
          count: stats.total,
          successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
          avgExecutionTime: stats.timeCount > 0 ? stats.totalTime / stats.timeCount : 0
        };
      }

      return result;
    } catch (error) {
      console.error('[SignalLogger] Failed to get timeframe stats:', error);
      return {};
    }
  }

  // الحصول على السجلات من الـ buffer (fallback)
  private getSignalsFromBuffer(filters: {
    since?: string;
    status?: string;
    symbol?: string;
    marketType?: string;
    userId?: number;
    platform?: string;
    limit?: number;
    offset?: number;
  }): SignalLog[] {
    let filtered = [...this.signalBuffer];

    if (filters.since) {
      const sinceDate = new Date(filters.since);
      filtered = filtered.filter(signal => new Date(signal.requestedAt) >= sinceDate);
    }

    if (filters.status) {
      filtered = filtered.filter(signal => signal.status === filters.status);
    }

    if (filters.symbol) {
      filtered = filtered.filter(signal => signal.symbol === filters.symbol);
    }

    if (filters.marketType) {
      filtered = filtered.filter(signal => signal.marketType === filters.marketType);
    }

    if (filters.userId) {
      filtered = filtered.filter(signal => signal.userId === filters.userId);
    }

    if (filters.platform) {
      filtered = filtered.filter(signal => signal.platform === filters.platform);
    }

    // ترتيب حسب الوقت (الأحدث أولاً)
    filtered.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

    // تطبيق الـ pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    return filtered.slice(offset, offset + limit);
  }

  // إحصائيات من الـ buffer
  private getBufferStats(): {
    total: number;
    statusCounts: Record<string, number>;
    symbolCounts: Record<string, number>;
    platformCounts: Record<string, number>;
    recentErrors: SignalLog[];
    averageExecutionTime: number;
    successRate: number;
    activeRequests: number;
  } {
    const total = this.signalBuffer.length;
    const statusCounts: Record<string, number> = {};
    const symbolCounts: Record<string, number> = {};
    const platformCounts: Record<string, number> = {};
    let totalExecutionTime = 0;
    let executionTimeCount = 0;

    for (const signal of this.signalBuffer) {
      statusCounts[signal.status] = (statusCounts[signal.status] || 0) + 1;
      symbolCounts[signal.symbol] = (symbolCounts[signal.symbol] || 0) + 1;
      if (signal.platform) {
        platformCounts[signal.platform] = (platformCounts[signal.platform] || 0) + 1;
      }
      if (signal.executionTime) {
        totalExecutionTime += signal.executionTime;
        executionTimeCount++;
      }
    }

    const recentErrors = this.signalBuffer
      .filter(signal => signal.status === 'failed')
      .slice(-10)
      .reverse();

    const successRate = total > 0 ? ((statusCounts.success || 0) / total) * 100 : 0;
    const averageExecutionTime = executionTimeCount > 0 ? totalExecutionTime / executionTimeCount : 0;

    return {
      total,
      statusCounts,
      symbolCounts,
      platformCounts,
      recentErrors,
      averageExecutionTime,
      successRate: Math.round(successRate * 100) / 100,
      activeRequests: this.activeRequests.size
    };
  }

  // ========================= المساعدات والصيانة =========================

  // الحصول على السجلات الحديثة للـ WebSocket
  getRecentSignals(limit: number = 20): SignalLog[] {
    return this.signalBuffer.slice(-limit);
  }

  // الحصول على الطلبات النشطة
  getActiveRequests(): Array<{ requestId: string; duration: number; data: Partial<InsertSignalLog> & { id?: number } }> {
    const now = Date.now();
    const activeRequestsArray: Array<{ requestId: string; duration: number; data: Partial<InsertSignalLog> & { id?: number } }> = [];
    
    this.activeRequests.forEach((request, requestId) => {
      activeRequestsArray.push({
        requestId,
        duration: now - request.startTime,
        data: request.data
      });
    });
    
    return activeRequestsArray;
  }

  // إلغاء طلب نشط (timeout)
  async cancelActiveRequest(requestId: string, reason: string = 'timeout'): Promise<boolean> {
    const activeRequest = this.activeRequests.get(requestId);
    if (!activeRequest) {
      return false;
    }

    try {
      await this.logSignalError(requestId, {
        errorCode: 'TIMEOUT',
        errorMessage: `Request cancelled: ${reason}`
      });
      
      console.log(`[SignalLogger] Cancelled request: ${requestId} (${reason})`);
      return true;
    } catch (error) {
      console.error('[SignalLogger] Failed to cancel request:', error);
      this.activeRequests.delete(requestId); // إزالة على الأقل من الذاكرة
      return false;
    }
  }

  // مسح السجلات القديمة
  async clearOldSignals(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const deletedCount = await storage.deleteOldSignalLogs(cutoffDate.toISOString());
      console.log(`[SignalLogger] Cleared ${deletedCount} signal logs older than ${daysOld} days`);
      return deletedCount;
    } catch (error) {
      console.error('[SignalLogger] Failed to clear old signals:', error);
      return 0;
    }
  }

  // تنظيف الطلبات النشطة المعلقة (أكثر من ساعة)
  cleanupStaleRequests(): number {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    let cleaned = 0;
    const staleRequestIds: string[] = [];

    // جمع معرفات الطلبات المعلقة
    this.activeRequests.forEach((request, requestId) => {
      if (now - request.startTime > oneHour) {
        staleRequestIds.push(requestId);
      }
    });

    // إلغاء الطلبات المعلقة
    for (const requestId of staleRequestIds) {
      this.cancelActiveRequest(requestId, 'stale request cleanup');
      cleaned++;
    }

    if (cleaned > 0) {
      console.log(`[SignalLogger] Cleaned up ${cleaned} stale requests`);
    }

    return cleaned;
  }

  // ========================= WebSocket Support =========================

  // إضافة مستمع للإشارات الجديدة
  onNewSignal(callback: (signal: SignalLog) => void): void {
    this.newSignalCallbacks.push(callback);
  }

  // إزالة مستمع للإشارات الجديدة
  offNewSignal(callback: (signal: SignalLog) => void): void {
    const index = this.newSignalCallbacks.indexOf(callback);
    if (index > -1) {
      this.newSignalCallbacks.splice(index, 1);
    }
  }

  // إشعار جميع المستمعين بإشارة جديدة
  private notifyNewSignal(signal: SignalLog): void {
    this.newSignalCallbacks.forEach(callback => {
      try {
        callback(signal);
      } catch (error) {
        console.error('[SignalLogger] Error in new signal callback:', error);
      }
    });
  }
}

// إنشاء instance واحد لاستخدامه في كل مكان
export const signalLogger = new SignalLogger();

// تصدير النوع
export type { SignalLog };

// تشغيل تنظيف دوري للطلبات المعلقة (كل 30 دقيقة)
setInterval(() => {
  signalLogger.cleanupStaleRequests();
}, 30 * 60 * 1000);