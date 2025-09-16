/**
 * ============================================================================
 * UNIFIED SERVER CONTEXT SYSTEM
 * ============================================================================
 * 
 * Replaces and consolidates:
 * - server/middleware/request-context.ts
 * - server/middleware/logging-context.ts
 * 
 * Provides a single, efficient context system for the server
 * ============================================================================
 */

import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { UnifiedContext, UnifiedContextSchema } from '@shared/unified-systems';

// ============================================================================
// UNIFIED CONTEXT STORAGE
// ============================================================================

/**
 * Single AsyncLocalStorage instance for all context needs
 */
const unifiedContextStorage = new AsyncLocalStorage<UnifiedContext>();

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Unified Context Middleware
 * Replaces both requestContextMiddleware and loggingContextMiddleware
 */
export function unifiedContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Create unified context
    const context = createUnifiedContext(req);

    // Validate context
    const validationResult = UnifiedContextSchema.safeParse(context);
    if (!validationResult.success) {
      console.warn('[UnifiedContext] Context validation failed:', validationResult.error);
    }

    // Set context in res.locals for backward compatibility
    res.locals.loggingContext = context;
    res.locals.requestContext = context;

    // Add request ID to response header
    res.set('X-Request-ID', context.requestId);

    // Run with unified context
    unifiedContextStorage.run(context, () => {
      next();
    });

  } catch (error) {
    console.error('[UnifiedContext] Error in unified context middleware:', error);

    // Fallback context
    const fallbackContext = createFallbackContext(req);
    res.locals.loggingContext = fallbackContext;
    res.locals.requestContext = fallbackContext;

    unifiedContextStorage.run(fallbackContext, () => {
      next();
    });
  }
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

/**
 * Create unified context from request
 */
function createUnifiedContext(req: Request): UnifiedContext {
  const requestId = randomUUID();

  return {
    requestId,
    sessionId: req.sessionID || undefined,
    userId: req.user?.id,
    username: req.user?.username,
    userDisplayName: req.user?.displayName || req.user?.username,
    isAdmin: req.user?.isAdmin ?? undefined,
    isAuthenticated: !!(req.user?.id),
    clientIP: extractClientIP(req),
    userAgent: req.get('User-Agent') || 'Unknown',
    timestamp: new Date().toISOString(),
    route: req.route?.path || req.path,
    method: req.method,
    startTime: Date.now(),
    language: req.user?.preferredLanguage || extractLanguageFromHeaders(req),
    theme: req.user?.preferredTheme as any || 'system'
  };
}

/**
 * Create fallback context for error cases
 */
function createFallbackContext(req: Request): UnifiedContext {
  return {
    requestId: randomUUID(),
    clientIP: req.ip || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    timestamp: new Date().toISOString(),
    route: req.route?.path || req.path,
    method: req.method,
    startTime: Date.now(),
    isAuthenticated: false
  };
}

/**
 * Extract client IP with proxy support
 */
function extractClientIP(req: Request): string {
  // Check X-Forwarded-For header
  const xForwardedFor = req.get('X-Forwarded-For');
  if (xForwardedFor) {
    const firstIP = xForwardedFor.split(',')[0].trim();
    if (firstIP) return firstIP;
  }

  // Check other common headers
  const xRealIP = req.get('X-Real-IP');
  if (xRealIP) return xRealIP;

  const xClientIP = req.get('X-Client-IP');
  if (xClientIP) return xClientIP;

  // Fallback to req.ip
  return req.ip || 'unknown';
}

/**
 * Extract language from request headers
 */
function extractLanguageFromHeaders(req: Request): string {
  const acceptLanguage = req.get('Accept-Language');
  if (acceptLanguage) {
    // Parse Accept-Language header and return first language
    const languages = acceptLanguage.split(',').map(lang => lang.split(';')[0].trim());
    const firstLang = languages[0];
    if (firstLang) {
      // Convert to our supported languages
      if (firstLang.startsWith('ar')) return 'ar';
      if (firstLang.startsWith('en')) return 'en';
    }
  }
  return 'en'; // Default to English
}

// ============================================================================
// CONTEXT ACCESS FUNCTIONS
// ============================================================================

/**
 * Get current context from AsyncLocalStorage
 */
export function getCurrentContext(): UnifiedContext | undefined {
  return unifiedContextStorage.getStore();
}

/**
 * Get context with guarantee (throws if not available)
 */
export function requireCurrentContext(): UnifiedContext {
  const context = getCurrentContext();
  if (!context) {
    throw new Error('Unified context not available - ensure unifiedContextMiddleware is properly setup');
  }
  return context;
}

/**
 * Get current user ID
 */
export function getCurrentUserId(): number | undefined {
  return getCurrentContext()?.userId;
}

/**
 * Get current username
 */
export function getCurrentUsername(): string | undefined {
  return getCurrentContext()?.username;
}

/**
 * Check if current user is admin
 */
export function isCurrentUserAdmin(): boolean {
  return getCurrentContext()?.isAdmin === true;
}

/**
 * Check if current user is authenticated
 */
export function isCurrentUserAuthenticated(): boolean {
  return getCurrentContext()?.isAuthenticated === true;
}

/**
 * Get current request ID
 */
export function getCurrentRequestId(): string | undefined {
  return getCurrentContext()?.requestId;
}

/**
 * Get current language
 */
export function getCurrentLanguage(): string {
  return getCurrentContext()?.language || 'en';
}

/**
 * Get current theme
 */
export function getCurrentTheme(): string {
  return getCurrentContext()?.theme || 'system';
}

// ============================================================================
// CONTEXT MANIPULATION
// ============================================================================

/**
 * Update current context with new data
 */
export function updateCurrentContext(updates: Partial<UnifiedContext>): void {
  const context = getCurrentContext();
  if (context) {
    Object.assign(context, updates);
  }
}

/**
 * Update user information in context
 */
export function updateContextUser(user: {
  id: number;
  username: string;
  displayName?: string;
  isAdmin?: boolean;
  preferredLanguage?: string;
  preferredTheme?: string;
}): void {
  updateCurrentContext({
    userId: user.id,
    username: user.username,
    userDisplayName: user.displayName || user.username,
    isAdmin: user.isAdmin || false,
    isAuthenticated: true,
    language: user.preferredLanguage || getCurrentLanguage(),
    theme: user.preferredTheme as any || getCurrentTheme()
  });
}

/**
 * Clear user information from context (logout)
 */
export function clearContextUser(): void {
  updateCurrentContext({
    userId: undefined,
    username: undefined,
    userDisplayName: undefined,
    isAdmin: undefined,
    isAuthenticated: false
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format context for logging
 */
export function formatContext(context?: UnifiedContext): Record<string, any> {
  if (!context) return {};

  return {
    requestId: context.requestId,
    sessionId: context.sessionId,
    userId: context.userId,
    username: context.username,
    userDisplayName: context.userDisplayName,
    isAdmin: context.isAdmin,
    isAuthenticated: context.isAuthenticated,
    clientIP: context.clientIP,
    userAgent: context.userAgent,
    timestamp: context.timestamp,
    route: context.route,
    method: context.method,
    language: context.language,
    theme: context.theme,
    processingTime: context.startTime ? Date.now() - context.startTime : undefined
  };
}

/**
 * Run function with specific context
 */
export function runWithContext<T>(context: UnifiedContext, fn: () => T): T {
  return unifiedContextStorage.run(context, fn);
}

/**
 * Create system context for non-HTTP operations
 */
export function createSystemContext(systemName: string = 'system'): UnifiedContext {
  return {
    requestId: `system_${randomUUID()}`,
    clientIP: 'system',
    userAgent: `System/${systemName}`,
    timestamp: new Date().toISOString(),
    route: `/system/${systemName}`,
    method: 'SYSTEM',
    startTime: Date.now(),
    isAuthenticated: false,
    language: 'en',
    theme: 'system'
  };
}

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Legacy function for backward compatibility
 * @deprecated Use getCurrentContext() instead
 */
export function getLoggingContext(res?: Response): UnifiedContext | undefined {
  // Try AsyncLocalStorage first
  const asyncContext = getCurrentContext();
  if (asyncContext) return asyncContext;

  // Fallback to res.locals
  if (res?.locals?.loggingContext) {
    return res.locals.loggingContext;
  }

  return undefined;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getCurrentContext() instead
 */
export function getRequestContext(res?: Response): UnifiedContext | undefined {
  return getLoggingContext(res);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  unifiedContextStorage,
  UnifiedContext
};

// Type declarations for Express
declare global {
  namespace Express {
    interface Locals {
      loggingContext?: UnifiedContext;
      requestContext?: UnifiedContext;
    }
  }
}