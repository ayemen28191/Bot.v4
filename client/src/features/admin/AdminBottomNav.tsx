import { Link, useLocation } from "wouter";
import { t } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin-check";
import { getVisibleNavItems, isNavItemActive } from "./navConfig";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AdminBottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isRTL = getCurrentLanguage() === 'ar';
  const navItems = getVisibleNavItems();

  // إخفاء الشريط إذا لم يكن المستخدم مشرفاً
  if (!isAdmin) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="md:hidden">
        <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
          {/* دعم safe-area للجوالات الحديثة */}
          <div className="pb-[max(env(safe-area-inset-bottom),0.5rem)]">
            <div className="grid grid-cols-6 gap-1 px-2 pt-2">
              {navItems.map((item) => {
                const isActive = isNavItemActive(location, item.href);
                const Icon = item.icon;
                
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <Link href={item.href}>
                        <div
                          data-testid={item.testId}
                          className={cn(
                            "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all duration-200",
                            "active:scale-95 touch-manipulation",
                            isActive
                              ? "bg-primary/20 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                          )}
                        >
                          <Icon className={cn("h-5 w-5 mb-1", isActive && "drop-shadow-lg")} />
                          <span className={cn(
                            "text-[10px] font-medium leading-none text-center",
                            isRTL && "font-arabic"
                          )}>
                            {isRTL ? item.labelArabic : t(item.labelKey)}
                          </span>
                        </div>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {isRTL ? item.labelArabic : t(item.labelKey)}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}