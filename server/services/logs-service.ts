import { storage } from "../storage";
import { InsertSystemLog, SystemLog } from "@shared/schema";
import { notificationService, NotificationConfig } from "./notification-service";

// مدير السجلات مع إشعارات ذكية
class LogsService {
  private logBuffer: SystemLog[] = [];
  private bufferSize = 1000;
  private notificationConfigs: Map<string, NotificationConfig> = new Map();
  private newLogCallbacks: Array<(log: SystemLog) => void> = [];

  // تسجيل سجل جديد
  async log(logData: Omit<InsertSystemLog, 'timestamp'>): Promise<SystemLog> {
    const newLog: InsertSystemLog = {
      ...logData,
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
        userId: newLog.userId || null
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

  // مساعدات للتسجيل السريع
  async logError(source: string, message: string, meta?: any, userId?: number): Promise<SystemLog> {
    return this.log({ level: 'error', source, message, meta: meta ? JSON.stringify(meta) : undefined, userId });
  }

  async logWarn(source: string, message: string, meta?: any, userId?: number): Promise<SystemLog> {
    return this.log({ level: 'warn', source, message, meta: meta ? JSON.stringify(meta) : undefined, userId });
  }

  async logInfo(source: string, message: string, meta?: any, userId?: number): Promise<SystemLog> {
    return this.log({ level: 'info', source, message, meta: meta ? JSON.stringify(meta) : undefined, userId });
  }

  async logDebug(source: string, message: string, meta?: any, userId?: number): Promise<SystemLog> {
    return this.log({ level: 'debug', source, message, meta: meta ? JSON.stringify(meta) : undefined, userId });
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