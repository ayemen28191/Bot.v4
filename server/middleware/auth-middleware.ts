import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { logsService } from '../services/logs-service';

/**
 * ======================== Unified Auth Middleware ========================
 * 
 * هذا الملف يحتوي على middleware موحد للمصادقة والترخيص
 * يحل محل جميع التطبيقات المكررة في ملفات المسارات المختلفة
 * 
 * الميزات:
 * - دعم كامل للعربية والإنجليزية في رسائل الأخطاء
 * - تسجيل موحد للأحداث الأمنية
 * - متوافق مع Passport.js والجلسات
 * - دعم أنماط مختلفة للمصادقة (req.user و req.session.user)
 * =====================================================================
 */

// إعدادات رسائل الأخطاء
interface ErrorMessages {
  ar: {
    notAuthenticated: string;
    notAuthorized: string;
    notAdmin: string;
    sessionError: string;
    authError: string;
  };
  en: {
    notAuthenticated: string;
    notAuthorized: string;
    notAdmin: string;
    sessionError: string;
    authError: string;
  };
}

const errorMessages: ErrorMessages = {
  ar: {
    notAuthenticated: 'يجب تسجيل الدخول للوصول إلى هذا المسار',
    notAuthorized: 'غير مسموح بالوصول',
    notAdmin: 'غير مسموح. هذه العملية تتطلب صلاحيات المشرف',
    sessionError: 'خطأ في الجلسة',
    authError: 'خطأ في التحقق من الصلاحيات'
  },
  en: {
    notAuthenticated: 'Authentication required to access this resource',
    notAuthorized: 'Access denied',
    notAdmin: 'Access denied. Administrator privileges required',
    sessionError: 'Session error',
    authError: 'Authentication verification error'
  }
};

// دالة مساعدة للحصول على رسائل الخطأ
function getErrorMessage(key: keyof ErrorMessages['ar'], language: 'ar' | 'en' = 'ar'): string {
  return errorMessages[language][key];
}

// دالة مساعدة لاستخراج معلومات السياق من الطلب
function extractRequestContext(req: Request) {
  return {
    clientIP: req.ip || req.connection?.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    endpoint: req.originalUrl || req.url,
    method: req.method
  };
}

/**
 * التحقق الأساسي من المصادقة
 * يدعم كلاً من req.user (Passport.js) و req.session.user
 */
export function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction,
  options: { language?: 'ar' | 'en'; silent?: boolean } = {}
): void {
  const { language = 'ar', silent = false } = options;
  const context = extractRequestContext(req);

  try {
    // التحقق من المصادقة عبر Passport.js
    const isPassportAuthenticated = req.isAuthenticated && req.isAuthenticated() && req.user;
    
    // التحقق من المصادقة عبر الجلسة المخصصة (للتوافق مع الكود القديم)
    const isSessionAuthenticated = req.session?.user?.id;

    if (isPassportAuthenticated || isSessionAuthenticated) {
      if (!silent) {
        const user = req.user || req.session?.user;
        logsService.logInfo('auth', `Authentication check passed for user: ${user?.username}`, {
          action: 'auth_check_success',
          userId: user?.id,
          username: user?.username,
          authMethod: isPassportAuthenticated ? 'passport' : 'session',
          ...context
        });
      }
      return next();
    }

    // فشل المصادقة
    if (!silent) {
      logsService.logWarn('auth', 'Authentication check failed: User not authenticated', {
        action: 'auth_check_failed',
        reason: 'not_authenticated',
        hasPassport: !!req.isAuthenticated,
        hasSession: !!req.session,
        hasUser: !!req.user,
        hasSessionUser: !!req.session?.user,
        ...context
      });
    }

    res.status(401).json({ 
      message: getErrorMessage('notAuthenticated', language),
      error: 'Unauthorized'
    });
  } catch (error) {
    logsService.logError('auth', 'Error in authentication check', {
      action: 'auth_check_error',
      error: error instanceof Error ? error.message : String(error),
      ...context
    });

    res.status(500).json({ 
      message: getErrorMessage('authError', language),
      error: 'Internal server error'
    });
  }
}

/**
 * التحقق من صلاحيات المشرف
 * يدعم استراتيجيات مختلفة للتحقق من المستخدم
 */
export function isAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
  options: { 
    language?: 'ar' | 'en'; 
    requireDatabaseCheck?: boolean;
    returnJson?: boolean;
  } = {}
): void {
  const { 
    language = 'ar', 
    requireDatabaseCheck = false,
    returnJson = true 
  } = options;
  const context = extractRequestContext(req);

  try {
    // أولاً، التحقق من المصادقة
    const isPassportAuthenticated = req.isAuthenticated && req.isAuthenticated() && req.user;
    const isSessionAuthenticated = req.session?.user?.id;

    if (!isPassportAuthenticated && !isSessionAuthenticated) {
      logsService.logWarn('auth', 'Admin check failed: User not authenticated', {
        action: 'admin_check_failed',
        reason: 'not_authenticated',
        ...context
      });

      const response = returnJson 
        ? { message: getErrorMessage('notAuthenticated', language), error: 'Unauthorized' }
        : { success: false, message: getErrorMessage('notAuthenticated', language) };
      
      res.status(401).json(response);
      return;
    }

    const user = req.user || req.session?.user;

    // إذا كان التحقق من قاعدة البيانات مطلوب (للحالات الحساسة)
    if (requireDatabaseCheck && user?.id) {
      storage.getUser(user.id).then((dbUser) => {
        if (!dbUser || !dbUser.isAdmin) {
          logsService.logWarn('auth', `Admin check failed: User is not admin - ${user?.username}`, {
            action: 'admin_check_failed',
            reason: 'insufficient_privileges',
            userId: user?.id,
            username: user?.username,
            isAdmin: dbUser?.isAdmin || false,
            checkMethod: 'database',
            ...context
          });

          const response = returnJson 
            ? { message: getErrorMessage('notAdmin', language), error: 'Forbidden' }
            : { success: false, message: getErrorMessage('notAdmin', language) };
          
          return res.status(403).json(response);
        }

        logsService.logInfo('auth', `Admin access granted for user: ${user?.username}`, {
          action: 'admin_access_granted',
          userId: user?.id,
          username: user?.username,
          checkMethod: 'database',
          ...context
        });

        next();
      }).catch((error: any) => {
        logsService.logError('auth', `Database error during admin check for user: ${user?.username}`, {
          action: 'admin_check_error',
          userId: user?.id,
          username: user?.username,
          error: error.message || String(error),
          ...context
        });

        const response = returnJson 
          ? { message: getErrorMessage('authError', language), error: 'Internal server error' }
          : { success: false, message: getErrorMessage('authError', language) };
        
        res.status(500).json(response);
      });
      return;
    }

    // التحقق السريع من الذاكرة (الطريقة العادية)
    if (!user?.isAdmin) {
      logsService.logWarn('auth', `Admin check failed: User is not admin - ${user?.username}`, {
        action: 'admin_check_failed',
        reason: 'insufficient_privileges',
        userId: user?.id,
        username: user?.username,
        isAdmin: user?.isAdmin || false,
        checkMethod: 'session',
        ...context
      });

      const response = returnJson 
        ? { message: getErrorMessage('notAdmin', language), error: 'Forbidden' }
        : { success: false, message: getErrorMessage('notAdmin', language) };
      
      res.status(403).json(response);
      return;
    }

    // نجح التحقق من صلاحيات المشرف
    logsService.logInfo('auth', `Admin access granted for user: ${user?.username}`, {
      action: 'admin_access_granted',
      userId: user?.id,
      username: user?.username,
      checkMethod: 'session',
      ...context
    });

    next();
  } catch (error) {
    logsService.logError('auth', 'Error in admin check', {
      action: 'admin_check_error',
      error: error instanceof Error ? error.message : String(error),
      ...context
    });

    const response = returnJson 
      ? { message: getErrorMessage('authError', language), error: 'Internal server error' }
      : { success: false, message: getErrorMessage('authError', language) };
    
    res.status(500).json(response);
  }
}

/**
 * Middleware للمسارات التي تتطلب مستخدم مسجل الدخول
 * مع خيارات إضافية للتخصيص
 */
export function requireUser(options: { 
  language?: 'ar' | 'en'; 
  redirectTo?: string;
  silent?: boolean;
} = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { language = 'ar', redirectTo, silent = false } = options;

    // إذا كان هناك توجيه مطلوب، استخدم redirect بدلاً من JSON
    if (redirectTo) {
      const isPassportAuthenticated = req.isAuthenticated && req.isAuthenticated() && req.user;
      const isSessionAuthenticated = req.session?.user?.id;

      if (!isPassportAuthenticated && !isSessionAuthenticated) {
        if (!silent) {
          const context = extractRequestContext(req);
          logsService.logInfo('auth', 'User redirected to login page', {
            action: 'auth_redirect',
            redirectTo,
            ...context
          });
        }
        return res.redirect(redirectTo);
      }
    }

    // استخدام التحقق العادي
    isAuthenticated(req, res, next, { language, silent });
  };
}

/**
 * Middleware للمسارات التي تتطلب صلاحيات المشرف
 * مع خيارات إضافية للتخصيص
 */
export function requireAdmin(options: { 
  language?: 'ar' | 'en'; 
  requireDatabaseCheck?: boolean;
  returnJson?: boolean;
  checkUserFirst?: boolean;
} = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { checkUserFirst = true } = options;

    // إذا كان المطلوب التحقق من المستخدم أولاً
    if (checkUserFirst) {
      return isAuthenticated(req, res, () => {
        isAdmin(req, res, next, options);
      }, { language: options.language, silent: false });
    }

    // التحقق من المشرف مباشرة (يتضمن التحقق من المصادقة)
    isAdmin(req, res, next, options);
  };
}

/**
 * Middleware للتحقق من permissions محددة
 * يمكن توسيعه لاحقاً لدعم صلاحيات أكثر تعقيداً
 */
export function requirePermission(permission: string, options: { 
  language?: 'ar' | 'en'; 
} = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { language = 'ar' } = options;
    const context = extractRequestContext(req);

    try {
      const user = req.user || req.session?.user;

      if (!user) {
        return isAuthenticated(req, res, next, { language });
      }

      // حالياً، نحن ندعم فقط صلاحية "admin"
      // يمكن توسيع هذا النظام لدعم صلاحيات أكثر تفصيلاً
      if (permission === 'admin') {
        return isAdmin(req, res, next, { language });
      }

      // صلاحيات أخرى يمكن إضافتها هنا
      logsService.logWarn('auth', `Unknown permission requested: ${permission}`, {
        action: 'unknown_permission',
        permission,
        userId: user?.id,
        username: user?.username,
        ...context
      });

      res.status(403).json({ 
        message: getErrorMessage('notAuthorized', language),
        error: 'Unknown permission'
      });
    } catch (error) {
      logsService.logError('auth', `Error checking permission: ${permission}`, {
        action: 'permission_check_error',
        permission,
        error: error instanceof Error ? error.message : String(error),
        ...context
      });

      res.status(500).json({ 
        message: getErrorMessage('authError', language),
        error: 'Internal server error'
      });
    }
  };
}

/**
 * دالة مساعدة للحصول على بيانات المستخدم الحالي
 * مع دعم أنماط مختلفة للمصادقة
 */
export function getCurrentUser(req: Request) {
  return req.user || req.session?.user || null;
}

/**
 * دالة مساعدة للتحقق من صلاحيات المستخدم دون middleware
 * مفيدة في الكود الداخلي
 */
export function checkUserPermission(user: any, permission: 'admin' | 'user' = 'user'): boolean {
  if (!user) return false;
  
  if (permission === 'admin') {
    return !!user.isAdmin;
  }
  
  return true; // مستخدم عادي
}

// تصدير دوال مساعدة إضافية للتوافق مع الكود القديم
export const authMiddleware = {
  isAuthenticated,
  isAdmin,
  requireUser,
  requireAdmin,
  requirePermission,
  getCurrentUser,
  checkUserPermission
};

export default authMiddleware;