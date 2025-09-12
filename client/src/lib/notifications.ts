// نظام إشعارات متقدم
export class NotificationService {
  static async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('متصفحك لا يدعم الإشعارات');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  static async sendNotification(title: string, options?: NotificationOptions) {
    if (!('Notification' in window)) {
      return;
    }

    try {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          icon: '/logo.png',
          badge: '/badge.png',
          ...options,
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, {
            icon: '/logo.png',
            badge: '/badge.png',
            ...options,
          });
        }
      }
    } catch (error) {
      console.error('خطأ في إرسال الإشعار:', error);
    }
  }

  static async sendTradeSignal(signal: { symbol: string, type: 'buy' | 'sell', price: number }) {
    const title = `إشارة تداول جديدة: ${signal.symbol}`;
    const body = `نوع الإشارة: ${signal.type === 'buy' ? 'شراء' : 'بيع'}\nالسعر: ${signal.price}`;

    await this.sendNotification(title, {
      body,
      tag: `trade-signal-${signal.symbol}`,
      data: signal,
      requireInteraction: true,
      silent: false,
    });
  }
  
  static async sendChatMessage(message: { sender: string, text: string }) {
    const title = `رسالة جديدة من ${message.sender}`;
    // قص النص إذا كان طويلاً جدًا
    const body = message.text.length > 100 
      ? `${message.text.substring(0, 100)}...` 
      : message.text;

    await this.sendNotification(title, {
      body,
      tag: `chat-message-${Date.now()}`,
      data: message,
      requireInteraction: false,
      silent: document.hasFocus(), // صامت إذا كانت النافذة نشطة
    });
  }
}

export default NotificationService;