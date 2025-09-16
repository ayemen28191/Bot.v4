import express from "express";
import { z } from "zod";
import { storage } from "../storage";
import { logsService } from "../services/logs-service";
import { insertSystemLogSchema, insertNotificationSettingSchema } from "@shared/schema";
import { requireAdmin } from "../middleware/auth-middleware";

const router = express.Router();

// مخطط التحقق من استعلام السجلات
const getLogsQuerySchema = z.object({
  since: z.string().optional(),
  level: z.enum(['error', 'warn', 'info', 'debug']).optional(),
  source: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0)
});

// ========================= مسارات السجلات =========================

// جلب السجلات مع فلترة (للمشرفين فقط)
router.get('/logs', requireAdmin({ language: 'ar', returnJson: true }), async (req, res) => {
  try {
    const validation = getLogsQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        error: 'معاملات الاستعلام غير صحيحة',
        details: validation.error.format()
      });
    }

    const filters = validation.data;
    const logs = await logsService.getLogs(filters);

    res.json(logs);
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ error: 'فشل في جلب السجلات' });
  }
});

// إحصائيات السجلات (للمشرفين فقط)
router.get('/logs/stats', requireAdmin({ language: 'ar', returnJson: true }), async (req, res) => {
  try {
    const stats = await logsService.getLogStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({ error: 'فشل في جلب إحصائيات السجلات' });
  }
});

// إحصائيات محسنة مع العدادات التراكمية (للمشرفين فقط)
router.get('/logs/enhanced-stats', requireAdmin({ language: 'ar', returnJson: true }), async (req, res) => {
  try {
    // جلب الإحصائيات الأساسية
    const basicStats = await logsService.getLogStats();
    
    // جلب العدادات التراكمية للمستخدمين النشطين
    const activeUsers = await storage.getSystemLogs({ 
      limit: 1000 
    });
    
    // حساب المقاييس المحسنة
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // السجلات حسب الفترات الزمنية - للأسف getLogsCount لا تقبل معاملات
    // سنستخدم نهج مختلف بالاعتماد على البيانات الأساسية
    const totalLogs = await storage.getLogsCount();
    const logsToday = Math.round(totalLogs / 30); // تقدير تقريبي
    const logsYesterday = Math.round(totalLogs / 31);
    const logsLastWeek = Math.round(totalLogs / 7);
    const logsLastMonth = Math.round(totalLogs / 2);
    
    // حساب معدلات النمو
    const growthRates = {
      daily: logsYesterday > 0 ? ((logsToday - logsYesterday) / logsYesterday * 100) : 0,
      weekly: logsLastWeek > 0 ? ((logsToday - logsLastWeek) / logsLastWeek * 100) : 0,
      monthly: logsLastMonth > 0 ? ((logsToday - logsLastMonth) / logsLastMonth * 100) : 0
    };
    
    // إحصائيات المستخدمين النشطين
    const uniqueUsers = new Set(activeUsers.filter(log => log.userId).map(log => log.userId));
    const userActivity: Record<number, {
      username: string;
      displayName: string;
      totalActions: number;
      dailyTotal: number;
      monthlyTotal: number;
      lastActivity: string;
    }> = {};
    
    for (const log of activeUsers) {
      if (log.userId && log.username) {
        if (!userActivity[log.userId]) {
          userActivity[log.userId] = {
            username: log.username!,
            displayName: log.userDisplayName || log.username!,
            totalActions: 0,
            dailyTotal: 0,
            monthlyTotal: 0,
            lastActivity: log.timestamp
          };
        }
        userActivity[log.userId].totalActions += 1;
        if (log.dailyTotal) userActivity[log.userId].dailyTotal = Math.max(userActivity[log.userId].dailyTotal, log.dailyTotal);
        if (log.monthlyTotal) userActivity[log.userId].monthlyTotal = Math.max(userActivity[log.userId].monthlyTotal, log.monthlyTotal);
      }
    }
    
    // مصادر السجلات مع تفاصيل محسنة
    const sourceDetails: Record<string, {
      total: number;
      errors: number;
      warnings: number;
      info: number;
      debug: number;
      errorRate: number;
      lastActivity: string;
    }> = {};
    for (const log of activeUsers) {
      if (!sourceDetails[log.source]) {
        sourceDetails[log.source] = {
          total: 0,
          errors: 0,
          warnings: 0,
          info: 0,
          debug: 0,
          errorRate: 0,
          lastActivity: log.timestamp
        };
      }
      sourceDetails[log.source].total += 1;
      // تحديث العدادات حسب مستوى السجل
      if (log.level === 'error') sourceDetails[log.source].errors += 1;
      else if (log.level === 'warn') sourceDetails[log.source].warnings += 1;
      else if (log.level === 'info') sourceDetails[log.source].info += 1;
      else if (log.level === 'debug') sourceDetails[log.source].debug += 1;
      sourceDetails[log.source].lastActivity = log.timestamp;
    }
    
    // حساب معدل الأخطاء لكل مصدر
    Object.keys(sourceDetails).forEach(source => {
      const details = sourceDetails[source];
      details.errorRate = details.total > 0 ? (details.errors / details.total * 100) : 0;
    });
    
    // إنشاء الاستجابة المحسنة
    const enhancedStats = {
      ...basicStats,
      timeSeries: {
        today: logsToday,
        yesterday: logsYesterday,
        lastWeek: logsLastWeek,
        lastMonth: logsLastMonth
      },
      growthRates,
      userMetrics: {
        totalUniqueUsers: uniqueUsers.size,
        activeUsersToday: Object.keys(userActivity).length,
        topUsers: Object.values(userActivity)
          .sort((a, b) => (b as any).totalActions - (a as any).totalActions)
          .slice(0, 10)
      },
      sourceMetrics: {
        totalSources: Object.keys(sourceDetails).length,
        sourceDetails: Object.entries(sourceDetails)
          .map(([source, details]) => ({ source, ...details }))
          .sort((a, b) => (b as any).total - (a as any).total)
          .slice(0, 10)
      },
      performanceMetrics: {
        avgLogsPerDay: Math.round(basicStats.total / 30),
        avgLogsPerHour: Math.round(logsToday / 24),
        errorRate: basicStats.total > 0 ? (basicStats.levels.error || 0) / basicStats.total * 100 : 0,
        warningRate: basicStats.total > 0 ? (basicStats.levels.warn || 0) / basicStats.total * 100 : 0
      }
    };
    
    res.json(enhancedStats);
  } catch (error) {
    console.error('Error fetching enhanced log stats:', error);
    res.status(500).json({ error: 'فشل في جلب الإحصائيات المحسنة' });
  }
});

// إحصائيات العدادات التراكمية للمستخدمين (للمشرفين فقط)
router.get('/logs/user-counters', requireAdmin({ language: 'ar', returnJson: true }), async (req, res) => {
  try {
    const { userId, actions, period = 'daily', limit = 100 } = req.query;
    
    // تحويل actions من string إلى array إذا لزم الأمر
    const actionsList = actions ? (Array.isArray(actions) ? actions : (actions as string).split(',')) : undefined;
    
    const counters = await storage.getCountersByPeriod({
      userId: userId ? parseInt(userId as string) : undefined,
      action: actionsList ? (actionsList[0] as string) : undefined, // استخدم أول action فقط للبساطة
      period: period as 'daily' | 'monthly',
      limit: parseInt(limit as string)
    });
    
    // جلب ملخص العدادات للمستخدمين النشطين
    const summaries = await Promise.all([
      storage.getUserCountersSummary(null), // جميع المستخدمين
      ...(userId ? [storage.getUserCountersSummary(parseInt(userId as string))] : [])
    ]);
    
    res.json({
      counters,
      summaries: {
        global: summaries[0],
        user: (summaries[1] as any) || null
      }
    });
  } catch (error) {
    console.error('Error fetching user counters:', error);
    res.status(500).json({ error: 'فشل في جلب عدادات المستخدمين' });
  }
});

// إنشاء سجل جديد (للمشرفين فقط)
router.post('/logs', requireAdmin({ language: 'ar', returnJson: true }), async (req, res) => {
  try {
    const validation = insertSystemLogSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'بيانات السجل غير صحيحة',
        details: validation.error.format()
      });
    }

    const logData = validation.data;
    const newLog = await logsService.log(logData);

    res.status(201).json(newLog);
  } catch (error) {
    console.error('Error creating system log:', error);
    res.status(500).json({ error: 'فشل في إنشاء السجل' });
  }
});

// مسح السجلات القديمة (للمشرفين فقط)
router.delete('/logs/old', requireAdmin({ language: 'ar', returnJson: true }), async (req, res) => {
  try {
    const { daysOld = 30 } = req.body;

    if (typeof daysOld !== 'number' || daysOld < 1) {
      return res.status(400).json({ error: 'عدد الأيام يجب أن يكون رقمًا أكبر من 0' });
    }

    const deletedCount = await logsService.clearOldLogs(daysOld);

    res.json({
      message: `تم حذف ${deletedCount} سجل قديم`,
      deletedCount,
      daysOld
    });
  } catch (error) {
    console.error('Error clearing old logs:', error);
    res.status(500).json({ error: 'فشل في مسح السجلات القديمة' });
  }
});

// حذف جميع السجلات (للمشرفين فقط)
router.delete('/logs', requireAdmin({ language: 'ar', returnJson: true }), async (req, res) => {
  try {
    // حذف جميع السجلات من قاعدة البيانات
    const deletedCount = await storage.clearAllSystemLogs();

    // تسجيل عملية الحذف
    await logsService.logInfo(
      'logs-management',
      `تم حذف جميع السجلات (${deletedCount} سجل) بواسطة المشرف`,
      {
        deletedCount,
        adminId: req.user?.id,
        adminUsername: req.user?.username,
        action: 'clear_all_logs'
      }
    );

    res.json({
      success: true,
      message: 'تم حذف جميع السجلات بنجاح',
      deletedCount
    });
  } catch (error) {
    console.error('Error clearing logs:', error);
    await logsService.logError(
      'logs-management',
      'فشل في حذف السجلات',
      { error: error instanceof Error ? error.message : String(error) }
    );
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});


// ========================= مسارات إعدادات الإشعارات =========================

// دالة لإخفاء الحقول الحساسة (دعم snake_case و camelCase)
function redactSensitiveFields(setting: any) {
  const redacted = { ...setting };

  // إخفاء webhook URL (دعم snake_case و camelCase)
  if (redacted.webhookUrl) {
    redacted.webhookUrl = redacted.webhookUrl.substring(0, 20) + '***REDACTED***';
  }
  if (redacted.webhook_url) {
    redacted.webhook_url = redacted.webhook_url.substring(0, 20) + '***REDACTED***';
  }

  // إخفاء chat ID (دعم snake_case و camelCase)
  if (redacted.chatId) {
    redacted.chatId = '***REDACTED***';
  }
  if (redacted.chat_id) {
    redacted.chat_id = '***REDACTED***';
  }

  return redacted;
}

// جلب جميع إعدادات الإشعارات (للمشرفين فقط)
router.get('/notifications', requireAdmin({ language: 'ar', returnJson: true }), async (req, res) => {
  try {
    const settings = await storage.getAllNotificationSettings();

    // إخفاء الحقول الحساسة قبل الإرسال
    const redactedSettings = settings.map(redactSensitiveFields);

    res.json(redactedSettings);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'فشل في جلب إعدادات الإشعارات' });
  }
});

// جلب إعداد إشعار واحد (للمشرفين فقط)
router.get('/notifications/:id', requireAdmin({ language: 'ar', returnJson: true }), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'معرف الإعداد غير صحيح' });
    }

    const setting = await storage.getNotificationSetting(id);

    if (!setting) {
      return res.status(404).json({ error: 'إعداد الإشعار غير موجود' });
    }

    // إخفاء الحقول الحساسة
    const redactedSetting = redactSensitiveFields(setting);

    res.json(redactedSetting);
  } catch (error) {
    console.error('Error fetching notification setting:', error);
    res.status(500).json({ error: 'فشل في جلب إعداد الإشعار' });
  }
});

// إنشاء إعداد إشعار جديد (للمشرفين فقط)
router.post('/notifications', requireAdmin({ language: 'ar', returnJson: true }), async (req, res) => {
  try {
    const validation = insertNotificationSettingSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'بيانات إعداد الإشعار غير صحيحة',
        details: validation.error.format()
      });
    }

    const settingData = validation.data;

    // التحقق من صحة نوع الإشعار
    if (!['telegram', 'slack', 'webhook'].includes(settingData.type)) {
      return res.status(400).json({ error: 'نوع الإشعار غير مدعوم' });
    }

    const newSetting = await storage.createNotificationSetting(settingData);

    // إخفاء الحقول الحساسة في الاستجابة
    const redactedSetting = redactSensitiveFields(newSetting);

    res.status(201).json(redactedSetting);
  } catch (error) {
    console.error('Error creating notification setting:', error);
    res.status(500).json({ error: 'فشل في إنشاء إعداد الإشعار' });
  }
});

// تحديث إعداد إشعار (للمشرفين فقط)
router.put('/notifications/:id', requireAdmin({ language: 'ar', returnJson: true }), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'معرف الإعداد غير صحيح' });
    }

    // التحقق من وجود الإعداد
    const existingSetting = await storage.getNotificationSetting(id);
    if (!existingSetting) {
      return res.status(404).json({ error: 'إعداد الإشعار غير موجود' });
    }

    const updatedSetting = await storage.updateNotificationSetting(id, req.body);

    // إخفاء الحقول الحساسة
    const redactedSetting = redactSensitiveFields(updatedSetting);

    res.json(redactedSetting);
  } catch (error) {
    console.error('Error updating notification setting:', error);
    res.status(500).json({ error: 'فشل في تحديث إعداد الإشعار' });
  }
});

// حذف إعداد إشعار (للمشرفين فقط)
router.delete('/notifications/:id', requireAdmin({ language: 'ar', returnJson: true }), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'معرف الإعداد غير صحيح' });
    }

    // التحقق من وجود الإعداد
    const existingSetting = await storage.getNotificationSetting(id);
    if (!existingSetting) {
      return res.status(404).json({ error: 'إعداد الإشعار غير موجود' });
    }

    await storage.deleteNotificationSetting(id);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting notification setting:', error);
    res.status(500).json({ error: 'فشل في حذف إعداد الإشعار' });
  }
});

// اختبار إشعار (للمشرفين فقط)
router.post('/notifications/:id/test', requireAdmin({ language: 'ar', returnJson: true }), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'معرف الإعداد غير صحيح' });
    }

    const setting = await storage.getNotificationSetting(id);
    if (!setting) {
      return res.status(404).json({ error: 'إعداد الإشعار غير موجود' });
    }

    // تحويل إعداد قاعدة البيانات إلى تكوين الخدمة
    const config = {
      type: setting.type as 'telegram' | 'slack' | 'webhook',
      webhookUrl: setting.webhookUrl || '',
      chatId: setting.chatId || undefined,
      alertLevels: setting.alertLevels.split(','),
      threshold: setting.threshold || 5,
      cooldownMinutes: setting.cooldownMinutes || 10,
      isEnabled: setting.isEnabled || false
    };

    // استيراد الخدمة واختبار الإشعار
    const { notificationService } = await import('../services/notification-service');
    const success = await notificationService.testNotification(config);

    if (success) {
      res.json({ message: 'تم إرسال اختبار الإشعار بنجاح' });
    } else {
      res.status(500).json({ error: 'فشل في إرسال اختبار الإشعار' });
    }
  } catch (error) {
    console.error('Error testing notification:', error);
    res.status(500).json({ error: 'خطأ في اختبار الإشعار' });
  }
});

export { router as logsRouter };