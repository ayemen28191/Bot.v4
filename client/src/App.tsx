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

function App() {
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
      }, 50); // تقليل وقت التأخير

      return () => clearTimeout(timer);
    } catch (error) {
      console.error('Error during app initialization:', error);
      setAppError('Failed to initialize app');
      setAppReady(true); // السماح بالعرض حتى مع وجود خطأ
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
  if (authLoading) {
    return <LoadingScreen message={t('initializing_app')} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}

export default App;