import { useContext, createContext, useState, ReactNode, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest, getQueryFn } from '@/lib/queryClient';
import { User } from '@shared/schema';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: { username: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  register: (credentials: { username: string; password: string }) => Promise<User>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  // Query to get current user
  const meQuery = useQuery({
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    retry: false,
    staleTime: 60000,
  });

  // Update user state when query data changes
  useEffect(() => {
    if (meQuery.data && typeof meQuery.data === 'object') {
      const userData = meQuery.data as User;
      setUser(userData);

      // Apply user's preferred language from database with priority
      try {
        if (userData.preferredLanguage) {
          console.log('🌍 Applying user preferred language from database:', userData.preferredLanguage);
          // Import language functions dynamically to avoid circular dependency
          import('@/lib/i18n').then(({ setLanguage }) => {
            // Always apply user's database language preference when logged in
            setLanguage(userData.preferredLanguage, false);
          });
        } else {
          console.log('📝 User has no preferred language set, using current language');
        }
      } catch (error) {
        console.error('Error applying user preferred language:', error);
      }
    } else {
      setUser(null);
      // Clear language on logout and reset to English
      try {
        import('@/lib/i18n').then(({ clearLanguageOnLogout }) => {
          clearLanguageOnLogout();
        });
      } catch (error) {
        console.error('Error clearing language on logout:', error);
      }
    }
  }, [meQuery.data]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }): Promise<User> => {
      const response = await apiRequest('POST', '/api/login', credentials);
      return await response.json();
    },
    onSuccess: (userData) => {
      setUser(userData);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
  });

  // Logout mutation  
  const logoutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await apiRequest('POST', '/api/logout');
    },
    onSuccess: () => {
      setUser(null);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }): Promise<User> => {
      const response = await apiRequest('POST', '/api/register', credentials);
      return await response.json();
    },
    onSuccess: (userData) => {
      setUser(userData);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
  });

  // Derive loading state
  const isLoading = meQuery.isLoading || loginMutation.isPending || logoutMutation.isPending || registerMutation.isPending;

  // Derive error state
  const error = meQuery.error 
    ? String(meQuery.error)
    : loginMutation.error
    ? String(loginMutation.error) 
    : logoutMutation.error
    ? String(logoutMutation.error)
    : registerMutation.error
    ? String(registerMutation.error)
    : null;

  const value: AuthContextValue = {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// معلومات المستخدم الافتراضية للاختبار
export const mockUser = {
  id: 1,
  username: 'testuser',
  displayName: 'مستخدم تجريبي',
  email: 'test@example.com',
  role: 'user',
  preferredLanguage: 'ar'
};

// دالة مساعدة لتسجيل الدخول التجريبي
export const loginWithMockUser = () => {
  console.log('Mock login with:', mockUser);
  return mockUser;
};