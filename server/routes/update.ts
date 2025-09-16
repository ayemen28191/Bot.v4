// مسار API للتحديثات
import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { logsService } from '../services/logs-service';
import { requireAdminAR } from '../middleware/auth-middleware';

export const updateRouter = express.Router();

// تحويل exec إلى وعد Promise
const execAsync = promisify(exec);


// الحصول على معلومات النظام
updateRouter.get('/system-info', async (req, res) => {
  try {
    const nodeVersion = process.version;
    const platform = process.platform;
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const lastUpdateInfo = {
      date: 'غير متوفر',
      version: 'غير متوفر'
    };
    
    // محاولة قراءة آخر تحديث من ملف
    try {
      const updateLogPath = path.join(process.cwd(), 'data', 'update.log');
      if (fs.existsSync(updateLogPath)) {
        const updateLog = fs.readFileSync(updateLogPath, 'utf8');
        const lastLine = updateLog.trim().split('\n').pop();
        if (lastLine) {
          const parts = lastLine.split('|');
          if (parts.length >= 2) {
            lastUpdateInfo.date = parts[0].trim();
            lastUpdateInfo.version = parts[1].trim();
          }
        }
      }
    } catch (error) {
      await logsService.logError('update', 'Error reading update log file', {
        action: 'update_log_read_error',
        error: error instanceof Error ? error.message : String(error),
        logPath: path.join(process.cwd(), 'data', 'update.log')
      });
    }
    
    res.json({
      nodeVersion,
      platform,
      memoryUsage: {
        rss: `${Math.round(memoryUsage.rss / (1024 * 1024))} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / (1024 * 1024))} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / (1024 * 1024))} MB`,
      },
      uptime: `${Math.round(uptime / 60)} دقيقة`,
      lastUpdate: lastUpdateInfo
    });
  } catch (error) {
    await logsService.logError('update', 'Error getting system information', {
      action: 'system_info_error',
      error: error instanceof Error ? error.message : String(error),
      clientIP: req.ip || 'unknown'
    });
    res.status(500).json({ message: 'حدث خطأ في الحصول على معلومات النظام' });
  }
});

// طلب تحديث النظام
updateRouter.post('/run-update', requireAdminAR, async (req, res) => {
  try {
    await logsService.logInfo('update', `System update initiated by admin: ${req.user!.username}`, {
      action: 'system_update_started',
      username: req.user!.username,
      userId: req.user!.id,
      clientIP: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });
    
    // سجل وقت بدء التحديث
    const updateStartTime = new Date().toISOString();
    const dataDir = path.join(process.cwd(), 'data');
    
    // تأكد من وجود مجلد البيانات
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // المسار إلى سكريبت التحديث
    const updateScriptPath = path.join(process.cwd(), 'update.sh');
    
    // التحقق مما إذا كان سكريبت التحديث موجوداً
    if (!fs.existsSync(updateScriptPath)) {
      // إنشاء سكريبت التحديث إذا لم يكن موجوداً
      const updateScript = `#!/bin/bash
echo "بدء عملية تحديث النظام..."
cd "$(dirname "$0")"

# حفظ النسخة الحالية
CURRENT_VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "النسخة الحالية: $CURRENT_VERSION"

# تحديث المستودع
echo "جاري تحديث المستودع..."
if [ -d ".git" ]; then
  git pull
  if [ $? -ne 0 ]; then
    echo "فشل في تحديث المستودع"
    exit 1
  fi
else
  echo "ليس مستودع git. تخطي مرحلة التحديث."
fi

# تثبيت الحزم المطلوبة
echo "جاري تثبيت الحزم المطلوبة..."
npm install
if [ $? -ne 0 ]; then
  echo "فشل في تثبيت الحزم"
  exit 1
fi

# إعادة بناء المشروع
echo "جاري إعادة بناء المشروع..."
npm run build
if [ $? -ne 0 ]; then
  echo "فشل في إعادة بناء المشروع"
  exit 1
fi

# تسجيل التحديث
NEW_VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "التحديث اكتمل بنجاح! النسخة الجديدة: $NEW_VERSION"

# تسجيل معلومات التحديث في ملف السجل
echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") | $NEW_VERSION | تم التحديث بنجاح" >> data/update.log

# إعادة تشغيل الخدمة (اختياري - استخدم طريقة إعادة التشغيل المناسبة لنظامك)
# pm2 restart all

exit 0
`;
      fs.writeFileSync(updateScriptPath, updateScript);
      fs.chmodSync(updateScriptPath, '755'); // تغيير صلاحيات الملف ليكون قابل للتنفيذ
    }
    
    // ابدأ عملية التحديث في العملية الخلفية
    const updateProcess = execAsync(`bash ${updateScriptPath}`);
    
    // سجل بداية عملية التحديث
    const updateLogEntry = `${updateStartTime} | بدأ عملية التحديث | بواسطة ${req.user?.username || 'غير معروف'}\n`;
    fs.appendFileSync(path.join(dataDir, 'update.log'), updateLogEntry);
    
    res.json({ 
      success: true, 
      message: 'بدأت عملية التحديث بنجاح. قد يستغرق التحديث بضع دقائق واحتياجه إعادة تشغيل الخادم.',
      updateStartTime
    });
    
    // معالجة نتيجة عملية التحديث
    try {
      const { stdout, stderr } = await updateProcess;
      await logsService.logInfo('update', `System update completed successfully by: ${req.user!.username}`, {
        action: 'system_update_success',
        username: req.user!.username,
        userId: req.user!.id,
        stdoutLength: stdout.length,
        hasStderr: !!stderr
      });
      
      if (stderr) {
        await logsService.logWarn('update', 'System update completed with warnings', {
          action: 'system_update_warnings',
          username: req.user!.username,
          stderrLength: stderr.length
        });
      }
      
      // سجل اكتمال عملية التحديث
      const updateCompleteEntry = `${new Date().toISOString()} | اكتملت عملية التحديث | stdout: ${stdout.substring(0, 100)}...\n`;
      fs.appendFileSync(path.join(dataDir, 'update.log'), updateCompleteEntry);
      
      // في حالة النجاح، يمكن هنا إعادة تشغيل الخادم (اختياري)
      // process.exit(0); // سيؤدي إلى إعادة تشغيل الخادم إذا كان يُدار بواسطة مدير عمليات مثل PM2
    } catch (error: any) {
      await logsService.logError('update', `System update failed for user: ${req.user!.username}`, {
        action: 'system_update_failed',
        username: req.user!.username,
        userId: req.user!.id,
        error: error.message || 'Unknown error'
      });
      
      // سجل فشل عملية التحديث
      const updateFailedEntry = `${new Date().toISOString()} | فشلت عملية التحديث | الخطأ: ${error.message || 'خطأ غير معروف'}\n`;
      fs.appendFileSync(path.join(dataDir, 'update.log'), updateFailedEntry);
    }
  } catch (error: any) {
    await logsService.logError('update', `Failed to start system update for user: ${req.user!.username}`, {
      action: 'system_update_start_failed',
      username: req.user!.username,
      userId: req.user!.id,
      error: error.message || 'Unknown error',
      clientIP: req.ip || 'unknown'
    });
    res.status(500).json({ 
      success: false, 
      message: `حدث خطأ في بدء عملية التحديث: ${error.message || 'خطأ غير معروف'}` 
    });
  }
});

// الحصول على سجل التحديثات
updateRouter.get('/logs', async (req, res) => {
  try {
    const updateLogPath = path.join(process.cwd(), 'data', 'update.log');
    
    if (!fs.existsSync(updateLogPath)) {
      return res.json({ logs: [] });
    }
    
    const logContent = fs.readFileSync(updateLogPath, 'utf8');
    const logLines = logContent.trim().split('\n').reverse();
    
    // تحويل السجلات إلى كائنات JSON
    const logs = logLines.map((line) => {
      const parts = line.split('|').map(part => part.trim());
      
      return {
        timestamp: parts[0] || 'غير معروف',
        version: parts[1] || 'غير معروف',
        message: parts[2] || 'غير معروف'
      };
    });
    
    res.json({ logs });
  } catch (error: any) {
    console.error('خطأ في قراءة سجل التحديثات:', error);
    res.status(500).json({ message: `حدث خطأ في قراءة سجل التحديثات: ${error.message || 'خطأ غير معروف'}` });
  }
});