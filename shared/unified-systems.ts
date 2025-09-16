/**
 * ============================================================================
 * UNIFIED CONTEXT & STATE MANAGEMENT SYSTEM
 * ============================================================================
 * 
 * This file consolidates all duplicate context and state management systems
 * across the project into a unified, efficient architecture.
 * 
 * Consolidates:
 * - Context systems (request-context.ts + logging-context.ts)
 * - Auth systems (client hooks + server middleware)
 * - Error handling (client + server error systems)
 * - Theme systems (use-theme.tsx + themeSystem.ts)
 * - Connection/Session systems (use-connection + use-session-monitor)
 * - State management patterns
 * 
 * Benefits:
 * - Eliminates duplication
 * - Improves performance
 * - Simplifies maintenance
 * - Provides consistent patterns
 * - Reduces bundle size
 * ============================================================================
 */

import { z } from 'zod';

// ============================================================================
// CORE TYPES & INTERFACES
// ============================================================================

/**
 * Unified Request/Context Interface
 * Replaces RequestContext and LoggingContext
 */
export interface UnifiedContext {
  // Request identification
  requestId: string;
  sessionId?: string;
  
  // User information
  userId?: number;
  username?: string;
  userDisplayName?: string;
  isAdmin?: boolean;
  
  // Request metadata
  clientIP: string;
  userAgent: string;
  timestamp: string;
  route?: string;
  method?: string;
  startTime?: number;
  
  // Additional tracking
  language?: string;
  theme?: Theme;
  isAuthenticated?: boolean;
}

/**
 * Unified Auth State
 * Consolidates all auth-related state
 */
export interface UnifiedAuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  sessionChecked: boolean;
  isAdmin: boolean;
  loginAttempts: number;
  lastActivity: number;
}

/**
 * Unified Error Interface
 * Consolidates client and server error handling
 */
export interface UnifiedError {
  id: string;
  category: ErrorCategory;
  code: string;
  message: string;
  messageAr: string;
  severity: ErrorSeverity;
  timestamp: string;
  context?: UnifiedContext;
  details?: Record<string, any>;
  userFriendly: boolean;
  retryable: boolean;
  reported: boolean;
}

/**
 * Theme System Types
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Connection State
 */
export interface UnifiedConnectionState {
  isOnline: boolean;
  isConnected: boolean;
  isChecking: boolean;
  lastCheckTime: number | null;
  failedAttempts: number;
  quality: 'excellent' | 'good' | 'poor' | 'offline';
}

/**
 * Session State
 */
export interface UnifiedSessionState {
  isActive: boolean;
  lastActivity: number;
  warningShown: boolean;
  expiresAt: number | null;
  timeoutWarning: boolean;
}

// ============================================================================
// UNIFIED STATE MANAGEMENT TYPES
// ============================================================================

/**
 * Global App State
 * Consolidates all state across the application
 */
export interface UnifiedAppState {
  // Core systems
  context: UnifiedContext | null;
  auth: UnifiedAuthState;
  connection: UnifiedConnectionState;
  session: UnifiedSessionState;
  
  // UI state
  theme: Theme;
  language: string;
  notifications: UnifiedNotification[];
  
  // Error state
  errors: UnifiedError[];
  errorReports: Map<string, number>;
  
  // Feature states
  chat: ChatState;
  trading: TradingState;
  admin: AdminState;
  
  // System state
  isInitialized: boolean;
  debugMode: boolean;
  offlineMode: boolean;
}

/**
 * Unified Actions
 * All state mutations go through these actions
 */
export type UnifiedAction = 
  | { type: 'SET_CONTEXT'; payload: UnifiedContext }
  | { type: 'SET_AUTH'; payload: Partial<UnifiedAuthState> }
  | { type: 'SET_CONNECTION'; payload: Partial<UnifiedConnectionState> }
  | { type: 'SET_SESSION'; payload: Partial<UnifiedSessionState> }
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'SET_LANGUAGE'; payload: string }
  | { type: 'ADD_ERROR'; payload: UnifiedError }
  | { type: 'CLEAR_ERRORS'; payload?: string[] }
  | { type: 'ADD_NOTIFICATION'; payload: UnifiedNotification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'SET_FEATURE_STATE'; payload: { feature: string; state: any } }
  | { type: 'INITIALIZE_APP'; payload: Partial<UnifiedAppState> }
  | { type: 'RESET_STATE' };

// ============================================================================
// ERROR SYSTEM CONSOLIDATION
// ============================================================================

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  DATABASE = 'database',
  API_LIMIT = 'api_limit',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Unified Error Factory
 * Replaces multiple error creation functions
 */
export class UnifiedErrorFactory {
  static create(
    category: ErrorCategory,
    code: string,
    message: string,
    options?: {
      messageAr?: string;
      severity?: ErrorSeverity;
      context?: UnifiedContext;
      details?: Record<string, any>;
      userFriendly?: boolean;
      retryable?: boolean;
    }
  ): UnifiedError {
    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category,
      code,
      message,
      messageAr: options?.messageAr || message,
      severity: options?.severity || ErrorSeverity.MEDIUM,
      timestamp: new Date().toISOString(),
      context: options?.context,
      details: options?.details,
      userFriendly: options?.userFriendly ?? true,
      retryable: options?.retryable ?? false,
      reported: false
    };
  }

  static createAuthError(message: string, userId?: number): UnifiedError {
    return this.create(ErrorCategory.AUTHENTICATION, 'AUTH_FAILED', message, {
      severity: ErrorSeverity.HIGH,
      details: { userId },
      retryable: true
    });
  }

  static createNetworkError(message: string, url?: string): UnifiedError {
    return this.create(ErrorCategory.NETWORK, 'NETWORK_ERROR', message, {
      severity: ErrorSeverity.MEDIUM,
      details: { url },
      retryable: true
    });
  }

  static createValidationError(field: string, value: any): UnifiedError {
    return this.create(ErrorCategory.VALIDATION, 'VALIDATION_ERROR', 
      `Validation failed for field: ${field}`, {
      severity: ErrorSeverity.LOW,
      details: { field, value },
      retryable: false
    });
  }
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

export interface UnifiedNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
  timestamp: number;
}

// ============================================================================
// FEATURE STATE INTERFACES
// ============================================================================

export interface ChatState {
  messages: Message[];
  isConnected: boolean;
  onlineUsers: number;
  pendingMessages: Message[];
}

export interface TradingState {
  signals: Signal[];
  marketStatus: MarketStatus;
  positions: Position[];
  balance: number;
}

export interface AdminState {
  users: User[];
  logs: LogEntry[];
  systemMetrics: SystemMetrics;
  settings: AdminSettings;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface User {
  id: number;
  username: string;
  displayName?: string;
  email?: string;
  role: string;
  isAdmin: boolean;
  preferredLanguage?: string;
  preferredTheme?: Theme;
  lastActivity?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  text: string;
  sender: string;
  avatar: string;
  timestamp: number;
}

export interface Signal {
  id: string;
  symbol: string;
  direction: 'buy' | 'sell';
  confidence: number;
  timestamp: number;
}

export interface Position {
  id: string;
  symbol: string;
  size: number;
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  pnl: number;
}

export interface MarketStatus {
  isOpen: boolean;
  nextOpen?: string;
  nextClose?: string;
  timezone: string;
}

export interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  context?: UnifiedContext;
}

export interface SystemMetrics {
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeUsers: number;
  errorRate: number;
}

export interface AdminSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  debugMode: boolean;
  logLevel: string;
}

// ============================================================================
// EXPORT CONSOLIDATED TYPES
// ============================================================================

export type {
  UnifiedContext as RequestContext, // For backward compatibility
  UnifiedContext as LoggingContext, // For backward compatibility
  UnifiedAppState,
  UnifiedAction,
  UnifiedAuthState,
  UnifiedError,
  UnifiedConnectionState,
  UnifiedSessionState,
  UnifiedNotification
};

export {
  UnifiedErrorFactory,
  ErrorCategory,
  ErrorSeverity
};

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const UnifiedContextSchema = z.object({
  requestId: z.string(),
  sessionId: z.string().optional(),
  userId: z.number().optional(),
  username: z.string().optional(),
  userDisplayName: z.string().optional(),
  isAdmin: z.boolean().optional(),
  clientIP: z.string(),
  userAgent: z.string(),
  timestamp: z.string(),
  route: z.string().optional(),
  method: z.string().optional(),
  startTime: z.number().optional(),
  language: z.string().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  isAuthenticated: z.boolean().optional()
});

export const UnifiedErrorSchema = z.object({
  id: z.string(),
  category: z.nativeEnum(ErrorCategory),
  code: z.string(),
  message: z.string(),
  messageAr: z.string(),
  severity: z.nativeEnum(ErrorSeverity),
  timestamp: z.string(),
  context: UnifiedContextSchema.optional(),
  details: z.record(z.any()).optional(),
  userFriendly: z.boolean(),
  retryable: z.boolean(),
  reported: z.boolean()
});