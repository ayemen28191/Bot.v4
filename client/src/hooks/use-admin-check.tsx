import { useAuth } from './use-auth';
import { t } from '@/lib/i18n';

export interface AdminCheckResult {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  user: any;
  renderAccessDenied: () => JSX.Element;
}

/**
 * Hook موحد للتحقق من صلاحيات المشرف
 * يوفر طريقة موحدة للتعامل مع فحوصات الإدارة عبر المكونات المختلفة
 */
export function useAdminCheck(): AdminCheckResult {
  const { user, isLoading, error } = useAuth();

  const isAdmin = Boolean(user?.isAdmin);

  const renderAccessDenied = () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4 p-8">
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-access-denied">
          {t('access_denied')}
        </h1>
        <p className="text-muted-foreground" data-testid="text-admin-required">
          {t('admin_login_required')}
        </p>
      </div>
    </div>
  );

  return {
    isAdmin,
    isLoading,
    error,
    user,
    renderAccessDenied
  };
}

/**
 * Hook بسيط للتحقق من حالة الإدارة فقط
 * مفيد للمكونات التي تحتاج فقط للتحقق من isAdmin
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return Boolean(user?.isAdmin);
}

/**
 * Hook للتحقق من صلاحيات المشرف مع early return
 * مفيد للصفحات التي تريد إرجاع null أو component آخر بسرعة
 */
export function useAdminGuard(): {
  isAdmin: boolean;
  shouldRenderAdmin: boolean;
  accessDeniedComponent: JSX.Element;
} {
  const { isAdmin, renderAccessDenied } = useAdminCheck();

  return {
    isAdmin,
    shouldRenderAdmin: isAdmin,
    accessDeniedComponent: renderAccessDenied()
  };
}