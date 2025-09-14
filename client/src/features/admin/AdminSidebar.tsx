import { Link, useLocation } from "wouter";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { 
  BarChart, 
  ChevronLeft, 
  ChevronRight, 
  DollarSign, 
  KeyRound, 
  LayoutGrid, 
  LogOut, 
  RefreshCw, 
  Server, 
  Settings, 
  UserCog,
  Users,
  TestTube
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { getCurrentLanguage } from "@/lib/i18n";

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function AdminSidebar({ collapsed = false, onToggle, className }: AdminSidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const isRTL = getCurrentLanguage() === 'ar';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  if (!user?.isAdmin) {
    return null;
  }

  const handleLogout = () => {
    if (confirm(t('confirm_logout'))) {
      logoutMutation.mutate();
    }
  };

  const isActive = (path: string) => {
    // التحقق من تطابق المسار الحالي أو كونه جزء من المسار الحالي إذا كان فرعي
    return location === path || (path !== '/' && location.startsWith(path));
  };

  const menuItems = [
    { 
      path: "/admin", 
      icon: <LayoutGrid className="h-5 w-5" />, 
      label: t('dashboard'),
      isActive: isActive("/admin") && !location.includes("api-keys") && !location.includes("servers") && !location.includes("settings")
    },
    { 
      path: "/admin/users", 
      icon: <Users className="h-5 w-5" />, 
      label: t('users'),
      isActive: isActive("/admin/users")
    },
    { 
      path: "/admin/api-keys", 
      icon: <KeyRound className="h-5 w-5" />, 
      label: "مفاتيح API",
      isActive: isActive("/admin/api-keys")
    },
    { 
      path: "/admin/servers", 
      icon: <Server className="h-5 w-5" />, 
      label: "خوادم النشر",
      isActive: isActive("/admin/servers")
    },
    { 
      path: "/settings", 
      icon: <Settings className="h-5 w-5" />, 
      label: t('settings'),
      isActive: isActive("/settings")
    },
    { 
      icon: TestTube, 
      label: 'اختبار النظام', 
      path: '/admin/system-test' 
    },
  ];

  return (
    <>
      {/* زر فتح القائمة للجوال */}
      <div className="fixed top-4 right-4 z-50 md:hidden">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-black/20 backdrop-blur-sm border-gray-700/50 text-white hover:bg-black/30"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* نسخة الجوال من الشريط الجانبي */}
      <div className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-all duration-300 md:hidden ${
        isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}>
        <div 
          className={`fixed right-0 top-0 h-full w-64 bg-gray-900 border-l border-gray-700/50 shadow-xl transition-transform duration-300 transform ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <span className="text-yellow-400 font-bold text-lg">{t('admin_panel')}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <div className="space-y-1 px-2">
                {menuItems.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-right",
                        item.isActive
                          ? "bg-gray-800 text-yellow-400 hover:bg-gray-800 hover:text-yellow-400"
                          : "text-gray-400 hover:bg-gray-800 hover:text-yellow-400"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="ml-3">{item.icon}</span>
                      <span className="mr-3">{item.label}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-700/50">
              <Button
                variant="ghost"
                className="w-full justify-start text-right text-gray-400 hover:bg-gray-800 hover:text-red-400"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 ml-3" />
                <span className="mr-3">{t('logout')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* نسخة سطح المكتب من الشريط الجانبي */}
      <aside className={cn(
        "hidden md:flex h-screen flex-col bg-gray-900 overflow-y-auto transition-all duration-300 fixed z-40",
        collapsed ? "w-16" : "w-64",
        isRTL ? "border-l border-gray-700/50 right-0" : "border-r border-gray-700/50 left-0",
        className
      )}>
        <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
          {!collapsed && (
            <span className="text-yellow-400 font-bold text-lg">{t('admin_panel')}</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
            onClick={onToggle}
            title={collapsed ? t('expand_sidebar') : t('collapse_sidebar')}
          >
            {isRTL ? (
              collapsed ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />
            ) : (
              collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="flex-1 py-4">
          <div className="space-y-1 px-2">
            {menuItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full",
                    collapsed ? "justify-center px-2" : isRTL ? "justify-end text-right" : "justify-start text-left",
                    item.isActive
                      ? "bg-gray-800 text-yellow-400 hover:bg-gray-800 hover:text-yellow-400"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  {isRTL ? (
                    <>
                      {!collapsed && <span className="ml-3">{item.label}</span>}
                      <span className={collapsed ? "" : "mr-3"}>{item.icon}</span>
                    </>
                  ) : (
                    <>
                      <span className={collapsed ? "" : "mr-3"}>{item.icon}</span>
                      {!collapsed && <span className="ml-3">{item.label}</span>}
                    </>
                  )}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700/50">
          <Button
            variant="ghost"
            className={cn(
              collapsed ? "justify-center px-2" : isRTL ? "justify-end text-right w-full" : "justify-start text-left w-full",
              "text-gray-400 hover:bg-gray-800 hover:text-red-400"
            )}
            onClick={handleLogout}
          >
            {isRTL ? (
              <>
                {!collapsed && <span className="ml-3">{t('logout')}</span>}
                <LogOut className={cn("h-5 w-5", collapsed ? "" : "mr-3")} />
              </>
            ) : (
              <>
                <LogOut className={cn("h-5 w-5", collapsed ? "" : "mr-3")} />
                {!collapsed && <span className="ml-3">{t('logout')}</span>}
              </>
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;