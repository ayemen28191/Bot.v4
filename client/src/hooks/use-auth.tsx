import { useContext, createContext, useState, ReactNode, useEffect, useRef } from 'react';
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
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const hasCheckedSession = useRef(false);

  // Query to get current user - يتم تشغيله مرة واحدة فقط
  const {
    data: userData,
    isLoading,
    error,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        // تجنب التكرار الإضافي
        if (hasCheckedSession.current && initialCheckComplete) {
          return user; // إرجاع البيانات المحفوظة محلياً
        }

        const response = await fetch("/api/user", {
          credentials: "include",
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            // تسجيل هادئ للمطورين فقط - مرة واحدة
            if (process.env.NODE_ENV === 'development' && !hasCheckedSession.current) {
              console.debug('🔓 No authenticated session found');
            }
            hasCheckedSession.current = true;
            return null;
          }
          throw new Error(`Failed to fetch user: ${response.statusText}`);
        }

        const userData = await response.json();
        // تسجيل نجاح المصادقة فقط مرة واحدة
        if (process.env.NODE_ENV === 'development' && !hasCheckedSession.current) {
          console.log('✅ User authenticated:', userData.username);
        }
        hasCheckedSession.current = true;
        return userData;
      } catch (fetchError) {
        // تسجيل الأخطاء الحقيقية فقط - مرة واحدة
        if (process.env.NODE_ENV === 'development' && !hasCheckedSession.current) {
          console.debug('Auth check failed:', fetchError);
        }
        hasCheckedSession.current = true;
        return null;
      }
    },
    retry: (failureCount, error) => {
      // لا إعادة محاولة للمصادقة المرفوضة
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      // إعادة محاولة محدودة للأخطاء الأخرى
      return failureCount < 1;
    },
    staleTime: 60 * 60 * 1000, // ساعة واحدة
    gcTime: 60 * 60 * 1000, // ساعة واحدة في الكاش
    refetchInterval: false, // منع الفحص التلقائي
    refetchOnWindowFocus: false, // منع الفحص عند التركيز
    refetchOnMount: false, // منع إعادة التحميل التلقائي
    refetchOnReconnect: false, // منع الفحص عند إعادة الاتصال
    enabled: !initialCheckComplete, // تفعيل فقط للفحص الأولي
  });

  // Update user state when query data changes
  useEffect(() => {
    // تأكد من انتهاء فحص الجلسة قبل المتابعة
    if (!isLoading && !initialCheckComplete) {
      setSessionChecked(true);
      setInitialCheckComplete(true);
    }

    if (userData && typeof userData === 'object') {
      const userDataObj = userData as User;
      // تجنب التحديث المتكرر إذا كان المستخدم هو نفسه
      if (!user || user.id !== userDataObj.id) {
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
      }
    } else if (userData === null && user !== null) {
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
  }, [userData, isLoading, user, initialCheckComplete]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }): Promise<User> => {
      const response = await apiRequest('POST', '/api/login', credentials);
      return await response.json();
    },
    onSuccess: (userData) => {
      setUser(userData);
      hasCheckedSession.current = false; // إعادة تعيين للفحص الجديد
      setInitialCheckComplete(false);
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
      hasCheckedSession.current = false; // إعادة تعيين للفحص الجديد
      setInitialCheckComplete(false);
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
      hasCheckedSession.current = false; // إعادة تعيين للفحص الجديد
      setInitialCheckComplete(false);
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