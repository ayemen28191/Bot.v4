import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { t } from '@/lib/i18n';
import { getCurrentLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useAdminCheck } from '@/hooks/use-admin-check';

// Components
import { AdminSidebar, AdminBottomNav } from '@/features/admin';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

// Icons
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  pageTitle?: string;
  maxWidth?: boolean;
  noPadding?: boolean;
}

export function AdminLayout({ 
  children, 
  title, 
  pageTitle,
  maxWidth = true,
  noPadding = false 
}: AdminLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { isAdmin, renderAccessDenied } = useAdminCheck();
  const isRTL = getCurrentLanguage() === 'ar';
  
  // Sidebar state management
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin-sidebar-collapsed');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  if (!isAdmin) {
    return renderAccessDenied();
  }

  const displayTitle = pageTitle || title || t('admin_panel');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="hidden md:flex"
      />

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
          data-testid="mobile-overlay"
        />
      )}

      {/* Main Content Area */}
      <main className={cn(
        "min-h-screen transition-all duration-300 ease-in-out",
        // Desktop sidebar spacing
        "md:transition-[margin] md:duration-300",
        isRTL ? (
          sidebarCollapsed ? "md:mr-16" : "md:mr-64"
        ) : (
          sidebarCollapsed ? "md:ml-16" : "md:ml-64"
        ),
        // Mobile spacing for bottom navigation
        "pb-16 md:pb-0"
      )}>
        {/* Header */}
        <header className={cn(
          "sticky top-0 z-30 border-b border-border/50 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60",
          "h-14 flex items-center justify-between px-4 sm:px-6",
          "bg-background/80"
        )}>
          {/* Left side / Right side for RTL */}
          <div className={cn(
            "flex items-center gap-3",
            isRTL && "flex-row-reverse"
          )}>
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-mobile-menu"
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>

            {/* Sidebar toggle for desktop */}
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-toggle-sidebar"
              className="hidden md:flex text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? t('expand_sidebar') : t('collapse_sidebar')}
            >
              {isRTL ? (
                sidebarCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
              ) : (
                sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
              )}
            </Button>

            {/* Page title */}
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground truncate">
                {displayTitle}
              </h1>
            </div>
          </div>

          {/* Right side / Left side for RTL */}
          <div className={cn(
            "flex items-center gap-2",
            isRTL && "flex-row-reverse"
          )}>
            {/* User info - hidden on mobile */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-foreground font-medium">
                {user?.displayName}
              </span>
              <span className="text-muted-foreground">
                ({user?.username})
              </span>
            </div>

            {/* Theme toggle */}
            <ThemeToggle />
          </div>
        </header>

        {/* Content Area */}
        <div className={cn(
          "min-h-[calc(100vh-3.5rem)]",
          maxWidth && "max-w-7xl mx-auto",
          !noPadding && "p-4 sm:p-6 lg:p-8"
        )}>
          {/* Safe area for mobile devices */}
          <div className={cn(
            "min-h-full",
            // Additional bottom padding for mobile safe area and AdminBottomNav
            "pb-[max(env(safe-area-inset-bottom),1rem)] md:pb-0"
          )}>
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <AdminBottomNav />

      {/* Mobile Menu Drawer */}
      <div className={cn(
        "fixed inset-y-0 w-80 max-w-[85vw] bg-background z-50 transition-transform duration-300 ease-in-out md:hidden",
        "border-border shadow-2xl",
        isRTL ? "right-0 border-l" : "left-0 border-r",
        mobileMenuOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"
      )}>
        {/* Mobile menu header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-primary">
            {t('admin_panel')}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            data-testid="button-close-mobile-menu"
            onClick={() => setMobileMenuOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile menu content */}
        <div className="flex-1 overflow-y-auto">
          <AdminSidebar
            collapsed={false}
            className="relative w-full border-0"
          />
        </div>

        {/* Mobile menu footer */}
        <div className="p-4 border-t border-border">
          <div className="text-center text-sm text-muted-foreground">
            <div className="font-medium">{user?.displayName}</div>
            <div className="text-xs">({user?.username})</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;