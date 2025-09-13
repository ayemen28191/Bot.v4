import { Settings, User } from "lucide-react";
import { Link } from "wouter";
import { t } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="bg-primary text-primary-foreground p-2 shadow-md border-b">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/">
          <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
            <img 
              src="/images/robot-logo.svg" 
              alt={t('app_name_short')} 
              className="h-10 w-10 mr-2" 
              data-testid="img-app-logo"
            />
            <div>
              <h1 className="text-xl font-bold" data-testid="text-app-name">{t('app_name_short')}</h1>
              <p className="text-xs opacity-75" data-testid="text-app-subtitle">{t('app_name')}</p>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/20" data-testid="button-settings">
              <Settings className="h-5 w-5" />
              <span className="sr-only">{t('settings')}</span>
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/20" data-testid="button-profile">
              <User className="h-5 w-5" />
              <span className="sr-only">{t('profile')}</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
