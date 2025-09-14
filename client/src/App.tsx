
import React, { Suspense, useEffect, useState } from "react";
import { Router, Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import LoadingScreen from "@/components/LoadingScreen";
import { setAuthContext, useAuth } from "@/hooks/use-auth";
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
    let isMounted = true;
    
    const checkAuth = async () => {
      if (!isMounted) return;
      
      try {
        console.log('Checking authentication...');
        setError(null);
        
        const response = await fetch('/api/user', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!isMounted) return;

        if (response.ok) {
          const userData = await response.json();
          console.log('User authenticated:', userData);
          setUser(userData);
        } else if (response.status === 401) {
          console.log('No authenticated user');
          setUser(null);
        } else {
          console.warn('Auth check failed with status:', response.status);
          setUser(null);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const contextValue = {
    user,
    isLoading,
    error,
    setUser,
    login: async (credentials: any) => {
      try {
        setError(null);
        
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(credentials),
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('Login successful:', userData);
          setUser(userData);
          setError(null);
          return userData;
        } else {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || 'فشل تسجيل الدخول';
          console.warn('Login failed:', response.status, errorMessage);
          setError(errorMessage);
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error('Login error:', error);
        const errorMessage = error instanceof Error ? error.message : 'فشل تسجيل الدخول';
        setError(errorMessage);
        throw error;
      }
    },
    logout: async () => {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          credentials: 'include',
        });
        setUser(null);
        setError(null);
      } catch (error) {
        console.error('Logout error:', error);
        setUser(null);
        setError(null);
      }
    },
    register: async (userData: any) => {
      try {
        const response = await fetch('/api/register', {
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

// المكون الداخلي الذي يستخدم useAuth
function AppContent() {
  const authContext = useAuth();
  const { user, isLoading: authLoading } = authContext;
  const [appReady, setAppReady] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  // في حالة عدم وجود AuthContext، عرض خطأ
  if (!authContext) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">خطأ في تهيئة التطبيق</h1>
          <p className="text-muted-foreground mb-4">فشل في تحميل نظام المصادقة</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      </div>
    );
  }

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
    console.log('App loading state:', { authLoading, appReady });
    return <LoadingScreen message={t('initializing_app')} />;
  }

  console.log('App ready, user:', user ? 'authenticated' : 'not authenticated');

  return (
    <div className="trading-app min-h-screen">
      <Router>
        <Suspense fallback={<LoadingScreen message={t('loading_page')} />}>
          <Switch>
            {/* مسارات المصادقة */}
            {!user ? (
              <>
                <Route path="/login" component={AuthPage} />
                <Route path="/register" component={AuthPage} />
                <Route path="/" component={AuthPage} />
                <Route path="*" component={AuthPage} />
              </>
            ) : (
              <>
                {/* مسارات المستخدمين العاديين */}
                <Route path="/" component={TradingSignalPage} />
                <Route path="/signals" component={TradingSignalPage} />
                <Route path="/chat" component={ChatPage} />
                <Route path="/group-chat" component={ChatPage} />
                <Route path="/settings" component={SettingsPage} />
                <Route path="/indicators" component={IndicatorsPage} />
                <Route path="/bot" component={BotInfoPage} />
                
                {/* مسارات المشرفين */}
                {user.role === 'admin' && (
                  <>
                    <Route path="/admin" component={AdminDashboardNew} />
                    <Route path="/admin/users" component={UserManagement} />
                    <Route path="/admin/api-keys" component={ApiKeysManagement} />
                    <Route path="/admin/deployment" component={DeploymentPage} />
                    <Route path="/admin/reset-password" component={AdminResetPassword} />
                  </>
                )}
                
                {/* صفحة 404 */}
                <Route path="*" component={NotFoundPage} />
              </>
            )}
          </Switch>
        </Suspense>
      </Router>
      <Toaster />
    </div>
  );
}

// إنشاء AuthContext في أعلى الملف
export const AuthContext = React.createContext<any>(null);

// تعيين AuthContext في الملف المنفصل
setAuthContext(AuthContext);


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
