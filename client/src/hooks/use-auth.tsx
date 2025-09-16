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
  sessionChecked: boolean; // إضافة فحص الجلسة
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Query to get current user
  const {
    data: userData,
    isLoading,
    error,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/user", {
          credentials: "include",
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            // تسجيل هادئ للمطورين فقط
            if (process.env.NODE_ENV === 'development') {
              console.debug('🔓 No authenticated session found (expected before login)');
            }
            return null;
          }
          throw new Error(`Failed to fetch user: ${response.statusText}`);
        }

        const userData = await response.json();
        // تسجيل نجاح المصادقة فقط
        console.log('✅ User authenticated:', userData.username);
        return userData;
      } catch (fetchError) {
        // تسجيل الأخطاء الحقيقية فقط
        if (!(fetchError instanceof TypeError && fetchError.message.includes('fetch'))) {
          console.error('Error fetching user data:', fetchError);
        }
        return null;
      }
    },
    retry: (failureCount, error) => {
      // إعادة المحاولة للأخطاء الشبكة لكن ليس لأخطاء المصادقة
      if (error instanceof Error) {
        // لا نعيد المحاولة لأخطاء المصادقة (401, 403)
        if (error.message.includes('401') || error.message.includes('403')) {
          console.log('🔓 Session expired or invalid, redirecting to login');
          return false;
        }
        // إعادة المحاولة لأخطاء الشبكة
        if (error.message.includes('Failed to fetch') || error instanceof TypeError) {
          return failureCount < 3; // زيادة عدد المحاولات للشبكة
        }
      }
      return failureCount < 2;
    },
    staleTime: 10 * 60 * 1000, // 10 دقائق
    refetchInterval: 5 * 60 * 1000, // فحص كل 5 دقائق للتأكد من صحة الجلسة
    refetchOnWindowFocus: true, // التحديث عند العودة للنافذة
    refetchOnMount: true, // إعادة التحميل عند تحميل المكون لضمان صحة الجلسة
    refetchOnReconnect: true, // إعادة التحميل عند إعادة الاتصال
  });

  // Update user state when query data changes
  useEffect(() => {
    // تأكد من انتهاء فحص الجلسة قبل المتابعة
    if (!isLoading) {
      setSessionChecked(true);
    }

    if (userData && typeof userData === 'object') {
      const userDataObj = userData as User;
      setUser(userDataObj);

      // Apply user's preferred language from database with priority
      try {
        if (userDataObj.preferredLanguage) {
          console.log('🌍 Applying user preferred language from database:', userDataObj.preferredLanguage);
          // Import language functions dynamically to avoid circular dependency
          import('@/lib/i18n').then(({ setLanguage }) => {
            // Always apply user's database language preference when logged in
            setLanguage(userDataObj.preferredLanguage, false);
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
  }, [userData, isLoading]);

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

  // Derive combined loading state
  const authIsLoading = isLoading || loginMutation.isPending || logoutMutation.isPending || registerMutation.isPending;

  // Derive error state
  const authError = error 
    ? String(error)
    : loginMutation.error
    ? String(loginMutation.error) 
    : logoutMutation.error
    ? String(logoutMutation.error)
    : registerMutation.error
    ? String(registerMutation.error)
    : null;

  const value: AuthContextValue = {
    user,
    isLoading: authIsLoading,
    error: authError,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    setUser,
    sessionChecked, // إضافة حالة فحص الجلسة
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