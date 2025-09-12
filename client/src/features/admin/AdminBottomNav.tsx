import { Link, useLocation } from "wouter";
import { t } from "@/lib/i18n";
import { DollarSign, Users, KeyRound, Settings, Server, Lock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AdminBottomNav() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === '/admin' && location === '/admin') return true;
    if (path !== '/admin' && location.startsWith(path)) return true;
    return false;
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-700/50 bg-gray-900/90 backdrop-blur-md z-50 pt-1.5 pb-2 mobile-navbar">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        <Link href="/admin" className={`flex flex-col items-center ${isActive('/admin') ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'} mobile-nav-item`}>
          <DollarSign className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">{t('admin_panel')}</span>
        </Link>

        <Link href="/admin/users" className={`flex flex-col items-center ${isActive('/admin/users') ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'} mobile-nav-item`}>
          <Users className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">{t('users')}</span>
        </Link>

        <Link href="/admin/api-keys" className={`flex flex-col items-center ${isActive('/admin/api-keys') ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'} mobile-nav-item`}>
          <KeyRound className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">مفاتيح API</span>
        </Link>

        <Link href="/admin/deployment" className={`flex flex-col items-center ${isActive('/admin/deployment') ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'} mobile-nav-item`}>
          <Server className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">{t('deployment')}</span>
        </Link>

        <Link href="/admin/reset-password" className={`flex flex-col items-center ${isActive('/admin/reset-password') ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'} mobile-nav-item`}>
          <Lock className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">كلمة المرور</span>
        </Link>
      </div>
    </footer>
  );
}