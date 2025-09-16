/**
 * ============================================================================
 * UNIFIED CLIENT CONTEXT SYSTEM
 * ============================================================================
 * 
 * Replaces and consolidates:
 * - client/src/hooks/use-auth.tsx
 * - client/src/hooks/use-admin-check.tsx
 * - client/src/hooks/use-theme.tsx
 * - client/src/hooks/use-connection.tsx
 * - client/src/hooks/use-session-monitor.tsx
 * - client/src/lib/themeSystem.ts
 * - Multiple context providers and state management
 * 
 * Provides a single, comprehensive context for the entire app
 * ============================================================================
 */

import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  UnifiedAppState,
  UnifiedAction,
  UnifiedAuthState,
  UnifiedConnectionState,
  UnifiedSessionState,
  UnifiedError,
  UnifiedNotification,
  UnifiedErrorFactory,
  Theme,
  User
} from '@shared/unified-systems';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: UnifiedAppState = {
  // Core systems
  context: null,
  auth: {
    user: null,
    isLoading: false,
    error: null,
    sessionChecked: false,
    isAdmin: false,
    loginAttempts: 0,
    lastActivity: Date.now()
  },
  connection: {
    isOnline: navigator.onLine,
    isConnected: false,
    isChecking: false,
    lastCheckTime: null,
    failedAttempts: 0,
    quality: 'offline'
  },
  session: {
    isActive: false,
    lastActivity: Date.now(),
    warningShown: false,
    expiresAt: null,
    timeoutWarning: false
  },
  
  // UI state
  theme: 'system',
  language: 'en',
  notifications: [],
  
  // Error state
  errors: [],
  errorReports: new Map(),
  
  // Feature states
  chat: {
    messages: [],
    isConnected: false,
    onlineUsers: 0,
    pendingMessages: []
  },
  trading: {
    signals: [],
    marketStatus: {
      isOpen: false,
      timezone: 'UTC'
    },
    positions: [],
    balance: 0
  },
  admin: {
    users: [],
    logs: [],
    systemMetrics: {
      uptime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      activeUsers: 0,
      errorRate: 0
    },
    settings: {
      maintenanceMode: false,
      registrationEnabled: true,
      debugMode: false,
      logLevel: 'info'
    }
  },
  
  // System state
  isInitialized: false,
  debugMode: process.env.NODE_ENV === 'development',
  offlineMode: false
};

// ============================================================================
// REDUCER
// ============================================================================

function unifiedAppReducer(state: UnifiedAppState, action: UnifiedAction): UnifiedAppState {
  switch (action.type) {
    case 'SET_CONTEXT':
      return { ...state, context: action.payload };

    case 'SET_AUTH':
      return {
        ...state,
        auth: { ...state.auth, ...action.payload },
        session: {
          ...state.session,
          isActive: !!action.payload.user,
          lastActivity: action.payload.user ? Date.now() : state.session.lastActivity
        }
      };

    case 'SET_CONNECTION':
      return {
        ...state,
        connection: { ...state.connection, ...action.payload }
      };

    case 'SET_SESSION':
      return {
        ...state,
        session: { ...state.session, ...action.payload }
      };

    case 'SET_THEME':
      return { ...state, theme: action.payload };

    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };

    case 'ADD_ERROR':
      return {
        ...state,
        errors: [action.payload, ...state.errors].slice(0, 100) // Keep last 100 errors
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: action.payload 
          ? state.errors.filter(error => !action.payload!.includes(error.id))
          : []
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 10) // Keep last 10 notifications
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };

    case 'SET_FEATURE_STATE':
      return {
        ...state,
        [action.payload.feature]: {
          ...state[action.payload.feature as keyof UnifiedAppState],
          ...action.payload.state
        }
      };

    case 'INITIALIZE_APP':
      return {
        ...state,
        ...action.payload,
        isInitialized: true
      };

    case 'RESET_STATE':
      return {
        ...initialState,
        theme: state.theme, // Preserve theme
        language: state.language, // Preserve language
        debugMode: state.debugMode // Preserve debug mode
      };

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface UnifiedAppContextValue {
  // State
  state: UnifiedAppState;
  dispatch: React.Dispatch<UnifiedAction>;
  
  // Auth actions
  login: (credentials: { username: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  register: (credentials: { username: string; password: string }) => Promise<User>;
  checkAuth: () => Promise<void>;
  
  // Theme actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  
  // Language actions
  setLanguage: (language: string) => void;
  
  // Connection actions
  checkConnection: () => Promise<boolean>;
  
  // Error actions
  addError: (error: UnifiedError) => void;
  clearErrors: (errorIds?: string[]) => void;
  reportError: (error: Error | string, context?: any) => void;
  
  // Notification actions
  addNotification: (notification: Omit<UnifiedNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  
  // Utility actions
  initialize: () => Promise<void>;
  reset: () => void;
  updateFeatureState: (feature: string, state: any) => void;
}

const UnifiedAppContext = createContext<UnifiedAppContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface UnifiedAppProviderProps {
  children: ReactNode;
}

export function UnifiedAppProvider({ children }: UnifiedAppProviderProps) {
  const [state, dispatch] = useReducer(unifiedAppReducer, initialState);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const hasCheckedSession = useRef(false);

  // ============================================================================
  // AUTH QUERIES AND MUTATIONS
  // ============================================================================

  // Get current user
  const {
    data: userData,
    isLoading: authLoading,
    error: authError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      // Prevent multiple checks
      if (hasCheckedSession.current && state.auth.sessionChecked) {
        return state.auth.user;
      }

      const response = await fetch("/api/user", {
        credentials: "include",
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          hasCheckedSession.current = true;
          return null;
        }
        throw new Error(`Failed to fetch user: ${response.statusText}`);
      }

      const userData = await response.json();
      hasCheckedSession.current = true;
      return userData;
    },
    retry: false,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 60 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: !state.auth.sessionChecked,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }): Promise<User> => {
      const response = await apiRequest('POST', '/api/login', credentials);
      return await response.json();
    },
    onSuccess: (userData) => {
      dispatch({ 
        type: 'SET_AUTH', 
        payload: { 
          user: userData, 
          error: null,
          sessionChecked: true,
          isAdmin: userData.isAdmin || false,
          loginAttempts: 0
        } 
      });
      hasCheckedSession.current = false;
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Apply user preferences
      if (userData.preferredTheme) {
        dispatch({ type: 'SET_THEME', payload: userData.preferredTheme as Theme });
      }
      if (userData.preferredLanguage) {
        dispatch({ type: 'SET_LANGUAGE', payload: userData.preferredLanguage });
      }
    },
    onError: (error) => {
      dispatch({ 
        type: 'SET_AUTH', 
        payload: { 
          error: String(error),
          loginAttempts: state.auth.loginAttempts + 1
        } 
      });
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await apiRequest('POST', '/api/logout');
    },
    onSuccess: () => {
      dispatch({ 
        type: 'SET_AUTH', 
        payload: { 
          user: null, 
          error: null,
          sessionChecked: true,
          isAdmin: false,
          loginAttempts: 0
        } 
      });
      hasCheckedSession.current = false;
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Reset to default preferences
      dispatch({ type: 'SET_THEME', payload: 'system' });
      dispatch({ type: 'SET_LANGUAGE', payload: 'en' });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }): Promise<User> => {
      const response = await apiRequest('POST', '/api/register', credentials);
      return await response.json();
    },
    onSuccess: (userData) => {
      dispatch({ 
        type: 'SET_AUTH', 
        payload: { 
          user: userData, 
          error: null,
          sessionChecked: true,
          isAdmin: userData.isAdmin || false,
          loginAttempts: 0
        } 
      });
      hasCheckedSession.current = false;
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error) => {
      dispatch({ 
        type: 'SET_AUTH', 
        payload: { 
          error: String(error)
        } 
      });
    }
  });

  // ============================================================================
  // CONNECTION MONITORING
  // ============================================================================

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (state.connection.isChecking) return state.connection.isOnline;

    dispatch({ 
      type: 'SET_CONNECTION', 
      payload: { isChecking: true } 
    });

    try {
      if (!navigator.onLine) {
        dispatch({ 
          type: 'SET_CONNECTION', 
          payload: { 
            isOnline: false, 
            isConnected: false,
            isChecking: false,
            quality: 'offline'
          } 
        });
        return false;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/health', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal,
        credentials: 'include'
      });

      clearTimeout(timeoutId);

      const isConnected = response.ok;
      const quality = isConnected ? 'excellent' : 'poor';

      dispatch({ 
        type: 'SET_CONNECTION', 
        payload: { 
          isOnline: true,
          isConnected,
          isChecking: false,
          lastCheckTime: Date.now(),
          failedAttempts: isConnected ? 0 : state.connection.failedAttempts + 1,
          quality
        } 
      });

      return isConnected;
    } catch (error) {
      dispatch({ 
        type: 'SET_CONNECTION', 
        payload: { 
          isOnline: false,
          isConnected: false,
          isChecking: false,
          lastCheckTime: Date.now(),
          failedAttempts: state.connection.failedAttempts + 1,
          quality: 'offline'
        } 
      });
      return false;
    }
  }, [state.connection.isChecking, state.connection.failedAttempts]);

  // ============================================================================
  // SESSION MONITORING
  // ============================================================================

  useEffect(() => {
    if (!state.auth.user) return;

    const updateActivity = () => {
      dispatch({ 
        type: 'SET_SESSION', 
        payload: { 
          lastActivity: Date.now(),
          warningShown: false
        } 
      });
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    const sessionCheck = setInterval(() => {
      const timeSinceActive = Date.now() - state.session.lastActivity;
      const thirtyMinutes = 30 * 60 * 1000;

      if (timeSinceActive > thirtyMinutes && !state.session.warningShown) {
        dispatch({ 
          type: 'SET_SESSION', 
          payload: { 
            warningShown: true,
            timeoutWarning: true
          } 
        });
        
        toast({
          title: "⚠️ Session Warning",
          description: "Your session will expire soon due to inactivity. Please interact with the page to continue.",
          variant: "destructive",
          duration: 10000
        });
      }
    }, 60000); // Check every minute

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
      clearInterval(sessionCheck);
    };
  }, [state.auth.user, state.session.lastActivity, state.session.warningShown, toast]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Update auth state when query data changes
  useEffect(() => {
    if (!authLoading && !state.auth.sessionChecked) {
      dispatch({ 
        type: 'SET_AUTH', 
        payload: { 
          sessionChecked: true,
          isLoading: false
        } 
      });
    }

    if (userData && typeof userData === 'object') {
      const userDataObj = userData as User;
      if (!state.auth.user || state.auth.user.id !== userDataObj.id) {
        dispatch({ 
          type: 'SET_AUTH', 
          payload: { 
            user: userDataObj,
            isAdmin: userDataObj.isAdmin || false,
            error: null
          } 
        });

        // Apply user preferences
        if (userDataObj.preferredTheme) {
          dispatch({ type: 'SET_THEME', payload: userDataObj.preferredTheme as Theme });
        }
        if (userDataObj.preferredLanguage) {
          dispatch({ type: 'SET_LANGUAGE', payload: userDataObj.preferredLanguage });
        }
      }
    } else if (userData === null && state.auth.user !== null) {
      dispatch({ 
        type: 'SET_AUTH', 
        payload: { 
          user: null,
          isAdmin: false,
          error: null
        } 
      });
    }
  }, [userData, authLoading, state.auth.sessionChecked, state.auth.user]);

  // Update auth loading state
  useEffect(() => {
    const isLoading = authLoading || loginMutation.isPending || logoutMutation.isPending || registerMutation.isPending;
    if (state.auth.isLoading !== isLoading) {
      dispatch({ 
        type: 'SET_AUTH', 
        payload: { isLoading } 
      });
    }
  }, [authLoading, loginMutation.isPending, logoutMutation.isPending, registerMutation.isPending, state.auth.isLoading]);

  // Handle auth errors
  useEffect(() => {
    const error = authError 
      ? String(authError)
      : loginMutation.error
      ? String(loginMutation.error) 
      : logoutMutation.error
      ? String(logoutMutation.error)
      : registerMutation.error
      ? String(registerMutation.error)
      : null;

    if (error && state.auth.error !== error) {
      dispatch({ 
        type: 'SET_AUTH', 
        payload: { error } 
      });
    }
  }, [authError, loginMutation.error, logoutMutation.error, registerMutation.error, state.auth.error]);

  // Connection monitoring
  useEffect(() => {
    const handleOnline = () => checkConnection();
    const handleOffline = () => {
      dispatch({ 
        type: 'SET_CONNECTION', 
        payload: { 
          isOnline: false,
          isConnected: false,
          quality: 'offline'
        } 
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection check
    checkConnection();

    // Periodic checks
    const intervalId = setInterval(checkConnection, 90000); // Every 1.5 minutes

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [checkConnection]);

  // Theme management
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (state.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      root.setAttribute('data-theme', systemTheme);
    } else {
      root.classList.add(state.theme);
      root.setAttribute('data-theme', state.theme);
    }
  }, [state.theme]);

  // ============================================================================
  // ACTION FUNCTIONS
  // ============================================================================

  const setTheme = useCallback((theme: Theme) => {
    dispatch({ type: 'SET_THEME', payload: theme });
    
    // Save to database if user is logged in
    if (state.auth.user) {
      fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredTheme: theme }),
        credentials: 'include'
      }).catch(error => {
        console.error('Failed to save theme preference:', error);
      });
    } else {
      // Save to localStorage for non-authenticated users
      try {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        settings.theme = theme;
        localStorage.setItem('settings', JSON.stringify(settings));
      } catch (error) {
        console.error('Failed to save theme to localStorage:', error);
      }
    }
  }, [state.auth.user]);

  const toggleTheme = useCallback(() => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [state.theme, setTheme]);

  const setLanguage = useCallback((language: string) => {
    dispatch({ type: 'SET_LANGUAGE', payload: language });
    
    // Save to database if user is logged in
    if (state.auth.user) {
      fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredLanguage: language }),
        credentials: 'include'
      }).catch(error => {
        console.error('Failed to save language preference:', error);
      });
    }
  }, [state.auth.user]);

  const addError = useCallback((error: UnifiedError) => {
    dispatch({ type: 'ADD_ERROR', payload: error });
  }, []);

  const clearErrors = useCallback((errorIds?: string[]) => {
    dispatch({ type: 'CLEAR_ERRORS', payload: errorIds });
  }, []);

  const reportError = useCallback((error: Error | string, context?: any) => {
    const unifiedError = typeof error === 'string' 
      ? UnifiedErrorFactory.create('system' as any, 'GENERAL_ERROR', error, {
          details: context
        })
      : UnifiedErrorFactory.create('system' as any, 'JAVASCRIPT_ERROR', error.message, {
          details: { stack: error.stack, context }
        });

    addError(unifiedError);

    // Send to server if online
    if (state.connection.isConnected) {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unifiedError),
        credentials: 'include'
      }).catch(reportingError => {
        console.warn('Failed to report error:', reportingError);
      });
    }
  }, [addError, state.connection.isConnected]);

  const addNotification = useCallback((notification: Omit<UnifiedNotification, 'id' | 'timestamp'>) => {
    const fullNotification: UnifiedNotification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    dispatch({ type: 'ADD_NOTIFICATION', payload: fullNotification });
    
    // Auto-remove after duration
    if (notification.duration) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: fullNotification.id });
      }, notification.duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const initialize = useCallback(async () => {
    // Load saved preferences
    try {
      const settings = JSON.parse(localStorage.getItem('settings') || '{}');
      if (settings.theme) {
        dispatch({ type: 'SET_THEME', payload: settings.theme });
      }
      if (settings.language) {
        dispatch({ type: 'SET_LANGUAGE', payload: settings.language });
      }
    } catch (error) {
      console.error('Failed to load saved settings:', error);
    }

    dispatch({ type: 'INITIALIZE_APP', payload: {} });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
    queryClient.clear();
  }, [queryClient]);

  const updateFeatureState = useCallback((feature: string, featureState: any) => {
    dispatch({ type: 'SET_FEATURE_STATE', payload: { feature, state: featureState } });
  }, []);

  const checkAuth = useCallback(async () => {
    await refetchUser();
  }, [refetchUser]);

  // Initialize app
  useEffect(() => {
    if (!state.isInitialized) {
      initialize();
    }
  }, [state.isInitialized, initialize]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: UnifiedAppContextValue = {
    // State
    state,
    dispatch,
    
    // Auth actions
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    checkAuth,
    
    // Theme actions
    setTheme,
    toggleTheme,
    
    // Language actions
    setLanguage,
    
    // Connection actions
    checkConnection,
    
    // Error actions
    addError,
    clearErrors,
    reportError,
    
    // Notification actions
    addNotification,
    removeNotification,
    
    // Utility actions
    initialize,
    reset,
    updateFeatureState,
  };

  return (
    <UnifiedAppContext.Provider value={value}>
      {children}
    </UnifiedAppContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useUnifiedApp() {
  const context = useContext(UnifiedAppContext);
  if (context === undefined) {
    throw new Error('useUnifiedApp must be used within a UnifiedAppProvider');
  }
  return context;
}

// Legacy hooks for backward compatibility
export function useAuth() {
  const { state, login, logout, register, checkAuth } = useUnifiedApp();
  return {
    user: state.auth.user,
    isLoading: state.auth.isLoading,
    error: state.auth.error,
    sessionChecked: state.auth.sessionChecked,
    login,
    logout,
    register,
    setUser: () => {}, // Legacy function, use dispatch directly
    refetch: checkAuth
  };
}

export function useAdminCheck() {
  const { state } = useUnifiedApp();
  return {
    isAdmin: state.auth.isAdmin,
    isLoading: state.auth.isLoading,
    error: state.auth.error,
    user: state.auth.user,
    renderAccessDenied: () => (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-access-denied">
            Access Denied
          </h1>
          <p className="text-muted-foreground" data-testid="text-admin-required">
            Administrator privileges required
          </p>
        </div>
      </div>
    )
  };
}

export function useTheme() {
  const { state, setTheme } = useUnifiedApp();
  return {
    theme: state.theme,
    setTheme
  };
}

export function useConnection() {
  const { state, checkConnection } = useUnifiedApp();
  return {
    isOnline: state.connection.isOnline,
    isConnected: state.connection.isConnected,
    isChecking: state.connection.isChecking,
    lastCheckTime: state.connection.lastCheckTime,
    checkConnection,
    resetState: () => {} // Legacy function
  };
}

export { UnifiedAppProvider, UnifiedAppContext };