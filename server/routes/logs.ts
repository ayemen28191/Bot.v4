import express from "express";
import { z } from "zod";
import { storage } from "../storage";
import { logsService } from "../services/logs-service";
import { insertSystemLogSchema, insertNotificationSettingSchema } from "@shared/schema";

const router = express.Router();

// التأكد من أن المستخدم مُسجل الدخول
function isAuthenticated(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  return res.status(401).json({ error: 'يجب تسجيل الدخول للوصول إلى هذا المسار.' });
}

// التأكد من أن المستخدم هو مشرف
function isAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  return res.status(403).json({ error: 'غير مصرح بالوصول. المسار مخصص للمشرفين فقط.' });
}

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
router.get('/logs', isAdmin, async (req, res) => {
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
router.get('/logs/stats', isAdmin, async (req, res) => {
  try {
    const stats = await logsService.getLogStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({ error: 'فشل في جلب إحصائيات السجلات' });
  }
});

// إنشاء سجل جديد (للمشرفين فقط)
router.post('/logs', isAdmin, async (req, res) => {
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
router.delete('/logs/old', isAdmin, async (req, res) => {
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
router.get('/notifications', isAdmin, async (req, res) => {
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
router.get('/notifications/:id', isAdmin, async (req, res) => {
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
router.post('/notifications', isAdmin, async (req, res) => {
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
router.put('/notifications/:id', isAdmin, async (req, res) => {
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
router.delete('/notifications/:id', isAdmin, async (req, res) => {
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
router.post('/notifications/:id/test', isAdmin, async (req, res) => {
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
      threshold: setting.threshold,
      cooldownMinutes: setting.cooldownMinutes,
      isEnabled: setting.isEnabled
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