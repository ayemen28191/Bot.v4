
import { Link } from "wouter";
import { t } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
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

  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/90 backdrop-blur-md z-50 pt-1.5 pb-2 mobile-navbar">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {/* Admin Panel / Bot Info */}
        {user?.isAdmin ? (
          <Link 
            href="/admin" 
            className={cn(
              "flex flex-col items-center mobile-nav-item transition-colors",
              activeTab === 'admin' 
                ? "text-primary" 
                : "text-muted-foreground hover:text-primary"
            )}
          >
            <Users className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('users')}</span>
          </Link>
        ) : (
          <Link 
            href="/bot-info" 
            className={cn(
              "flex flex-col items-center mobile-nav-item transition-colors",
              activeTab === 'bot-info' 
                ? "text-primary" 
                : "text-muted-foreground hover:text-primary"
            )}
          >
            <Bot className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('bot_info')}</span>
          </Link>
        )}

        {/* Indicators */}
        <Link 
          href="/indicators" 
          className={cn(
            "flex flex-col items-center mobile-nav-item transition-colors",
            activeTab === 'indicators' 
              ? "text-primary" 
              : "text-muted-foreground hover:text-primary"
          )}
        >
          <BarChart className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">{t('indicators')}</span>
        </Link>

        {/* Trading - Main button */}
        <Link 
          href="/" 
          className={cn(
            "flex flex-col items-center mobile-nav-item transition-colors",
            activeTab === 'trading' && "active"
          )}
        >
          <div className={cn(
            "relative p-3 rounded-full -mt-5 shadow-lg border-4 border-background/90 transition-colors",
            activeTab === 'trading'
              ? "bg-primary text-primary-foreground"
              : "bg-primary text-primary-foreground"
          )}>
            <DollarSign className="h-6 w-6" />
          </div>
          <span className={cn(
            "text-[10px] mt-1 font-medium transition-colors",
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
            "flex flex-col items-center mobile-nav-item transition-colors",
            activeTab === 'chat' 
              ? "text-primary" 
              : "text-muted-foreground hover:text-primary"
          )}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">{t('group_chat')}</span>
        </Link>

        {/* Settings */}
        <Link 
          href="/settings" 
          className={cn(
            "flex flex-col items-center mobile-nav-item transition-colors",
            activeTab === 'settings' 
              ? "text-primary" 
              : "text-muted-foreground hover:text-primary"
          )}
        >
          <Settings className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">{t('settings')}</span>
        </Link>
      </div>
    </footer>
  );
}

export default BottomNavigation;
