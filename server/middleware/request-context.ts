import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * ======================== نظام السياق العام للطلبات ========================
 * 
 * يستخدم AsyncLocalStorage لحفظ سياق الطلب في كامل دورة حياة الطلب
 * بحيث يمكن الوصول للسياق من أي مكان في التطبيق دون الحاجة لتمرير res
 * 
 * الفوائد:
 * - توحيد السجلات تلقائياً مع معلومات المستخدم
 * - عدم الحاجة لتمرير res في كل مكان
 * - ضمان الأمان عبر عزل السياق لكل طلب
 * =========================================================================
 */

/**
 * واجهة سياق الطلب الشاملة
 */
export interface RequestContext {
  requestId: string;
  sessionId?: string;
  userId?: number;
  username?: string;
  userDisplayName?: string;
  isAdmin?: boolean;
  clientIP: string;
  userAgent: string;
  timestamp: string;
  // إضافة معلومات إضافية للتتبع المتقدم
  route?: string;
  method?: string;
  startTime?: number;
}

/**
 * AsyncLocalStorage instance للحفظ العام للسياق
 */
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Middleware لإنشاء وحفظ السياق باستخدام AsyncLocalStorage
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // إنشاء السياق الجديد
    const context = createRequestContext(req);
    
    // حفظ السياق في res.locals للتوافق مع النظام الحالي
    res.locals.loggingContext = context;
    
    // إضافة معرف الطلب للاستجابة كـ header (مفيد للتتبع)
    res.set('X-Request-ID', context.requestId);
    
    // تشغيل باقي middleware مع السياق المحفوظ في AsyncLocalStorage
    requestContextStorage.run(context, () => {
      next();
    });
    
  } catch (error) {
    console.error('[RequestContext] Error in request context middleware:', error);
    
    // في حالة الخطأ، أنشئ سياق أساسي وتابع
    const fallbackContext = createFallbackContext(req);
    res.locals.loggingContext = fallbackContext;
    
    requestContextStorage.run(fallbackContext, () => {
      next();
    });
  }
}

/**
 * إنشاء سياق جديد للطلب
 */
function createRequestContext(req: Request): RequestContext {
  const requestId = randomUUID();
  
  return {
    requestId,
    sessionId: req.sessionID || undefined,
    userId: req.user?.id,
    username: req.user?.username,
    userDisplayName: req.user?.displayName || req.user?.username,
    isAdmin: req.user?.isAdmin ?? undefined,
    clientIP: extractClientIP(req),
    userAgent: req.get('User-Agent') || 'Unknown',
    timestamp: new Date().toISOString(),
    route: req.route?.path || req.path,
    method: req.method,
    startTime: Date.now()
  };
}

/**
 * إنشاء سياق احتياطي في حالة الخطأ
 */
function createFallbackContext(req: Request): RequestContext {
  return {
    requestId: randomUUID(),
    clientIP: req.ip || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    timestamp: new Date().toISOString(),
    route: req.route?.path || req.path,
    method: req.method,
    startTime: Date.now()
  };
}

/**
 * استخراج عنوان IP الحقيقي للعميل
 */
function extractClientIP(req: Request): string {
  // التحقق من X-Forwarded-For header (للـ load balancers و proxies)
  const xForwardedFor = req.get('X-Forwarded-For');
  if (xForwardedFor) {
    const firstIP = xForwardedFor.split(',')[0].trim();
    if (firstIP) {
      return firstIP;
    }
  }
  
  // التحقق من headers أخرى شائعة
  const xRealIP = req.get('X-Real-IP');
  if (xRealIP) {
    return xRealIP;
  }
  
  const xClientIP = req.get('X-Client-IP');
  if (xClientIP) {
    return xClientIP;
  }
  
  // استخدام req.ip كـ fallback
  return req.ip || 'unknown';
}

/**
 * ======================== دوال الوصول للسياق ========================
 */

/**
 * الحصول على السياق الحالي من AsyncLocalStorage
 * يعمل من أي مكان في دورة حياة الطلب
 */
export function getCurrentContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * الحصول على السياق مع ضمان عدم إرجاع null
 */
export function requireCurrentContext(): RequestContext {
  const context = getCurrentContext();
  if (!context) {
    throw new Error('Request context not available - ensure requestContextMiddleware is properly setup');
  }
  return context;
}

/**
 * الحصول على معرف المستخدم الحالي
 */
export function getCurrentUserId(): number | undefined {
  return getCurrentContext()?.userId;
}

/**
 * الحصول على اسم المستخدم الحالي
 */
export function getCurrentUsername(): string | undefined {
  return getCurrentContext()?.username;
}

/**
 * التحقق من كون المستخدم الحالي مديراً
 */
export function isCurrentUserAdmin(): boolean {
  return getCurrentContext()?.isAdmin === true;
}

/**
 * الحصول على معرف الطلب الحالي
 */
export function getCurrentRequestId(): string | undefined {
  return getCurrentContext()?.requestId;
}

/**
 * ======================== دوال مساعدة للسياق ========================
 */

/**
 * تحديث السياق الحالي ببيانات إضافية
 * مفيد لإضافة معلومات خلال دورة حياة الطلب
 */
export function updateCurrentContext(updates: Partial<RequestContext>): void {
  const context = getCurrentContext();
  if (context) {
    Object.assign(context, updates);
  }
}

/**
 * تنسيق السياق كـ JSON للسجلات
 */
export function formatRequestContext(context?: RequestContext): Record<string, any> {
  if (!context) {
    return {};
  }
  
  return {
    requestId: context.requestId,
    sessionId: context.sessionId,
    userId: context.userId,
    username: context.username,
    userDisplayName: context.userDisplayName,
    isAdmin: context.isAdmin,
    clientIP: context.clientIP,
    userAgent: context.userAgent,
    timestamp: context.timestamp,
    route: context.route,
    method: context.method,
    processingTime: context.startTime ? Date.now() - context.startTime : undefined
  };
}

/**
 * تشغيل دالة مع سياق معين (للاستخدام في العمليات غير المتصلة بـ HTTP)
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return requestContextStorage.run(context, fn);
}

/**
 * إنشاء سياق وهمي للاستخدام خارج نطاق HTTP (مثل cronjobs أو startup)
 */
export function createSystemContext(systemName: string = 'system'): RequestContext {
  return {
    requestId: `system_${randomUUID()}`,
    clientIP: 'system',
    userAgent: `System/${systemName}`,
    timestamp: new Date().toISOString(),
    route: `/system/${systemName}`,
    method: 'SYSTEM',
    startTime: Date.now()
  };
}

/**
 * ======================== دوال للتوافق مع النظام السابق ========================
 */

/**
 * دالة للتوافق مع getLoggingContext من النظام السابق
 */
export function getLoggingContext(res?: Response): RequestContext | undefined {
  // أولاً، حاول الحصول على السياق من AsyncLocalStorage
  const asyncContext = getCurrentContext();
  if (asyncContext) {
    return asyncContext;
  }
  
  // في حالة عدم توفره، حاول من res.locals (للتوافق مع النظام السابق)
  if (res?.locals?.loggingContext) {
    return res.locals.loggingContext;
  }
  
  return undefined;
}

/**
 * تصدير AsyncLocalStorage instance للاستخدامات المتقدمة
 */
export { requestContextStorage };

// إضافة type للـ TypeScript global
declare global {
  namespace Express {
    interface Locals {
      loggingContext?: RequestContext;
    }
  }
}