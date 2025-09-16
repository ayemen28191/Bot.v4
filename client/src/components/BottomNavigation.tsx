
import { Link } from "wouter";
import { t } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin-check";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Bot, 
  BarChart, 
  DollarSign, 
  MessageCircle, 
  Settings 
} from "lucide-react";

interface BottomNavigationProps {
  activeTab?: 'trading' | 'indicators' | 'chat' | 'bot-info' | 'settings' | 'admin';
}

export function BottomNavigation({ activeTab }: BottomNavigationProps) {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();

  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/90 backdrop-blur-md z-50 py-2 mobile-navbar">
      <div className="flex justify-around items-center max-w-lg mx-auto px-4">
        {/* Admin Panel / Bot Info */}
        {isAdmin ? (
          <Link 
            href="/admin" 
            className={cn(
              "flex flex-col items-center mobile-nav-item transition-colors min-w-[60px] py-1",
              activeTab === 'admin' 
                ? "text-primary" 
                : "text-muted-foreground hover:text-primary"
            )}
          >
            <Settings className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium text-center">{t('admin_panel')}</span>
          </Link>
        ) : (
          <Link 
            href="/bot-info" 
            className={cn(
              "flex flex-col items-center mobile-nav-item transition-colors min-w-[60px] py-1",
              activeTab === 'bot-info' 
                ? "text-primary" 
                : "text-muted-foreground hover:text-primary"
            )}
          >
            <Bot className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium text-center">{t('bot_info')}</span>
          </Link>
        )}

        {/* Indicators */}
        <Link 
          href="/indicators" 
          className={cn(
            "flex flex-col items-center mobile-nav-item transition-colors min-w-[60px] py-1",
            activeTab === 'indicators' 
              ? "text-primary" 
              : "text-muted-foreground hover:text-primary"
          )}
        >
          <BarChart className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-medium text-center">{t('indicators')}</span>
        </Link>

        {/* Trading - Main button */}
        <Link 
          href="/" 
          className={cn(
            "flex flex-col items-center mobile-nav-item transition-colors min-w-[60px] py-1",
            activeTab === 'trading' && "active"
          )}
        >
          <div className={cn(
            "relative p-2.5 rounded-full -mt-3 shadow-lg border-2 border-background/90 transition-colors mb-1",
            activeTab === 'trading'
              ? "bg-primary text-primary-foreground"
              : "bg-primary text-primary-foreground"
          )}>
            <DollarSign className="h-5 w-5" />
          </div>
          <span className={cn(
            "text-[10px] font-medium transition-colors text-center",
            activeTab === 'trading' 
              ? "text-primary" 
              : "text-muted-foreground"
          )}>
            {t('trading')}
          </span>
        </Link>

        {/* Group Chat */}
        <Link 
          href="/group-chat" 
          className={cn(
            "flex flex-col items-center mobile-nav-item transition-colors min-w-[60px] py-1",
            activeTab === 'chat' 
              ? "text-primary" 
              : "text-muted-foreground hover:text-primary"
          )}
        >
          <MessageCircle className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-medium text-center">{t('group_chat')}</span>
        </Link>

        {/* Settings */}
        <Link 
          href="/settings" 
          className={cn(
            "flex flex-col items-center mobile-nav-item transition-colors min-w-[60px] py-1",
            activeTab === 'settings' 
              ? "text-primary" 
              : "text-muted-foreground hover:text-primary"
          )}
        >
          <Settings className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-medium text-center">{t('settings')}</span>
        </Link>
      </div>
    </footer>
  );
}

export default BottomNavigation;
