import { z } from "zod";

// تكوين الإشعارات
interface NotificationConfig {
  type: 'telegram' | 'slack' | 'webhook';
  webhookUrl: string;
  chatId?: string; // للـ Telegram
  alertLevels: string[];
  threshold: number;
  cooldownMinutes: number;
  isEnabled: boolean;
}

// حالة الإشعارات (ذاكرة مؤقتة لتجنب الازدحام)
interface AlertState {
  lastNotification: Date;
  errorCount: number;
  lastErrorTypes: Map<string, number>;
}

class NotificationService {
  private alertStates = new Map<string, AlertState>();

  // إرسال إشعار Telegram
  async sendTelegramNotification(config: NotificationConfig, message: string, level: string): Promise<boolean> {
    if (!config.webhookUrl || !config.chatId) {
      console.error('[NotificationService] Telegram config incomplete');
      return false;
    }

    try {
      const telegramMessage = `🤖 *Bot.v4 Alert*\n\n🔥 *Level:* ${level.toUpperCase()}\n📄 *Message:* ${message}\n⏰ *Time:* ${new Date().toLocaleString('ar-SA')}`;
      
      const response = await fetch(`https://api.telegram.org/bot${config.webhookUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: telegramMessage,
          parse_mode: 'Markdown',
        }),
      });

      if (!response.ok) {
        console.error('[NotificationService] Telegram API error:', await response.text());
        return false;
      }

      console.log('[NotificationService] Telegram notification sent successfully');
      return true;
    } catch (error) {
      console.error('[NotificationService] Telegram send failed:', error);
      return false;
    }
  }

  // إرسال إشعار Slack
  async sendSlackNotification(config: NotificationConfig, message: string, level: string): Promise<boolean> {
    if (!config.webhookUrl) {
      console.error('[NotificationService] Slack webhook URL missing');
      return false;
    }

    try {
      const slackPayload = {
        text: `🤖 Bot.v4 Alert - ${level.toUpperCase()}`,
        attachments: [
          {
            color: level === 'error' ? 'danger' : level === 'warn' ? 'warning' : 'good',
            fields: [
              {
                title: 'Level',
                value: level.toUpperCase(),
                short: true,
              },
              {
                title: 'Message',
                value: message,
                short: false,
              },
              {
                title: 'Time',
                value: new Date().toLocaleString('ar-SA'),
                short: true,
              }
            ],
          },
        ],
      };

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackPayload),
      });

      if (!response.ok) {
        console.error('[NotificationService] Slack webhook error:', await response.text());
        return false;
      }

      console.log('[NotificationService] Slack notification sent successfully');
      return true;
    } catch (error) {
      console.error('[NotificationService] Slack send failed:', error);
      return false;
    }
  }

  // إرسال إشعار webhook عام
  async sendWebhookNotification(config: NotificationConfig, message: string, level: string): Promise<boolean> {
    if (!config.webhookUrl) {
      console.error('[NotificationService] Webhook URL missing');
      return false;
    }

    try {
      const payload = {
        timestamp: new Date().toISOString(),
        level: level,
        message: message,
        source: 'bot.v4',
      };

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('[NotificationService] Webhook error:', await response.text());
        return false;
      }

      console.log('[NotificationService] Webhook notification sent successfully');
      return true;
    } catch (error) {
      console.error('[NotificationService] Webhook send failed:', error);
      return false;
    }
  }

  // التحقق من ضرورة إرسال إشعار (منع الازدحام)
  shouldSendNotification(configId: string, config: NotificationConfig, level: string): boolean {
    if (!config.isEnabled) {
      return false;
    }

    if (!config.alertLevels.includes(level)) {
      return false;
    }

    const now = new Date();
    let alertState = this.alertStates.get(configId);

    if (!alertState) {
      alertState = {
        lastNotification: new Date(0),
        errorCount: 0,
        lastErrorTypes: new Map(),
      };
      this.alertStates.set(configId, alertState);
    }

    // تحديث عداد الأخطاء
    alertState.errorCount += 1;
    alertState.lastErrorTypes.set(level, (alertState.lastErrorTypes.get(level) || 0) + 1);

    // التحقق من فترة الانتظار
    const cooldownMs = config.cooldownMinutes * 60 * 1000;
    const timeSinceLastNotification = now.getTime() - alertState.lastNotification.getTime();

    if (timeSinceLastNotification < cooldownMs) {
      return false;
    }

    // التحقق من عتبة الأخطاء
    if (alertState.errorCount >= config.threshold) {
      alertState.lastNotification = now;
      alertState.errorCount = 0; // إعادة تعيين العداد
      return true;
    }

    return false;
  }

  // إرسال إشعار بحسب النوع
  async sendNotification(config: NotificationConfig, configId: string, message: string, level: string): Promise<boolean> {
    if (!this.shouldSendNotification(configId, config, level)) {
      return false;
    }

    const enhancedMessage = `${message}\n\n📊 إحصائيات: ${this.getAlertStats(configId)}`;

    switch (config.type) {
      case 'telegram':
        return await this.sendTelegramNotification(config, enhancedMessage, level);
      case 'slack':
        return await this.sendSlackNotification(config, enhancedMessage, level);
      case 'webhook':
        return await this.sendWebhookNotification(config, enhancedMessage, level);
      default:
        console.error('[NotificationService] Unknown notification type:', config.type);
        return false;
    }
  }

  // الحصول على إحصائيات التنبيهات
  private getAlertStats(configId: string): string {
    const alertState = this.alertStates.get(configId);
    if (!alertState) return 'لا توجد بيانات';

    const errorTypes = Array.from(alertState.lastErrorTypes.entries())
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');

    return `آخر إشعار: ${alertState.lastNotification.toLocaleString('ar-SA')} | أنواع الأخطاء: ${errorTypes}`;
  }

  // إعادة تعيين إحصائيات التنبيهات
  resetAlertStats(configId?: string): void {
    if (configId) {
      this.alertStates.delete(configId);
    } else {
      this.alertStates.clear();
    }
  }

  // اختبار إشعار
  async testNotification(config: NotificationConfig): Promise<boolean> {
    const testMessage = 'هذا اختبار لنظام الإشعارات 🧪';
    
    switch (config.type) {
      case 'telegram':
        return await this.sendTelegramNotification(config, testMessage, 'info');
      case 'slack':
        return await this.sendSlackNotification(config, testMessage, 'info');
      case 'webhook':
        return await this.sendWebhookNotification(config, testMessage, 'info');
      default:
        return false;
    }
  }
}

// إنشاء instance واحد لاستخدامه في كل مكان
export const notificationService = new NotificationService();

// تصدير الأنواع للاستخدام في أماكن أخرى
export type { NotificationConfig };