import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { t } from '@/lib/i18n';
import { getCurrentLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

// أيقونات
import {
  LayoutDashboard,
  Users,
  KeyRound,
  Server,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

// مكونات واجهة المستخدم
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AdminBottomNav } from '@/features/admin';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
  isSidebarCollapsed?: boolean;
  isRTL?: boolean;
}

const NavItem = ({ 
  href, 
  icon, 
  label, 
  isActive, 
  onClick, 
  isSidebarCollapsed = false,
  isRTL = false
}: NavItemProps) => {
  return (
    <Link href={href}>
      <Button
        variant="ghost"
        size={isSidebarCollapsed ? "icon" : "default"}
        onClick={onClick}
        className={cn(
          "w-full justify-start",
          isActive 
            ? "bg-primary/20 text-primary" 
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          isSidebarCollapsed && "h-10 w-10"
        )}
      >
        {isRTL ? (
          <>
            {!isSidebarCollapsed && <span className="mr-auto">{label}</span>}
            <span className={isSidebarCollapsed ? "" : "ml-2"}>{icon}</span>
          </>
        ) : (
          <>
            <span className={isSidebarCollapsed ? "" : "mr-2"}>{icon}</span>
            {!isSidebarCollapsed && <span>{label}</span>}
          </>
        )}
      </Button>
    </Link>
  );
};

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const isRTL = getCurrentLanguage() === 'ar';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // قائمة التنقل
  const menuItems = [
    {
      href: "/admin",
      icon: <LayoutDashboard size={18} />,
      label: t('dashboard'),
      isActive: location === "/admin"
    },
    {
      href: "/admin/users",
      icon: <Users size={18} />,
      label: t('users'),
      isActive: location.includes('/admin/users')
    },
    {
      href: "/admin/api-keys",
      icon: <KeyRound size={18} />,
      label: t('api_keys_label'),
      isActive: location.includes('/admin/api-keys')
    },
    {
      href: "/admin/deployment",
      icon: <Server size={18} />,
      label: t('deployment_servers_label'),
      isActive: location.includes('/admin/deployment')
    },
    {
      href: "/settings",
      icon: <Settings size={18} />,
      label: t('settings'),
      isActive: location.includes('/settings')
    }
  ];

  if (!user?.isAdmin) {
    return <div className="text-center p-8">{t('admin_login_required')}</div>;
  }

  const handleLogout = () => {
    if (confirm(t('confirm_logout'))) {
      logoutMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* الشريط الجانبي للشاشات الكبيرة */}
      <aside
        className={cn(
          "hidden md:flex h-screen fixed z-10 flex-col transition-all duration-200 ease-in-out",
          sidebarCollapsed ? "w-16" : "w-64",
          isRTL ? "right-0 border-l border-border" : "left-0 border-r border-border",
          "bg-background/95 backdrop-blur-sm"
        )}
      >
        <div className="flex items-center justify-between p-4 h-14">
          {!sidebarCollapsed && (
            <div className="font-bold text-lg text-primary">{t('admin_panel')}</div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? t('expand') : t('collapse')}
          >
            {isRTL ? (
              sidebarCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />
            ) : (
              sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />
            )}
          </Button>
        </div>

        <Separator className="bg-border" />

        <div className="flex-1 overflow-auto py-4">
          <nav className="space-y-1 px-2">
            {menuItems.map((item) => (
              <TooltipProvider key={item.href} delayDuration={400}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <NavItem
                        href={item.href}
                        icon={item.icon}
                        label={item.label}
                        isActive={item.isActive}
                        isSidebarCollapsed={sidebarCollapsed}
                        isRTL={isRTL}
                      />
                    </div>
                  </TooltipTrigger>
                  {sidebarCollapsed && (
                    <TooltipContent side={isRTL ? "left" : "right"}>
                      <p>{item.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ))}
          </nav>
        </div>

        <Separator className="bg-border" />

        <div className="p-4">
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    variant="ghost"
                    size={sidebarCollapsed ? "icon" : "default"}
                    onClick={handleLogout}
                    className={cn(
                      sidebarCollapsed ? "h-10 w-10" : "w-full justify-start",
                      "text-muted-foreground hover:bg-accent hover:text-destructive"
                    )}
                  >
                    {isRTL ? (
                      <>
                        {!sidebarCollapsed && <span className="mr-auto">{t('logout')}</span>}
                        <span className={sidebarCollapsed ? "" : "ml-2"}><LogOut size={18} /></span>
                      </>
                    ) : (
                      <>
                        <span className={sidebarCollapsed ? "" : "mr-2"}><LogOut size={18} /></span>
                        {!sidebarCollapsed && <span>{t('logout')}</span>}
                      </>
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side={isRTL ? "left" : "right"}>
                  <p>{t('logout')}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </aside>

      {/* القائمة المتنقلة للجوال */}
      <div className={cn(
        "fixed inset-0 z-50 bg-background/80 md:hidden transition-opacity",
        mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className={cn(
          "fixed inset-y-0 w-3/4 max-w-sm bg-background z-50 transition-transform duration-300 ease-in-out border-border",
          isRTL ? "right-0 border-l" : "left-0 border-r",
          mobileMenuOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"
        )}>
          <div className="flex items-center justify-between p-4 h-14">
            <div className="font-bold text-lg text-primary">{t('admin_panel')}</div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={18} />
            </Button>
          </div>

          <Separator className="bg-border" />

          <div className="flex-1 overflow-auto py-4">
            <nav className="space-y-1 px-2">
              {menuItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isActive={item.isActive}
                  onClick={() => setMobileMenuOpen(false)}
                  isRTL={isRTL}
                />
              ))}
            </nav>
          </div>

          <Separator className="bg-border" />

          <div className="p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-destructive"
              onClick={handleLogout}
            >
              {isRTL ? (
                <>
                  <span className="mr-auto">{t('logout')}</span>
                  <span className="ml-2"><LogOut size={18} /></span>
                </>
              ) : (
                <>
                  <span className="mr-2"><LogOut size={18} /></span>
                  <span>{t('logout')}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <main className={cn(
        "flex-1 min-h-screen w-full transition-all duration-200 ease-in-out",
        "md:delay-150",
        isRTL 
          ? sidebarCollapsed ? "md:pr-16" : "md:pr-64" 
          : sidebarCollapsed ? "md:pl-16" : "md:pl-64"
      )}>
        {/* شريط العنوان */}
        <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 border-b border-border bg-background/75 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={18} />
            </Button>
            <h1 className="text-lg font-semibold text-foreground">{t('admin_panel')}</h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground hidden sm:inline-block">
              {user.displayName} 
              <span className="text-xs text-muted-foreground ml-1">({user.username})</span>
            </span>
          </div>
        </header>

        {/* محتوى الصفحة */}
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;