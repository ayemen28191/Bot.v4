import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteProps, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { safeRemoveLocalStorage } from '@/lib/storage-utils';

interface ProtectedRouteProps extends RouteProps {
  component: React.ComponentType;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { user, isLoading, sessionChecked } = useAuth();
  const [location, setLocation] = useLocation();

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

  // إعادة التوجيه البسيطة بدون حلقات
  if (!user && location !== '/auth') {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔓 No session, redirecting to auth');
    }
    
    // محو البيانات المحلية
    safeRemoveLocalStorage('auth_timestamp');
    
    return (
      <Route path={path}>
        <Redirect to="/auth" replace />
      </Route>
    );
  }

  // عرض المكون إذا كان المستخدم مسجل الدخول
  if (user) {
    return (
      <Route path={path}>
        <Component />
      </Route>
    );
  }

  // الحالة الافتراضية
  return (
    <Route path={path}>
      <Redirect to="/auth" replace />
    </Route>
  );
}