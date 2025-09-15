
import { signalLogger } from './signal-logger';
import { notificationService } from './notification-service';

interface AlertRule {
  id: string;
  name: string;
  type: 'signal_quality' | 'market_change' | 'error_rate' | 'performance';
  condition: {
    field: string;
    operator: '>' | '<' | '=' | '!=' | 'contains';
    value: any;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number; // بالثواني
  lastTriggered?: Date;
  actions: AlertAction[];
}

interface AlertAction {
  type: 'notification' | 'log' | 'disable_source' | 'switch_mode';
  config: any;
}

interface MarketAlert {
  id: string;
  symbol: string;
  message: string;
  priority: string;
  timestamp: Date;
  data: any;
}

export class SmartAlertsSystem {
  private rules: Map<string, AlertRule> = new Map();
  private recentAlerts: MarketAlert[] = [];
  private maxRecentAlerts = 100;

  constructor() {
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  // تهيئة القواعد الافتراضية
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_confidence_signal',
        name: 'إشارة عالية الثقة',
        type: 'signal_quality',
        condition: {
          field: 'probability',
          operator: '>',
          value: 85
        },
        priority: 'high',
        enabled: true,
        cooldown: 300, // 5 دقائق
        actions: [
          {
            type: 'notification',
            config: {
              title: 'إشارة عالية الثقة',
              body: 'تم رصد إشارة بثقة {probability}% للرمز {symbol}'
            }
          }
        ]
      },
      {
        id: 'error_rate_spike',
        name: 'ارتفاع معدل الأخطاء',
        type: 'error_rate',
        condition: {
          field: 'errorRate',
          operator: '>',
          value: 30
        },
        priority: 'critical',
        enabled: true,
        cooldown: 600, // 10 دقائق
        actions: [
          {
            type: 'notification',
            config: {
              title: 'تحذير: ارتفاع معدل الأخطاء',
              body: 'معدل الأخطاء وصل إلى {errorRate}%'
            }
          },
          {
            type: 'log',
            config: {
              level: 'warn',
              message: 'ارتفاع غير طبيعي في معدل الأخطاء'
            }
          }
        ]
      },
      {
        id: 'market_volatility',
        name: 'تقلبات السوق العالية',
        type: 'market_change',
        condition: {
          field: 'volatility',
          operator: '>',
          value: 70
        },
        priority: 'medium',
        enabled: true,
        cooldown: 900, // 15 دقيقة
        actions: [
          {
            type: 'notification',
            config: {
              title: 'تقلبات عالية في السوق',
              body: 'تقلبات {symbol} وصلت إلى {volatility}%'
            }
          }
        ]
      },
      {
        id: 'api_limit_warning',
        name: 'تحذير حد الاستخدام',
        type: 'performance',
        condition: {
          field: 'rateLimitRemaining',
          operator: '<',
          value: 50
        },
        priority: 'medium',
        enabled: true,
        cooldown: 1800, // 30 دقيقة
        actions: [
          {
            type: 'notification',
            config: {
              title: 'تحذير: اقتراب من حد الاستخدام',
              body: 'متبقي {rateLimitRemaining} طلب فقط'
            }
          },
          {
            type: 'switch_mode',
            config: {
              mode: 'conservative'
            }
          }
        ]
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });

    console.log('[SmartAlerts] تم تهيئة', defaultRules.length, 'قاعدة تنبيه');
  }

  // فحص القواعد عند حدوث إشارة جديدة
  async checkSignalRules(signalData: any): Promise<void> {
    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled || rule.type !== 'signal_quality') continue;

      if (this.isRuleTriggered(rule, signalData)) {
        await this.executeRule(rule, signalData);
      }
    }
  }

  // فحص قواعد الأداء
  async checkPerformanceRules(performanceData: any): Promise<void> {
    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled || (rule.type !== 'error_rate' && rule.type !== 'performance')) continue;

      if (this.isRuleTriggered(rule, performanceData)) {
        await this.executeRule(rule, performanceData);
      }
    }
  }

  // فحص قواعد السوق
  async checkMarketRules(marketData: any): Promise<void> {
    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled || rule.type !== 'market_change') continue;

      if (this.isRuleTriggered(rule, marketData)) {
        await this.executeRule(rule, marketData);
      }
    }
  }

  // فحص ما إذا كانت القاعدة مطابقة
  private isRuleTriggered(rule: AlertRule, data: any): boolean {
    // فحص cooldown
    if (rule.lastTriggered) {
      const timeSinceLastTrigger = (Date.now() - rule.lastTriggered.getTime()) / 1000;
      if (timeSinceLastTrigger < rule.cooldown) {
        return false;
      }
    }

    const fieldValue = this.getFieldValue(data, rule.condition.field);
    const conditionValue = rule.condition.value;

    switch (rule.condition.operator) {
      case '>':
        return fieldValue > conditionValue;
      case '<':
        return fieldValue < conditionValue;
      case '=':
        return fieldValue === conditionValue;
      case '!=':
        return fieldValue !== conditionValue;
      case 'contains':
        return String(fieldValue).includes(String(conditionValue));
      default:
        return false;
    }
  }

  // الحصول على قيمة الحقل من البيانات
  private getFieldValue(data: any, fieldPath: string): any {
    const keys = fieldPath.split('.');
    let value = data;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  // تنفيذ قاعدة التنبيه
  private async executeRule(rule: AlertRule, data: any): Promise<void> {
    console.log(`[SmartAlerts] تنفيذ قاعدة: ${rule.name}`);
    
    rule.lastTriggered = new Date();

    // إنشاء تنبيه
    const alert: MarketAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: data.symbol || 'SYSTEM',
      message: this.formatMessage(rule.name, data),
      priority: rule.priority,
      timestamp: new Date(),
      data
    };

    this.addAlert(alert);

    // تنفيذ الإجراءات
    for (const action of rule.actions) {
      await this.executeAction(action, data, alert);
    }
  }

  // تنفيذ إجراء محدد
  private async executeAction(action: AlertAction, data: any, alert: MarketAlert): Promise<void> {
    try {
      switch (action.type) {
        case 'notification':
          await this.sendNotification(action.config, data, alert);
          break;
          
        case 'log':
          await this.logAlert(action.config, data, alert);
          break;
          
        case 'disable_source':
          await this.disableSource(action.config, data);
          break;
          
        case 'switch_mode':
          await this.switchMode(action.config, data);
          break;
      }
    } catch (error) {
      console.error('[SmartAlerts] فشل في تنفيذ الإجراء:', error);
    }
  }

  // إرسال إشعار
  private async sendNotification(config: any, data: any, alert: MarketAlert): Promise<void> {
    const title = this.formatMessage(config.title, data);
    const body = this.formatMessage(config.body, data);

    // يمكن استخدام نظام الإشعارات الموجود
    console.log(`[SmartAlerts] إشعار: ${title} - ${body}`);
    
    // إضافة إلى سجل النظام
    await signalLogger.log({
      level: 'info',
      source: 'smart-alerts',
      message: `تنبيه: ${title}`,
      meta: JSON.stringify({ alert, originalData: data })
    });
  }

  // تسجيل التنبيه
  private async logAlert(config: any, data: any, alert: MarketAlert): Promise<void> {
    const message = this.formatMessage(config.message, data);
    
    await signalLogger.log({
      level: config.level || 'info',
      source: 'smart-alerts',
      message,
      meta: JSON.stringify({ alert, data })
    });
  }

  // تعطيل مصدر البيانات
  private async disableSource(config: any, data: any): Promise<void> {
    // يمكن التكامل مع DataSourceManager
    console.log('[SmartAlerts] طلب تعطيل مصدر البيانات:', config);
  }

  // تبديل وضع التشغيل
  private async switchMode(config: any, data: any): Promise<void> {
    console.log('[SmartAlerts] طلب تبديل الوضع إلى:', config.mode);
    
    await signalLogger.log({
      level: 'info',
      source: 'smart-alerts',
      message: `تبديل وضع التشغيل إلى: ${config.mode}`,
      meta: JSON.stringify({ config, data })
    });
  }

  // تنسيق الرسائل مع المتغيرات
  private formatMessage(template: string, data: any): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  // إضافة تنبيه للقائمة
  private addAlert(alert: MarketAlert): void {
    this.recentAlerts.unshift(alert);
    
    if (this.recentAlerts.length > this.maxRecentAlerts) {
      this.recentAlerts = this.recentAlerts.slice(0, this.maxRecentAlerts);
    }
  }

  // مراقبة دورية
  private startMonitoring(): void {
    // مراقبة كل 30 ثانية
    setInterval(async () => {
      // يمكن إضافة فحوصات دورية هنا
      await this.performSystemCheck();
    }, 30000);
  }

  // فحص النظام الدوري
  private async performSystemCheck(): Promise<void> {
    // فحص إحصائيات النظام
    const systemStats = {
      timestamp: new Date(),
      alertsCount: this.recentAlerts.length,
      activeRules: Array.from(this.rules.values()).filter(r => r.enabled).length
    };

    // يمكن إضافة فحوصات إضافية هنا
  }

  // إدارة القواعد
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    console.log(`[SmartAlerts] تم إضافة قاعدة جديدة: ${rule.name}`);
  }

  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    console.log(`[SmartAlerts] تم تحديث القاعدة: ${rule.name}`);
    return true;
  }

  deleteRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      console.log(`[SmartAlerts] تم حذف القاعدة: ${ruleId}`);
    }
    return deleted;
  }

  // الحصول على التنبيهات الأخيرة
  getRecentAlerts(limit: number = 20): MarketAlert[] {
    return this.recentAlerts.slice(0, limit);
  }

  // الحصول على إحصائيات التنبيهات
  getAlertsStats(): any {
    const total = this.recentAlerts.length;
    const byPriority = {
      critical: this.recentAlerts.filter(a => a.priority === 'critical').length,
      high: this.recentAlerts.filter(a => a.priority === 'high').length,
      medium: this.recentAlerts.filter(a => a.priority === 'medium').length,
      low: this.recentAlerts.filter(a => a.priority === 'low').length
    };

    return {
      total,
      byPriority,
      activeRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      totalRules: this.rules.size
    };
  }
}

export const smartAlertsSystem = new SmartAlertsSystem();
