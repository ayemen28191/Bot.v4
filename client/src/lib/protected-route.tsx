import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteProps, useLocation } from "wouter";
import { useEffect, useState } from "react";

interface ProtectedRouteProps extends RouteProps {
  component: React.ComponentType;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { user, isLoading, sessionChecked } = useAuth();
  const [location, setLocation] = useLocation();
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  // منع إعادة التوجيه المتكررة
  useEffect(() => {
    // فقط إعادة التوجيه إذا:
    // 1. انتهى التحميل
    // 2. تم فحص الجلسة بالكامل
    // 3. لا يوجد مستخدم
    // 4. لسنا في صفحة المصادقة
    // 5. لم نحاول إعادة التوجيه من قبل
    if (!isLoading && 
        sessionChecked && 
        !user && 
        location !== '/auth' && 
        !redirectAttempted) {
      
      console.log('🔓 No valid session, redirecting to auth page');
      setRedirectAttempted(true);
      
      // محو أي بيانات محلية متعلقة بالجلسة
      try {
        localStorage.removeItem('auth_timestamp');
        sessionStorage.clear();
      } catch (e) {
        console.warn('Could not clear storage on session loss');
      }
      
      setLocation('/auth');
    }
  }, [user, isLoading, sessionChecked, location, setLocation, redirectAttempted]);

  // إظهار شاشة التحميل أثناء التحقق الأولي
  if (isLoading || !sessionChecked) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // إعادة التوجيه إلى صفحة تسجيل الدخول إذا لم يكن المستخدم مسجلاً
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" replace />
      </Route>
    );
  }

  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}
