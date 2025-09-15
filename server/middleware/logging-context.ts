import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { requestContextMiddleware, RequestContext, getCurrentContext } from './request-context';

/**
 * ===================== إشعار مهم - هذا الملف محفوظ للتوافق =====================
 * 
 * تم الآن استبدال هذا النظام بنظام AsyncLocalStorage الجديد في request-context.ts
 * 
 * هذا الملف محفوظ للتوافق مع الكود الحالي فقط
 * استخدم request-context.ts للمشاريع الجديدة
 * 
 * ==========================================================================
 */

/**
 * Logging Context Interface - محفوظ للتوافق
 * استخدم RequestContext من request-context.ts للمشاريع الجديدة
 */
export interface LoggingContext {
  requestId: string;
  sessionId?: string;
  userId?: number;
  username?: string;
  userDisplayName?: string;
  isAdmin?: boolean;
  clientIP: string;
  userAgent: string;
  timestamp: string;
}

/**
 * Express Response locals interface is now declared in request-context.ts
 * to avoid TypeScript conflicts. The declaration there supports both
 * LoggingContext and RequestContext types.
 */

/**
 * Logging Context Middleware - محدث لاستخدام النظام الجديد
 * الآن يستخدم requestContextMiddleware من request-context.ts
 */
export function loggingContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  // استخدام النظام الجديد مع RequestContext
  return requestContextMiddleware(req, res, next);
}

/**
 * استخراج عنوان IP الحقيقي للعميل مع مراعاة الـ proxies
 */
function getClientIP(req: Request): string {
  // التحقق من X-Forwarded-For header (للـ load balancers و proxies)
  const xForwardedFor = req.get('X-Forwarded-For');
  if (xForwardedFor) {
    // أول IP في القائمة هو IP العميل الأصلي
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
 * دالة مساعدة للحصول على السياق - محدثة لاستخدام النظام الجديد
 * تحاول الحصول على السياق من AsyncLocalStorage أولاً، ثم من res.locals
 */
export function getLoggingContext(res?: Response): LoggingContext | undefined {
  // الحصول من AsyncLocalStorage أولاً (النظام الجديد)
  const asyncContext = getCurrentContext();
  if (asyncContext) {
    return convertToLoggingContext(asyncContext);
  }
  
  // Fallback للنظام القديم - convert RequestContext to LoggingContext
  if (res?.locals?.loggingContext) {
    return convertToLoggingContext(res.locals.loggingContext);
  }
  
  return undefined;
}

/**
 * تحويل RequestContext إلى LoggingContext للتوافق
 */
function convertToLoggingContext(context: RequestContext): LoggingContext {
  return {
    requestId: context.requestId,
    sessionId: context.sessionId,
    userId: context.userId,
    username: context.username,
    userDisplayName: context.userDisplayName,
    isAdmin: context.isAdmin,
    clientIP: context.clientIP,
    userAgent: context.userAgent,
    timestamp: context.timestamp
  };
}

/**
 * دالة مساعدة لإنشاء معرف فريد للطلب (للاستخدام خارج الـ middleware)
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * دالة مساعدة لتنسيق السياق كـ JSON للسجلات
 */
export function formatLoggingContext(context: LoggingContext): Record<string, any> {
  return {
    requestId: context.requestId,
    sessionId: context.sessionId,
    userId: context.userId,
    username: context.username,
    userDisplayName: context.userDisplayName,
    isAdmin: context.isAdmin,
    clientIP: context.clientIP,
    userAgent: context.userAgent,
    timestamp: context.timestamp
  };
}