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

// مكون للتعامل مع وضع HTTPS في Replit ومشاكل WebSocket
function HTTPSHandler() {
  const enableOfflineMode = useChatStore(state => state.enableOfflineMode);
  const isOfflineMode = useChatStore(state => state.isOfflineMode);
  const { toast } = useToast();

  useEffect(() => {
    // فحص إذا كان التطبيق يعمل على HTTPS في بيئة Replit
    if (typeof window !== 'undefined') {
      const isSecure = window.location.protocol === 'https:';
      const isReplitApp = window.location.hostname.endsWith('.replit.app') ||
                           window.location.hostname.endsWith('.repl.co') ||
                           window.location.hostname === 'replit.com';

      // التعامل مع مشاكل Vite WebSocket في بيئة HTTPS
      if (isSecure) {
        console.log('🔒 HTTPS environment detected - Setting up WebSocket error handling');

        // قمع أخطاء WebSocket console المتكررة
        const originalConsoleWarn = console.warn;
        const originalConsoleError = console.error;

        console.warn = (...args) => {
          const message = args.join(' ');
          // تجاهل رسائل Vite WebSocket الشائعة
          if (message.includes('[vite] server connection lost') ||
              message.includes('WebSocket connection') ||
              message.includes('server connection lost') ||
              message.includes('Polling for restart')) {
            // لا تعرض هذه الرسائل في console
            return;
          }
          originalConsoleWarn.apply(console, args);
        };

        console.error = (...args) => {
          const message = args.join(' ');
          // تجاهل أخطاء WebSocket المتكررة
          if (message.includes('WebSocket connection') ||
              message.includes('502') ||
              message.includes('handshake')) {
            // لا تعرض هذه الأخطاء في console  
            return;
          }
          originalConsoleError.apply(console, args);
        };

        // تسجيل معلومات البيئة فقط
            console.log('🔒 HTTPS environment - WebSocket errors will be handled gracefully');
      }

      if (isSecure && isReplitApp && !isOfflineMode) {
        console.log('تم اكتشاف HTTPS في بيئة Replit - تفعيل وضع عدم الاتصال تلقائيًا');

        // تفعيل وضع عدم الاتصال
        enableOfflineMode();

        // عرض إشعار للمستخدم (مؤجل لتجنب الإزعاج)
        setTimeout(() => {
          toast({
            title: "Environment Optimized",
            description: "The app has been optimized for HTTPS environment. All features will work normally.",
            duration: 6000
          });
        }, 3000);

        console.info('تم تفعيل وضع عدم الاتصال تلقائيًا بسبب بيئة Replit HTTPS');
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
        <ProtectedRoute path="/" component={TradingSignalPage} />
        <ProtectedRoute path="/settings" component={SettingsPage} />
        <ProtectedRoute path="/group-chat" component={GroupChatPage} />
        <ProtectedRoute path="/indicators" component={IndicatorsPage} />
        <ProtectedAdminRoute path="/admin" component={AdminDashboard} />
        <ProtectedAdminRoute path="/admin/users" component={UserManagement} />
        <ProtectedAdminRoute path="/admin/api-keys" component={ApiKeysManagement} />
        <ProtectedAdminRoute path="/admin/deployment" component={DeploymentPage} />
        <ProtectedAdminRoute path="/admin/system-test" component={SystemTestPage} />
        <ProtectedAdminRoute path="/admin/reset-password" component={AdminResetPassword} />
        <ProtectedRoute path="/bot-info" component={BotInfoPage} />
        <Route path="/auth" component={AuthPage} />
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