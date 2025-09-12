import { useAuth } from "@/hooks/use-auth";
import { t } from "@/lib/i18n";
import { ArrowLeft, BarChart, Bot, DollarSign, MessageCircle, Settings, Users } from "lucide-react";
import { Link } from "wouter";

export default function BotInfoPage() {
  const { user } = useAuth();

  // إذا كان مشرف، توجيهه إلى صفحة الإدارة بدلاً من صفحة البوت
  if (user?.isAdmin) {
    return (
      <div className="p-8 text-center">
        <p>{t('admin_redirect')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 flex justify-between items-center p-3 border-b border-border bg-background/90 backdrop-blur-md z-50 shadow-md">
        <div className="flex items-center">
          <Link href="/">
            <button className="p-1.5 mr-2 rounded-full bg-card/80 border border-border hover:bg-card transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="font-bold text-lg flex items-baseline">
            <span className="text-primary ml-1">{t('bot_info')}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-3 mt-16 mb-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-primary text-primary-foreground rounded-full p-4">
                <Bot className="h-12 w-12" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-primary mb-4 text-center">{t('trading_bot')}</h2>
            <p className="text-muted-foreground mb-3">
              {t('bot_description')}
            </p>
            <p className="text-muted-foreground mb-3">
              {t('bot_features')}
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 mr-4">
              <li className="mb-2">{t('bot_feature_1')}</li>
              <li className="mb-2">{t('bot_feature_2')}</li>
              <li className="mb-2">{t('bot_feature_3')}</li>
              <li className="mb-2">{t('bot_feature_4')}</li>
            </ul>
            <div className="bg-muted/50 p-3 rounded-lg border border-border/50 mb-4">
              <p className="text-muted-foreground text-sm">
                <span className="text-primary font-medium">{t('coming_soon')}: </span>
                {t('bot_coming_soon')}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* شريط التنقل السفلي */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/90 backdrop-blur-md z-50 pt-1.5 pb-2 mobile-navbar">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <Link href="/bot-info" className="flex flex-col items-center text-primary mobile-nav-item active">
            <Bot className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('bot_info')}</span>
          </Link>

          <Link href="/indicators" className="flex flex-col items-center text-muted-foreground hover:text-primary mobile-nav-item transition-colors">
            <BarChart className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('indicators')}</span>
          </Link>

          <Link href="/" className="flex flex-col items-center text-muted-foreground hover:text-primary mobile-nav-item transition-colors">
            <div className="relative p-3 bg-primary text-primary-foreground rounded-full -mt-5 shadow-lg border-4 border-background/90">
              <DollarSign className="h-6 w-6" />
            </div>
            <span className="text-[10px] mt-1 font-medium">{t('signal')}</span>
          </Link>

          <Link href="/group-chat" className="flex flex-col items-center text-muted-foreground hover:text-primary mobile-nav-item transition-colors">
            <MessageCircle className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('group_chats')}</span>
          </Link>

          <Link href="/settings" className="flex flex-col items-center text-muted-foreground hover:text-primary mobile-nav-item transition-colors">
            <Settings className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('settings')}</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}