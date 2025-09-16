import { Link, useLocation } from "wouter";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { 
  ChevronLeft, 
  ChevronRight, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin-check";
import { useEffect, useState } from "react";
import { getCurrentLanguage } from "@/lib/i18n";
import { getVisibleNavItems, isNavItemActive, AdminNavItem } from "./navConfig";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function AdminSidebar({ collapsed = false, onToggle, className }: AdminSidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = useIsAdmin();
  const isRTL = getCurrentLanguage() === 'ar';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navItems = getVisibleNavItems();

  // التعامل مع تغيير حجم النافذة
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isAdmin) {
    return null;
  }

  const handleLogout = async () => {
    if (confirm(t('confirm_logout'))) {
      await logout();
    }
  };

  const renderNavItem = (item: AdminNavItem, isMobile: boolean = false) => {
    const isActive = isNavItemActive(location, item.href);
    const Icon = item.icon;
    const label = isRTL ? item.labelArabic : t(item.labelKey);

    if (collapsed && !isMobile) {
      return (
        <TooltipProvider key={item.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={item.href}>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid={item.testId}
                  className={cn(
                    "w-full h-12",
                    isActive
                      ? "bg-primary/20 text-primary hover:bg-primary/20 hover:text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side={isRTL ? "left" : "right"} className="font-medium">
              {label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Link key={item.id} href={item.href}>
        <Button
          variant="ghost"
          data-testid={item.testId}
          className={cn(
            "w-full h-12 justify-start",
            isRTL && "flex-row-reverse",
            isActive
              ? "bg-primary/20 text-primary hover:bg-primary/20 hover:text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
          onClick={() => isMobile && setIsMobileMenuOpen(false)}
        >
          <Icon className={cn("h-5 w-5", isRTL ? "ml-3" : "mr-3")} />
          <span className="font-medium">{label}</span>
        </Button>
      </Link>
    );
  };

  return (
    <>
      {/* زر فتح القائمة للجوال */}
      <Button
        variant="outline"
        size="icon"
        data-testid="button-mobile-menu"
        className="fixed top-4 left-4 z-50 md:hidden bg-background/80 backdrop-blur-sm border-border/50"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Overlay للجوال */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* نسخة الجوال من الشريط الجانبي */}
      <div className={cn(
        "fixed top-0 h-full w-64 bg-background border-r border-border z-50 transform transition-transform duration-300 md:hidden",
        isRTL ? "right-0" : "left-0",
        isMobileMenuOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* رأس القائمة الجانبية */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-primary">{t('admin_panel')}</h2>
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-close-mobile-menu"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* قائمة التنقل */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-3">
              {navItems.map((item) => renderNavItem(item, true))}
            </nav>
          </div>

          {/* زر تسجيل الخروج */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              data-testid="button-logout-mobile"
              className={cn(
                "w-full h-12 justify-start text-destructive hover:text-destructive hover:bg-destructive/10",
                isRTL && "flex-row-reverse"
              )}
              onClick={handleLogout}
            >
              <LogOut className={cn("h-5 w-5", isRTL ? "ml-3" : "mr-3")} />
              <span className="font-medium">{t('logout')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* نسخة سطح المكتب من الشريط الجانبي */}
      <aside className={cn(
        "hidden md:flex h-screen flex-col bg-background border-r border-border transition-all duration-300 fixed z-30",
        collapsed ? "w-16" : "w-64",
        isRTL ? "right-0 border-l border-r-0" : "left-0",
        className
      )}>
        {/* رأس الشريط الجانبي */}
        <div className="flex items-center justify-between p-4 border-b border-border min-h-[73px]">
          {!collapsed && (
            <h1 className="text-lg font-bold text-primary">{t('admin_panel')}</h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            data-testid="button-toggle-sidebar"
            className="text-muted-foreground hover:text-foreground"
            onClick={onToggle}
            title={collapsed ? t('expand_sidebar') : t('collapse_sidebar')}
          >
            {isRTL ? (
              collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* قائمة التنقل */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className={cn("space-y-1", collapsed ? "px-2" : "px-3")}>
            {navItems.map((item) => renderNavItem(item))}
          </nav>
        </div>

        {/* فاصل */}
        <Separator className="mx-3" />

        {/* زر تسجيل الخروج */}
        <div className={cn("p-4", collapsed && "px-2")}>
          {collapsed ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="button-logout-desktop"
                    className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={isRTL ? "left" : "right"} className="font-medium">
                  {t('logout')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant="ghost"
              data-testid="button-logout-desktop"
              className={cn(
                "w-full h-12 justify-start text-destructive hover:text-destructive hover:bg-destructive/10",
                isRTL && "flex-row-reverse"
              )}
              onClick={handleLogout}
            >
              <LogOut className={cn("h-5 w-5", isRTL ? "ml-3" : "mr-3")} />
              <span className="font-medium">{t('logout')}</span>
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;