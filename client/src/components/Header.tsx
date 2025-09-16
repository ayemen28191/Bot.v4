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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleLanguageChange = (event: any) => {
      console.log('Language change event received:', event.detail);
      const newLang = event.detail?.language || getCurrentLanguage();
      setCurrentLang(newLang);
    };

    const handleForceUpdate = () => {
      const newLang = getCurrentLanguage();
      console.log('Force translation update:', newLang);
      setCurrentLang(newLang);
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    window.addEventListener('forceTranslationUpdate', handleForceUpdate);
    
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
      window.removeEventListener('forceTranslationUpdate', handleForceUpdate);
    };
  }, []);

  const handleLanguageChange = (langId: string) => {
    console.log('Language change requested:', langId);
    
    try {
      // تحديث اللغة فوراً
      changeLanguage(langId, true);
      setCurrentLang(langId);
      setIsOpen(false);
      
      // لا نحتاج لإعادة تحميل الصفحة، فقط نرسل أحداث التحديث
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('languageChanged', { 
          detail: { language: langId, saveToDatabase: true } 
        }));
        window.dispatchEvent(new CustomEvent('forceTranslationUpdate', { 
          detail: { language: langId } 
        }));
      }, 50);
      
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-primary-foreground hover:bg-primary/20 transition-colors duration-200" 
          data-testid="button-language"
          title={t('language')}
        >
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t('language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px] z-50">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.id}
            onClick={() => handleLanguageChange(lang.id)}
            className={`cursor-pointer hover:bg-accent transition-colors duration-150 ${
              currentLang === lang.id ? 'bg-accent font-medium' : ''
            }`}
          >
            <span className={`flex-1 ${currentLang === lang.id ? 'font-bold' : ''}`}>
              {lang.name}
            </span>
            {currentLang === lang.id && (
              <span className="ml-auto text-xs text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Header() {
  // تسجيل تشخيصي للتأكد من تحميل المكون
  console.log('🔨 Header component rendered');
  
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
