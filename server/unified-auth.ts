/**
 * ============================================================================
 * UNIFIED AUTH MIDDLEWARE SYSTEM
 * ============================================================================
 * 
 * Replaces and consolidates:
 * - server/middleware/auth-middleware.ts
 * - server/middleware/auth-context-updater.ts
 * 
 * Provides a single, comprehensive auth system for the server
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { 
  getCurrentContext, 
  updateContextUser, 
  clearContextUser,
  getCurrentUserId,
  isCurrentUserAdmin 
} from './unified-context';
import { UnifiedErrorFactory } from '@shared/unified-systems';
import { ErrorCategory } from '@shared/error-types';

// ============================================================================
// INTERFACES
// ============================================================================

interface AuthOptions {
  language?: 'ar' | 'en';
  requireDatabaseCheck?: boolean;
  returnJson?: boolean;
  silent?: boolean;
  redirectTo?: string;
}

interface AuthResult {
  isAuthenticated: boolean;
  user: any;
  authMethod: 'passport' | 'session' | null;
}

// ============================================================================
// ERROR MESSAGES
// ============================================================================

const errorMessages = {
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

function getErrorMessage(key: keyof typeof errorMessages['ar'], language: 'ar' | 'en' = 'ar'): string {
  return errorMessages[language][key];
}

// ============================================================================
// CORE AUTH FUNCTIONS
// ============================================================================

/**
 * Check authentication state
 */
function checkAuthState(req: Request): AuthResult {
  // Check Passport.js authentication
  const isPassportAuthenticated = req.isAuthenticated && req.isAuthenticated() && req.user;
  
  // Check session authentication (for backward compatibility)
  const isSessionAuthenticated = req.session?.user?.id;

  if (isPassportAuthenticated) {
    return {
      isAuthenticated: true,
      user: req.user,
      authMethod: 'passport'
    };
  }

  if (isSessionAuthenticated) {
    return {
      isAuthenticated: true,
      user: req.session.user,
      authMethod: 'session'
    };
  }

  return {
    isAuthenticated: false,
    user: null,
    authMethod: null
  };
}

/**
 * Update context with user information
 */
function updateRequestContextWithUser(user: any): void {
  if (user) {
    updateContextUser({
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      isAdmin: user.isAdmin || false,
      preferredLanguage: user.preferredLanguage,
      preferredTheme: user.preferredTheme
    });
  } else {
    clearContextUser();
  }
}

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Unified Authentication Middleware
 * Replaces isAuthenticated from auth-middleware.ts
 */
export function unifiedAuth(options: AuthOptions = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { language = 'ar', silent = false } = options;

    try {
      const authState = checkAuthState(req);

      if (authState.isAuthenticated) {
        // Update context with user information
        updateRequestContextWithUser(authState.user);

        if (!silent) {
          console.log(`[UnifiedAuth] Authentication success: ${authState.user?.username}`);
        }
        return next();
      }

      // Authentication failed
      if (!silent) {
        console.warn('[UnifiedAuth] Authentication failed: User not authenticated');
      }

      // Handle redirect
      if (options.redirectTo) {
        return res.redirect(options.redirectTo);
      }

      const error = UnifiedErrorFactory.createAuthError(
        getErrorMessage('notAuthenticated', language)
      );

      res.status(401).json({
        success: false,
        error: {
          message: error.message,
          messageAr: error.messageAr,
          code: error.code,
          category: error.category
        }
      });
    } catch (error) {
      console.error('[UnifiedAuth] Error in authentication check:', error);

      const authError = UnifiedErrorFactory.create(
        ErrorCategory.SYSTEM,
        'AUTH_CHECK_ERROR',
        getErrorMessage('authError', language)
      );

      res.status(500).json({
        success: false,
        error: {
          message: authError.message,
          messageAr: authError.messageAr,
          code: authError.code,
          category: authError.category
        }
      });
    }
  };
}

/**
 * Unified Admin Check Middleware
 * Replaces isAdmin from auth-middleware.ts
 */
export function unifiedAdminAuth(options: AuthOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { 
      language = 'ar', 
      requireDatabaseCheck = false,
      returnJson = true 
    } = options;

    try {
      // First check authentication
      const authState = checkAuthState(req);

      if (!authState.isAuthenticated) {
        const error = UnifiedErrorFactory.createAuthError(
          getErrorMessage('notAuthenticated', language)
        );

        const response = returnJson 
          ? { 
              success: false,
              error: {
                message: error.message,
                messageAr: error.messageAr,
                code: error.code,
                category: error.category
              }
            }
          : { success: false, message: error.message };
        
        res.status(401).json(response);
        return;
      }

      const user = authState.user;

      // Update context with user information
      updateRequestContextWithUser(user);

      // Database check for sensitive operations
      if (requireDatabaseCheck && user?.id) {
        try {
          const dbUser = await storage.getUser(user.id);
          if (!dbUser || !dbUser.isAdmin) {
            console.warn(`[UnifiedAuth] Admin check failed (DB): User ${user?.username} is not admin`);

            const error = UnifiedErrorFactory.create(
              ErrorCategory.AUTHORIZATION,
              'ADMIN_ACCESS_DENIED',
              getErrorMessage('notAdmin', language)
            );

            const response = returnJson 
              ? { 
                  success: false,
                  error: {
                    message: error.message,
                    messageAr: error.messageAr,
                    code: error.code,
                    category: error.category
                  }
                }
              : { success: false, message: error.message };
            
            res.status(403).json(response);
            return;
          }

          console.log(`[UnifiedAuth] Admin access granted (DB): ${user?.username}`);
          next();
        } catch (dbError) {
          console.error(`[UnifiedAuth] Database error during admin check:`, dbError);

          const error = UnifiedErrorFactory.create(
            ErrorCategory.SYSTEM,
            'DB_CHECK_ERROR',
            getErrorMessage('authError', language)
          );

          const response = returnJson 
            ? { 
                success: false,
                error: {
                  message: error.message,
                  messageAr: error.messageAr,
                  code: error.code,
                  category: error.category
                }
              }
            : { success: false, message: error.message };
          
          res.status(500).json(response);
        }
        return;
      }

      // Quick memory check (normal method)
      if (!user?.isAdmin) {
        console.warn(`[UnifiedAuth] Admin check failed (session): User ${user?.username} is not admin`);

        const error = UnifiedErrorFactory.create(
          ErrorCategory.AUTHORIZATION,
          'ADMIN_ACCESS_DENIED',
          getErrorMessage('notAdmin', language)
        );

        const response = returnJson 
          ? { 
              success: false,
              error: {
                message: error.message,
                messageAr: error.messageAr,
                code: error.code,
                category: error.category
              }
            }
          : { success: false, message: error.message };
        
        res.status(403).json(response);
        return;
      }

      // Admin check passed
      console.log(`[UnifiedAuth] Admin access granted (session): ${user?.username}`);
      next();
    } catch (error) {
      console.error('[UnifiedAuth] Error in admin check:', error);

      const authError = UnifiedErrorFactory.create(
        ErrorCategory.SYSTEM,
        'ADMIN_CHECK_ERROR',
        getErrorMessage('authError', language)
      );

      const response = returnJson 
        ? { 
            success: false,
            error: {
              message: authError.message,
              messageAr: authError.messageAr,
              code: authError.code,
              category: authError.category
            }
          }
        : { success: false, message: authError.message };
      
      res.status(500).json(response);
    }
  };
}

/**
 * Context Updater Middleware
 * Replaces auth-context-updater.ts functionality
 */
export function unifiedContextUpdater(req: Request, res: Response, next: NextFunction): void {
  try {
    // Skip if already updated
    if ((req as any).__contextUpdated) {
      next();
      return;
    }
    
    // Only for auth-related routes to avoid unnecessary processing
    const isAuthRoute = req.path.startsWith('/api/user') || 
                       req.path.startsWith('/api/login') || 
                       req.path.startsWith('/api/logout');
    
    if (!isAuthRoute) {
      next();
      return;
    }
    
    // Check for authenticated user
    const authState = checkAuthState(req);
    
    if (authState.isAuthenticated) {
      const context = getCurrentContext();
      
      // Check if context needs updating
      const needsUpdate = !context || 
                         context.userId !== authState.user.id ||
                         context.username !== authState.user.username ||
                         context.isAdmin !== (authState.user.isAdmin || false);
      
      if (needsUpdate) {
        updateRequestContextWithUser(authState.user);
        
        // Update res.locals for backward compatibility
        if (res.locals.loggingContext) {
          Object.assign(res.locals.loggingContext, {
            userId: authState.user.id,
            username: authState.user.username,
            userDisplayName: authState.user.displayName || authState.user.username,
            isAdmin: authState.user.isAdmin || false,
            isAuthenticated: true
          });
        }
        
        if (process.env.NODE_ENV === 'development' && req.path === '/api/user') {
          console.log(`[UnifiedContextUpdater] Context updated for: ${authState.user.username}`);
        }
      }
      
      // Mark as updated
      (req as any).__contextUpdated = true;
    }
    
    next();
  } catch (error) {
    console.error('[UnifiedContextUpdater] Error updating context:', error);
    next();
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current authenticated user
 */
export function getCurrentUser(req?: Request): any {
  if (req) {
    return req.user || req.session?.user || null;
  }
  
  // Use context if no request provided
  const context = getCurrentContext();
  return context ? {
    id: context.userId,
    username: context.username,
    displayName: context.userDisplayName,
    isAdmin: context.isAdmin
  } : null;
}

/**
 * Check user permission without middleware
 */
export function checkUserPermission(user: any, permission: 'admin' | 'user' = 'user'): boolean {
  if (!user) return false;
  
  if (permission === 'admin') {
    return !!user.isAdmin;
  }
  
  return true; // Regular user
}

/**
 * Check if current request user is admin (using context)
 */
export function isCurrentRequestAdmin(): boolean {
  return isCurrentUserAdmin();
}

/**
 * Get current request user ID (using context)
 */
export function getCurrentRequestUserId(): number | undefined {
  return getCurrentUserId();
}

// ============================================================================
// SHORTCUT MIDDLEWARES
// ============================================================================

/**
 * Standard auth shortcuts
 */
export const requireUser = unifiedAuth({ language: 'ar' });
export const requireUserEN = unifiedAuth({ language: 'en' });
export const requireUserSilent = unifiedAuth({ language: 'ar', silent: true });

/**
 * Admin auth shortcuts
 */
export const requireAdmin = unifiedAdminAuth({ language: 'ar', returnJson: true });
export const requireAdminEN = unifiedAdminAuth({ language: 'en', returnJson: true });
export const requireAdminSecure = unifiedAdminAuth({ 
  language: 'ar', 
  requireDatabaseCheck: true, 
  returnJson: false 
});
export const requireAdminSecureJSON = unifiedAdminAuth({ 
  language: 'ar', 
  requireDatabaseCheck: true, 
  returnJson: true 
});

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Legacy exports for backward compatibility
 * @deprecated Use unified functions instead
 */
export const isAuthenticated = unifiedAuth;
export const isAdmin = unifiedAdminAuth;
export const requireUserAR = requireUser;
export const requireAdminAR = requireAdmin;
export const requireAdminDB = requireAdminSecure;
export const requireAdminFast = requireAdmin;
export const authContextUpdaterMiddleware = unifiedContextUpdater;

export const authMiddleware = {
  // Core functions
  unifiedAuth,
  unifiedAdminAuth,
  unifiedContextUpdater,
  getCurrentUser,
  checkUserPermission,
  
  // Shortcuts
  requireUser,
  requireUserEN,
  requireUserSilent,
  requireAdmin,
  requireAdminEN,
  requireAdminSecure,
  requireAdminSecureJSON,
  
  // Utility
  isCurrentRequestAdmin,
  getCurrentRequestUserId,
  
  // Legacy (deprecated but maintained for compatibility)
  isAuthenticated: unifiedAuth,
  isAdmin: unifiedAdminAuth,
  requireUserAR: requireUser,
  requireAdminAR: requireAdmin,
  requireAdminDB: requireAdminSecure,
  requireAdminFast: requireAdmin,
  authContextUpdaterMiddleware: unifiedContextUpdater
};

export default authMiddleware;