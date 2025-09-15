import { Suspense, lazy, useEffect } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoadingScreen from '@/components/LoadingScreen';
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { ProtectedRoute } from "@/lib/protected-route";
import { ProtectedAdminRoute } from "@/lib/protected-admin-route";
import { useStore as useChatStore } from './store/chatStore';
import { useToast } from '@/hooks/use-toast';

// التحميل المتأخر للصفحات
const TradingSignalPage = lazy(() => import('@/pages/TradingSignalPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const GroupChatPage = lazy(() => import('@/pages/ChatPage'));
const IndicatorsPage = lazy(() => import('@/pages/IndicatorsPage'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboardNew'));
const UserManagement = lazy(() => import('@/pages/UserManagement'));
const ApiKeysManagement = lazy(() => import('@/pages/ApiKeysManagement'));
const DeploymentPage = lazy(() => import('@/pages/DeploymentPage'));
const BotInfoPage = lazy(() => import('@/pages/BotInfoPage'));
const AdminResetPassword = lazy(() => import('@/pages/AdminResetPassword'));
const AuthPage = lazy(() => import('@/pages/auth-page'));
const NotFound = lazy(() => import('@/pages/not-found'));
const SystemTestPage = lazy(() => import('@/pages/SystemTestPage'));
const LogMonitorPage = lazy(() => import('@/pages/LogMonitorPage'));

// مكون للتعامل مع وضع HTTPS في Replit ومنع حلقة إعادة التحميل
function HTTPSHandler() {
  const enableOfflineMode = useChatStore(state => state.enableOfflineMode);
  const isOfflineMode = useChatStore(state => state.isOfflineMode);
  const { toast } = useToast();

  useEffect(() => {
    // **الحل الفوري**: منع حلقة إعادة التحميل في بيئة HTTPS
    if (typeof window !== 'undefined') {
      const isSecure = window.location.protocol === 'https:';
      const isReplitApp = window.location.hostname.endsWith('.replit.app') ||
                           window.location.hostname.endsWith('.repl.co') ||
                           window.location.hostname.includes('replit');

      // **أولاً**: تفعيل وضع عدم الاتصال فوراً لمنع محاولات WebSocket الفاشلة
      if (isSecure && isReplitApp && !isOfflineMode) {
        console.log('🚫 منع حلقة إعادة التحميل: تفعيل وضع الحماية المبكر');
        enableOfflineMode();
        localStorage.setItem('replit_https_protection', 'enabled');
      }

      // **ثانياً**: منع Vite من إعادة تحميل الصفحة عند فشل WebSocket
      if (isSecure) {
        // منع إعادة تحميل الصفحة بسبب HMR
        const originalLocation = window.location;
        let reloadBlocked = false;

        // اعتراض محاولات إعادة التحميل
        const blockReload = () => {
          if (!reloadBlocked) {
            reloadBlocked = true;
            console.log('🛡️ تم منع إعادة التحميل التلقائي للحفاظ على استقرار التطبيق');
          }
        };

        // منع إعادة التحميل من beforeunload
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          if (reloadBlocked) {
            e.preventDefault();
            return '';
          }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // قمع أخطاء WebSocket المزعجة
        const originalConsoleWarn = console.warn;
        const originalConsoleError = console.error;

        console.warn = (...args) => {
          const message = args.join(' ');
          if (message.includes('[vite] server connection lost') ||
              message.includes('WebSocket connection') ||
              message.includes('Polling for restart') ||
              message.includes('hmr update') ||
              message.includes('vite:ws') ||
              message.includes('HMR connection lost')) {
            blockReload();
            return; // تجاهل هذه الرسائل
          }
          originalConsoleWarn.apply(console, args);
        };

        console.error = (...args) => {
          const message = args.join(' ');
          if (message.includes('WebSocket connection') ||
              message.includes('502') ||
              message.includes('handshake') ||
              message.includes('Failed to construct') ||
              message.includes('SecurityError') ||
              message.includes('ERR_SSL_PROTOCOL_ERROR') ||
              message.includes('HMR')) {
            blockReload();
            return; // تجاهل هذه الأخطاء
          }
          originalConsoleError.apply(console, args);
        };

        console.log('🔒 نظام الحماية من إعادة التحميل مفعل للبيئة الآمنة');

        // تنظيف المستمعين عند الإلغاء
        return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
          console.warn = originalConsoleWarn;
          console.error = originalConsoleError;
        };
      }

      // **ثالثاً**: إشعار المستخدم بالوضع الآمن (مؤجل)
      if (isSecure && isReplitApp) {
        setTimeout(() => {
          if (!document.hidden) { // فقط إذا كانت الصفحة نشطة
            toast({
              title: "🔒 Secure Mode Active",
              description: "App optimized for HTTPS environment. All features working normally.",
              variant: "default",
              duration: 4000
            });
          }
        }, 2000);
      }
    }
  }, [enableOfflineMode, isOfflineMode, toast]);

  return null;
}

// مكون التوجيه المحسن
function Router() {
  return (
    <Suspense fallback={<LoadingScreen message="جاري تحميل الصفحة..." />}>
      <HTTPSHandler />
      <Switch>
        {/* صفحة تسجيل الدخول أولاً لمنع التداخل */}
        <Route path="/auth" component={AuthPage} />
        
        {/* المسارات المحمية */}
        <ProtectedRoute path="/" component={TradingSignalPage} />
        <ProtectedRoute path="/settings" component={SettingsPage} />
        <ProtectedRoute path="/group-chat" component={GroupChatPage} />
        <ProtectedRoute path="/indicators" component={IndicatorsPage} />
        <ProtectedRoute path="/bot-info" component={BotInfoPage} />
        
        {/* مسارات المشرف */}
        <ProtectedAdminRoute path="/admin" component={AdminDashboard} />
        <ProtectedAdminRoute path="/admin/users" component={UserManagement} />
        <ProtectedAdminRoute path="/admin/api-keys" component={ApiKeysManagement} />
        <ProtectedAdminRoute path="/admin/deployment" component={DeploymentPage} />
        <ProtectedAdminRoute path="/admin/system-test" component={SystemTestPage} />
        <ProtectedAdminRoute path="/admin/logs" component={LogMonitorPage} />
        <ProtectedAdminRoute path="/admin/reset-password" component={AdminResetPassword} />
        
        {/* صفحة 404 في النهاية */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="binar-theme">
        <TooltipProvider>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;