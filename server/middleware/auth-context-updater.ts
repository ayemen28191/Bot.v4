
import { Request, Response, NextFunction } from 'express';
import { updateCurrentContext, getCurrentContext } from './request-context';

/**
 * ======================== Auth Context Updater Middleware ========================
 * 
 * هذا الـ middleware يعمل بعد المصادقة لتحديث السياق بمعلومات المستخدم المصادق عليه
 * 
 * المشكلة التي يحلها:
 * - requestContextMiddleware يعمل قبل setupAuth، لذا req.user غير متاح عند إنشاء السياق
 * - السجلات تحتوي على user_id=null حتى للمستخدمين المصادق عليهم
 * 
 * الحل:
 * - تحديث السياق الحالي بمعلومات المستخدم بعد المصادقة
 * - استخدام updateCurrentContext من request-context.ts
 * =================================================================================
 */

/**
 * Middleware لتحديث السياق بمعلومات المستخدم المصادق عليه
 * يجب أن يعمل بعد setupAuth في server/index.ts
 */
export function authContextUpdaterMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // تجنب التحديثات المتكررة في نفس الطلب
    if ((req as any).__authContextUpdated) {
      next();
      return;
    }
    
    // التحقق من وجود مستخدم مصادق عليه
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      // تحديث السياق الحالي بمعلومات المستخدم فقط إذا لم يكن محدثاً بالفعل
      const currentContext = getCurrentContext();
      
      // التحقق من أن السياق يحتاج للتحديث فعلاً
      const needsUpdate = !currentContext || 
                         currentContext.userId !== req.user.id ||
                         currentContext.username !== req.user.username ||
                         currentContext.isAdmin !== (req.user.isAdmin || false);
      
      if (needsUpdate) {
        updateCurrentContext({
          userId: req.user.id,
          username: req.user.username,
          userDisplayName: req.user.displayName || req.user.username,
          isAdmin: req.user.isAdmin || false
        });
        
        // تحديث res.locals أيضاً للتوافق مع النظام القديم
        if (res.locals.loggingContext) {
          res.locals.loggingContext.userId = req.user.id;
          res.locals.loggingContext.username = req.user.username;
          res.locals.loggingContext.userDisplayName = req.user.displayName || req.user.username;
          res.locals.loggingContext.isAdmin = req.user.isAdmin || false;
        }
        
        // تسجيل debug فقط عند التحديث الفعلي وفي بيئة التطوير
        if (process.env.NODE_ENV === 'development') {
          console.log(`[AuthContextUpdater] Updated context for user: ${req.user.username} (ID: ${req.user.id})`);
        }
        
        // وضع علامة على الطلب لتجنب التحديثات المتكررة
        (req as any).__authContextUpdated = true;
      }
    }
    
    next();
  } catch (error) {
    console.error('[AuthContextUpdater] Error updating auth context:', error);
    // في حالة الخطأ، متابعة بدون تحديث السياق
    next();
  }
}

/**
 * دالة مساعدة للتحقق من تحديث السياق
 */
export function verifyContextUpdate(req: Request): boolean {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return true; // لا حاجة للتحديث للمستخدمين غير المصادق عليهم
  }
  
  try {
    const context = getCurrentContext();
    return context && context.userId === req.user.id;
  } catch (error) {
    console.error('[AuthContextUpdater] Error verifying context update:', error);
    return false;
  }
}
