import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteProps, useLocation } from "wouter";
import { useEffect, useState } from "react";

interface ProtectedRouteProps extends RouteProps {
  component: React.ComponentType;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [hasChecked, setHasChecked] = useState(false);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      setHasChecked(true);
    }
  }, [isLoading]);

  // منع إعادة التوجيه إذا كنا بالفعل في صفحة تسجيل الدخول
  useEffect(() => {
    if (!isLoading && !user && hasChecked && location !== '/auth') {
      console.log('🔓 Redirecting to auth page without reload');
      setLocation('/auth');
    }
  }, [user, isLoading, hasChecked, location, setLocation]);

  // إظهار شاشة التحميل أثناء التحقق الأولي
  if (isLoading || !hasChecked) {
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
