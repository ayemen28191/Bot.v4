
import React, { Suspense, useEffect, useState } from "react";
import { Router, Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuth } from "@/hooks/use-auth";
import { t, getCurrentLanguage } from "@/lib/i18n";

// Lazy load pages to improve performance
const AuthPage = React.lazy(() => import("@/pages/auth-page"));
const TradingSignalPage = React.lazy(() => import("@/pages/TradingSignalPage"));
const ChatPage = React.lazy(() => import("@/pages/ChatPage"));
const SettingsPage = React.lazy(() => import("@/pages/SettingsPage"));
const IndicatorsPage = React.lazy(() => import("@/pages/IndicatorsPage"));
const BotInfoPage = React.lazy(() => import("@/pages/BotInfoPage"));
const AdminDashboardNew = React.lazy(() => import("@/pages/AdminDashboardNew"));
const UserManagement = React.lazy(() => import("@/pages/UserManagement"));
const ApiKeysManagement = React.lazy(() => import("@/pages/ApiKeysManagement"));
const DeploymentPage = React.lazy(() => import("@/pages/DeploymentPage"));
const AdminResetPassword = React.lazy(() => import("@/pages/AdminResetPassword"));
const NotFoundPage = React.lazy(() => import("@/pages/not-found"));

// AuthProvider component - نحتاج لإنشاؤه أولاً
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking authentication...');
        setIsLoading(true);
        
        // محاولة الحصول على معلومات المستخدم
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('User authenticated:', userData);
          setUser(userData);
        } else {
          console.log('No authenticated user');
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
        setError('فشل في التحقق من حالة المصادقة');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const contextValue = {
    user,
    isLoading,
    error,
    setUser,
    login: async (credentials: any) => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(credentials),
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          return userData;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || 'فشل تسجيل الدخول');
        }
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    logout: async () => {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
        setUser(null);
      } catch (error) {
        console.error('Logout error:', error);
        setUser(null);
      }
    },
    register: async (userData: any) => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(userData),
        });

        if (response.ok) {
          const newUser = await response.json();
          setUser(newUser);
          return newUser;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || 'فشل إنشاء الحساب');
        }
      } catch (error) {
        console.error('Registration error:', error);
        throw error;
      }
    },
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// إنشاء AuthContext
const AuthContext = React.createContext<any>(null);

// المكون الداخلي الذي يستخدم useAuth
function AppContent() {
  const { user, isLoading: authLoading } = useAuth();
  const [appReady, setAppReady] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  useEffect(() => {
    // تهيئة التطبيق مع معالجة الأخطاء
    try {
      // تحقق من اللغة الحالية وتطبيقها
      const currentLang = getCurrentLanguage();
      console.log('App initializing with language:', currentLang);
      
      // تأخير قصير للتأكد من تحميل جميع الموارد
      const timer = setTimeout(() => {
        setAppReady(true);
        console.log('App ready with language:', getCurrentLanguage());
      }, 50);

      return () => clearTimeout(timer);
    } catch (error) {
      console.error('Error during app initialization:', error);
      setAppError('Failed to initialize app');
      setAppReady(true);
    }
  }, []);

  // معالجة الأخطاء
  if (appError && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">تعذر تحميل التطبيق</h1>
          <p className="text-muted-foreground mb-4">{appError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  // عرض شاشة التحميل فقط أثناء تحميل المصادقة
  if (authLoading || !appReady) {
    return <LoadingScreen message={t('initializing_app')} />;
  }

  return (
    <div className="trading-app min-h-screen">
      <Router>
        <Suspense fallback={<LoadingScreen message={t('loading_page')} />}>
          <Switch>
            {/* مسارات المصادقة */}
            {!user ? (
              <>
                <Route path="/" element={<AuthPage />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/register" element={<AuthPage />} />
                <Route path="*" element={<AuthPage />} />
              </>
            ) : (
              <>
                {/* مسارات المستخدمين العاديين */}
                <Route path="/" element={<TradingSignalPage />} />
                <Route path="/signals" element={<TradingSignalPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/indicators" element={<IndicatorsPage />} />
                <Route path="/bot" element={<BotInfoPage />} />
                
                {/* مسارات المشرفين */}
                {user.role === 'admin' && (
                  <>
                    <Route path="/admin" element={<AdminDashboardNew />} />
                    <Route path="/admin/users" element={<UserManagement />} />
                    <Route path="/admin/api-keys" element={<ApiKeysManagement />} />
                    <Route path="/admin/deployment" element={<DeploymentPage />} />
                    <Route path="/admin/reset-password" element={<AdminResetPassword />} />
                  </>
                )}
                
                {/* صفحة 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </>
            )}
          </Switch>
        </Suspense>
      </Router>
      <Toaster />
    </div>
  );
}

// المكون الرئيسي
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
