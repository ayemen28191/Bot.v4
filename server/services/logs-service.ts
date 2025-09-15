import { storage } from "../storage";
import { InsertSystemLog, SystemLog } from "@shared/schema";
import { notificationService, NotificationConfig } from "./notification-service";
import { Response } from "express";
import { LoggingContext } from "../middleware/logging-context";
import { getCurrentContext, RequestContext, formatRequestContext } from "../middleware/request-context";

// مدير السجلات مع إشعارات ذكية
class LogsService {
  private logBuffer: SystemLog[] = [];
  private bufferSize = 1000;
  private notificationConfigs: Map<string, NotificationConfig> = new Map();
  private newLogCallbacks: Array<(log: SystemLog) => void> = [];

  // تسجيل سجل جديد مع دعم السياق التلقائي من AsyncLocalStorage
  async log(logData: Omit<InsertSystemLog, 'timestamp'>, res?: Response): Promise<SystemLog> {
    // الحصول على السياق من AsyncLocalStorage أولاً، ثم من res.locals كـ fallback
    let context: RequestContext | LoggingContext | undefined;
    
    // محاولة الحصول على السياق من AsyncLocalStorage (النظام الجديد)
    const asyncContext = getCurrentContext();
    if (asyncContext) {
      context = asyncContext;
    } else if (res?.locals?.loggingContext) {
      // Fallback للنظام القديم
      context = res.locals.loggingContext;
    }
    
    // حساب معرف التتبع المركب
    const requestId = logData.requestId ?? context?.requestId;
    const sessionId = logData.sessionId ?? context?.sessionId;
    const combinedTrackingId = this.generateCombinedTrackingId(requestId, sessionId);

    const newLog: InsertSystemLog = {
      ...logData,
      // استخدام القيم من السياق كـ fallback إذا لم تكن موجودة في logData
      userId: logData.userId ?? context?.userId,
      username: logData.username ?? context?.username,
      userDisplayName: logData.userDisplayName ?? context?.userDisplayName,
      userAvatar: logData.userAvatar ?? (context?.username ? this.generateUserColor(context.username) : undefined),
      // إضافة معرفات التتبع من السياق
      requestId,
      sessionId,
      combinedTrackingId,
      // إضافة القيم الافتراضية للحقول التراكمية
      previousTotal: logData.previousTotal ?? null,
      dailyTotal: logData.dailyTotal ?? null,
      monthlyTotal: logData.monthlyTotal ?? null,
      // إضافة معلومات السياق الإضافية إلى meta إذا متوفرة
      meta: this.enrichMetaWithContext(logData.meta ?? undefined, context)
    };

    try {
      // حفظ في قاعدة البيانات
      const savedLog = await storage.createSystemLog(newLog);
      
      // إضافة للـ buffer للوصول السريع
      this.addToBuffer(savedLog);
      
      // فحص الإشعارات
      await this.checkNotifications(savedLog);
      
      // إشعار المستمعين بالسجل الجديد
      this.notifyNewLog(savedLog);
      
      console.log(`[LogsService] Logged: ${logData.level} - ${logData.source} - ${logData.message.slice(0, 100)}`);
      return savedLog;
    } catch (error) {
      console.error('[LogsService] Failed to save log:', error);
      // في حالة فشل حفظ قاعدة البيانات، احفظ في الـ buffer على الأقل
      const fallbackLog: SystemLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        level: newLog.level,
        source: newLog.source,
        message: newLog.message,
        meta: newLog.meta || null,
        // Request tracking fields - use newLog values which have proper fallback logic
        requestId: newLog.requestId || null,
        sessionId: newLog.sessionId || null,
        combinedTrackingId: newLog.combinedTrackingId || null,
        // New enhanced fields - use newLog values or null
        actorType: newLog.actorType || null,
        actorId: newLog.actorId || null,
        actorDisplayName: newLog.actorDisplayName || null,
        action: newLog.action || null,
        result: newLog.result || null,
        details: newLog.details || null,
        // Cumulative counter fields
        previousTotal: newLog.previousTotal || null,
        dailyTotal: newLog.dailyTotal || null,
        monthlyTotal: newLog.monthlyTotal || null,
        // Legacy fields for backward compatibility
        userId: newLog.userId || null,
        username: newLog.username || null,
        userDisplayName: newLog.userDisplayName || null,
        userAvatar: newLog.userAvatar || null
      };
      this.addToBuffer(fallbackLog);
      return fallbackLog;
    }
  }

  // إضافة للـ buffer مع إدارة الحجم
  private addToBuffer(log: SystemLog): void {
    this.logBuffer.push(log);
    if (this.logBuffer.length > this.bufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.bufferSize); // حافظ على آخر N سجل
    }
  }

  // إثراء المعطيات بمعلومات السياق - محدث لدعم RequestContext و LoggingContext
  private enrichMetaWithContext(existingMeta?: string, context?: RequestContext | LoggingContext): string | undefined {
    if (!context) {
      return existingMeta;
    }

    // استخراج المعلومات الأساسية من أي نوع من السياق
    const contextInfo = {
      requestId: context.requestId,
      sessionId: context.sessionId,
      clientIP: context.clientIP,
      userAgent: context.userAgent,
      timestamp: context.timestamp,
      // إضافة معلومات خاصة بـ RequestContext إذا كانت متوفرة
      ...(('route' in context) && {
        route: context.route,
        method: context.method,
        processingTime: context.startTime ? Date.now() - context.startTime : undefined
      })
    };

    if (!existingMeta) {
      return JSON.stringify(contextInfo);
    }

    try {
      const existingData = JSON.parse(existingMeta);
      const enrichedData = {
        ...existingData,
        context: contextInfo
      };
      return JSON.stringify(enrichedData);
    } catch (error) {
      // في حالة فشل parse، أضف السياق كـ string
      return JSON.stringify({
        originalMeta: existingMeta,
        context: contextInfo
      });
    }
  }

  // فحص الإشعارات عند تسجيل سجل جديد
  private async checkNotifications(log: SystemLog): Promise<void> {
    if (this.notificationConfigs.size === 0) {
      return; // لا توجد إعدادات إشعارات
    }

    for (const [configId, config] of Array.from(this.notificationConfigs.entries())) {
      try {
        await notificationService.sendNotification(config, configId, log.message, log.level);
      } catch (error) {
        console.error(`[LogsService] Notification failed for config ${configId}:`, error);
      }
    }
  }

  // تحديث إعدادات الإشعارات
  updateNotificationConfigs(configs: Map<string, NotificationConfig>): void {
    this.notificationConfigs = configs;
    console.log(`[LogsService] Updated notification configs: ${configs.size} active`);
  }

  // الحصول على السجلات من قاعدة البيانات مع فلترة
  async getLogs(filters: {
    since?: string;
    level?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }): Promise<SystemLog[]> {
    try {
      return await storage.getSystemLogs(filters);
    } catch (error) {
      console.error('[LogsService] Failed to get logs from database:', error);
      // في حالة فشل قاعدة البيانات، استخدم الـ buffer
      return this.getLogsFromBuffer(filters);
    }
  }

  // الحصول على السجلات من الـ buffer (fallback)
  private getLogsFromBuffer(filters: {
    since?: string;
    level?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }): SystemLog[] {
    let filtered = [...this.logBuffer];

    if (filters.since) {
      const sinceDate = new Date(filters.since);
      filtered = filtered.filter(log => new Date(log.timestamp) >= sinceDate);
    }

    if (filters.level) {
      filtered = filtered.filter(log => log.level === filters.level);
    }

    if (filters.source) {
      filtered = filtered.filter(log => log.source === filters.source);
    }

    // ترتيب حسب الوقت (الأحدث أولاً)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // تطبيق الـ pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    return filtered.slice(offset, offset + limit);
  }

  // الحصول على إحصائيات السجلات
  async getLogStats(): Promise<{
    total: number;
    levels: Record<string, number>;
    sources: Record<string, number>;
    recentErrors: SystemLog[];
  }> {
    try {
      const [total, levels, sources, recentErrors] = await Promise.all([
        storage.getLogsCount(),
        storage.getLogsCountByLevel(),
        storage.getLogsCountBySource(),
        storage.getSystemLogs({ level: 'error', limit: 10 })
      ]);

      return { total, levels, sources, recentErrors };
    } catch (error) {
      console.error('[LogsService] Failed to get log stats:', error);
      // fallback to buffer stats
      return this.getBufferStats();
    }
  }

  // إحصائيات من الـ buffer
  private getBufferStats(): {
    total: number;
    levels: Record<string, number>;
    sources: Record<string, number>;
    recentErrors: SystemLog[];
  } {
    const total = this.logBuffer.length;
    const levels: Record<string, number> = {};
    const sources: Record<string, number> = {};

    for (const log of this.logBuffer) {
      levels[log.level] = (levels[log.level] || 0) + 1;
      sources[log.source] = (sources[log.source] || 0) + 1;
    }

    const recentErrors = this.logBuffer
      .filter(log => log.level === 'error')
      .slice(-10)
      .reverse();

    return { total, levels, sources, recentErrors };
  }

  // الحصول على السجلات المباشرة للـ WebSocket
  getRecentLogs(limit: number = 50): SystemLog[] {
    return this.logBuffer.slice(-limit);
  }

  // مسح السجلات القديمة (للصيانة)
  async clearOldLogs(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const deletedCount = await storage.deleteOldSystemLogs(cutoffDate.toISOString());
      console.log(`[LogsService] Cleared ${deletedCount} logs older than ${daysOld} days`);
      return deletedCount;
    } catch (error) {
      console.error('[LogsService] Failed to clear old logs:', error);
      return 0;
    }
  }

  // مساعدات للتسجيل السريع مع دعم السياق التلقائي من AsyncLocalStorage
  // الآن لا حاجة لتمرير userId أو res - سيتم أخذهم من AsyncLocalStorage تلقائياً
  async logError(source: string, message: string, meta?: any, userId?: number, res?: Response): Promise<SystemLog> {
    return this.log({ level: 'error', source, message, meta: meta ? JSON.stringify(meta) : undefined, userId }, res);
  }

  async logWarn(source: string, message: string, meta?: any, userId?: number, res?: Response): Promise<SystemLog> {
    return this.log({ level: 'warn', source, message, meta: meta ? JSON.stringify(meta) : undefined, userId }, res);
  }

  async logInfo(source: string, message: string, meta?: any, userId?: number, res?: Response): Promise<SystemLog> {
    return this.log({ level: 'info', source, message, meta: meta ? JSON.stringify(meta) : undefined, userId }, res);
  }

  async logDebug(source: string, message: string, meta?: any, userId?: number, res?: Response): Promise<SystemLog> {
    return this.log({ level: 'debug', source, message, meta: meta ? JSON.stringify(meta) : undefined, userId }, res);
  }

  // دوال جديدة مبسطة تستخدم AsyncLocalStorage فقط (موصى بها للاستخدام الجديد)
  async error(source: string, message: string, meta?: any): Promise<SystemLog> {
    return this.log({ level: 'error', source, message, meta: meta ? JSON.stringify(meta) : undefined });
  }

  async warn(source: string, message: string, meta?: any): Promise<SystemLog> {
    return this.log({ level: 'warn', source, message, meta: meta ? JSON.stringify(meta) : undefined });
  }

  async info(source: string, message: string, meta?: any): Promise<SystemLog> {
    return this.log({ level: 'info', source, message, meta: meta ? JSON.stringify(meta) : undefined });
  }

  async debug(source: string, message: string, meta?: any): Promise<SystemLog> {
    return this.log({ level: 'debug', source, message, meta: meta ? JSON.stringify(meta) : undefined });
  }

  // دوال محسنة للتسجيل مع السياق التلقائي (overload للاستخدام مع Response فقط)
  async logErrorWithContext(source: string, message: string, res: Response, meta?: any): Promise<SystemLog> {
    return this.log({ level: 'error', source, message, meta: meta ? JSON.stringify(meta) : undefined }, res);
  }

  async logWarnWithContext(source: string, message: string, res: Response, meta?: any): Promise<SystemLog> {
    return this.log({ level: 'warn', source, message, meta: meta ? JSON.stringify(meta) : undefined }, res);
  }

  async logInfoWithContext(source: string, message: string, res: Response, meta?: any): Promise<SystemLog> {
    return this.log({ level: 'info', source, message, meta: meta ? JSON.stringify(meta) : undefined }, res);
  }

  async logDebugWithContext(source: string, message: string, res: Response, meta?: any): Promise<SystemLog> {
    return this.log({ level: 'debug', source, message, meta: meta ? JSON.stringify(meta) : undefined }, res);
  }

  // دوال محسنة لتسجيل السجلات مع بيانات المستخدم
  async logUserError(source: string, message: string, user: { id: number, username: string, displayName?: string }, meta?: any): Promise<SystemLog> {
    return this.log({ 
      level: 'error', 
      source, 
      message, 
      meta: meta ? JSON.stringify(meta) : undefined, 
      userId: user.id,
      username: user.username,
      userDisplayName: user.displayName || user.username,
      userAvatar: this.generateUserColor(user.username)
    });
  }

  async logUserInfo(source: string, message: string, user: { id: number, username: string, displayName?: string }, meta?: any): Promise<SystemLog> {
    return this.log({ 
      level: 'info', 
      source, 
      message, 
      meta: meta ? JSON.stringify(meta) : undefined, 
      userId: user.id,
      username: user.username,
      userDisplayName: user.displayName || user.username,
      userAvatar: this.generateUserColor(user.username)
    });
  }

  async logUserWarn(source: string, message: string, user: { id: number, username: string, displayName?: string }, meta?: any): Promise<SystemLog> {
    return this.log({ 
      level: 'warn', 
      source, 
      message, 
      meta: meta ? JSON.stringify(meta) : undefined, 
      userId: user.id,
      username: user.username,
      userDisplayName: user.displayName || user.username,
      userAvatar: this.generateUserColor(user.username)
    });
  }

  // دالة لتوليد معرف التتبع المركب مع حماية sessionId
  private generateCombinedTrackingId(requestId?: string | null, sessionId?: string | null): string | null {
    if (!requestId) {
      return null;
    }
    
    // إنشاء معرف مركب يجمع requestId مع hash مقطوع من sessionId لحماية الخصوصية
    if (sessionId && sessionId.trim() !== '') {
      // إنشاء hash مقطوع من sessionId (أول 8 أحرف من SHA-256)
      const crypto = require('crypto');
      const sessionHash = crypto.createHash('sha256').update(sessionId).digest('hex').substring(0, 8);
      return `${requestId}-${sessionHash}`;
    }
    
    return requestId;
  }

  // دالة لتوليد لون للمستخدم
  private generateUserColor(username: string): string {
    const colors = [
      'hsl(142, 76%, 36%)', // أخضر
      'hsl(221, 83%, 53%)', // أزرق
      'hsl(262, 83%, 58%)', // بنفسجي
      'hsl(346, 87%, 43%)', // أحمر
      'hsl(33, 100%, 50%)', // برتقالي
      'hsl(280, 100%, 70%)', // وردي
      'hsl(200, 100%, 50%)', // سماوي
      'hsl(120, 100%, 25%)', // أخضر داكن
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // إضافة مستمع للسجلات الجديدة (للـ WebSocket)
  onNewLog(callback: (log: SystemLog) => void): void {
    this.newLogCallbacks.push(callback);
  }

  // إزالة مستمع للسجلات الجديدة
  offNewLog(callback: (log: SystemLog) => void): void {
    const index = this.newLogCallbacks.indexOf(callback);
    if (index > -1) {
      this.newLogCallbacks.splice(index, 1);
    }
  }

  // إشعار جميع المستمعين بسجل جديد
  private notifyNewLog(log: SystemLog): void {
    this.newLogCallbacks.forEach(callback => {
      try {
        callback(log);
      } catch (error) {
        console.error('[LogsService] Error in new log callback:', error);
      }
    });
  }
}

// إنشاء instance واحد لاستخدامه في كل مكان
export const logsService = new LogsService();

// تصدير النوع
export type { SystemLog };