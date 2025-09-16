import { Settings, User, Globe } from "lucide-react";
import { Link } from "wouter";
import { t, changeLanguage, getCurrentLanguage, supportedLanguages } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";

// مكون تبديل اللغة
function LanguageToggle() {
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLang(getCurrentLanguage());
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

  const handleLanguageChange = (langId: string) => {
    changeLanguage(langId, true);
    setCurrentLang(langId);
    
    // إعادة تحميل الصفحة لتطبيق التغييرات بشكل كامل
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-primary-foreground hover:bg-primary/20" 
          data-testid="button-language"
        >
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t('language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.id}
            onClick={() => handleLanguageChange(lang.id)}
            className={`cursor-pointer ${
              currentLang === lang.id ? 'bg-accent font-medium' : ''
            }`}
          >
            <span className={`${currentLang === lang.id ? 'font-bold' : ''}`}>
              {lang.name}
            </span>
            {currentLang === lang.id && (
              <span className="ml-auto text-xs">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
          <LanguageToggle />
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
