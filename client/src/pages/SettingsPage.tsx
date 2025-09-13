import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Bell, Clock, DollarSign, LineChart, Settings, MessageCircle, Globe, BarChart, Users, LogOut, Bot } from 'lucide-react';
import { setLanguage, supportedLanguages, t, getCurrentLanguage, initializeLanguageSystem } from '@/lib/i18n';
import { changeTheme, getCurrentTheme, supportedThemes, type Theme } from '@/lib/themeSystem';
import { useAuth } from '@/hooks/use-auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(() => {
    try {
      const savedSettings = localStorage.getItem('settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        return settings.notifications !== undefined ? settings.notifications : true;
      }
    } catch (e) {
      console.error('Error loading saved notifications setting:', e);
    }
    return true; 
  });

  const [marketAlerts, setMarketAlerts] = useState(true);

  const [timezone, setTimezone] = useState(() => {
    try {
      const savedSettings = localStorage.getItem('settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        return settings.timezone || 'auto';
      }
    } catch (e) {
      console.error('Error loading saved timezone setting:', e);
    }
    return 'auto'; 
  });

  const getActualTimezone = () => {
    if (timezone === 'auto') {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return timezone;
  };

  const [language, setLanguageState] = useState(() => {
    return getCurrentLanguage(user);
  });

  const [theme, setTheme] = useState(() => {
    return getCurrentTheme(user);
  });

  useEffect(() => {
    // تحديث السمة عند تغيير المستخدم
    const userTheme = getCurrentTheme(user);
    setTheme(userTheme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme('system');
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const [showSuccess, setShowSuccess] = useState(false);

  const timezones = [
    { id: 'auto', name: t('auto_timezone') },
    { id: 'UTC', name: t('utc') },
    { id: 'Asia/Riyadh', name: t('riyadh') },
    { id: 'Asia/Dubai', name: t('dubai') },
    { id: 'Asia/Kuwait', name: t('kuwait') },
    { id: 'Asia/Qatar', name: t('doha') },
    { id: 'Asia/Jerusalem', name: t('jerusalem') },
    { id: 'Africa/Cairo', name: t('cairo') },
    { id: 'Europe/London', name: t('london') },
    { id: 'Europe/Paris', name: t('paris') },
    { id: 'America/New_York', name: t('new_york') },
    { id: 'Asia/Tokyo', name: t('tokyo') },
    { id: 'Asia/Hong_Kong', name: t('hong_kong') },
    { id: 'Australia/Sydney', name: t('sydney') },
  ];

  const languages = supportedLanguages;

  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      setLanguageState(event.detail.language);
    };

    window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
    };
  }, []);

  // Initialize language system with user context on mount and user change
  useEffect(() => {
    if (user) {
      initializeLanguageSystem(user);
      const userLang = getCurrentLanguage(user);
      if (userLang !== language) {
        setLanguageState(userLang);
      }
    }
  }, [user]);

  // Mutation to save user settings to database
  const saveUserSettingsMutation = useMutation({
    mutationFn: async (preferredLanguage: string) => {
      const response = await apiRequest('PUT', '/api/user/settings', {
        preferredLanguage
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Update the user data in cache
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Settings saved successfully",
        description: "Your language preference has been saved.",
      });
      console.log('Language settings saved to database:', data);
    },
    onError: (error: Error) => {
      console.error('Error saving language settings:', error);
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLanguageChange = (newLang: string) => {
    setLanguageState(newLang);
    // Save to localStorage immediately for responsive UI
    setLanguage(newLang, false);
    
    // Save to database if user is logged in
    if (user) {
      saveUserSettingsMutation.mutate({ preferredLanguage: newLang });
    } else {
      // For non-logged users, just show success locally
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    // Apply theme immediately using the new system
    changeTheme(newTheme, false);
    
    // Save to database if user is logged in
    if (user) {
      saveUserSettingsMutation.mutate({ preferredTheme: newTheme });
    } else {
      // For non-logged users, just show success locally
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    }
  };

  const themes = [
    { id: 'dark', name: t('dark_mode') },
    { id: 'light', name: t('light_mode') },
    { id: 'system', name: t('system_theme') },
  ];

  const saveSettings = () => {
    // Save general settings to localStorage (notifications, timezone)
    localStorage.setItem('settings', JSON.stringify({
      notifications,
      timezone,
    }));
    
    // Language and theme are now saved automatically when changed
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
    
    window.dispatchEvent(new Event('storage'));
  };

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <div className="settings-page flex flex-col min-h-screen bg-gray-900 text-white">
      <header className="fixed top-0 left-0 right-0 flex justify-between items-center p-3 border-b border-gray-700/60 bg-gray-900/90 backdrop-blur-md z-50 shadow-md">
        <div className="flex items-center">
          <Link href="/">
            <button className="p-1.5 mr-2 rounded-full bg-gray-800/80 border border-gray-700/60">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="font-bold text-lg flex items-baseline">
            <span className="text-yellow-400 ml-1">{t('app_name')} - {t('settings')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="p-1.5 rounded-full bg-gray-800/80 border border-gray-700/60"
            onClick={handleLogout}
          >
            <LogOut className="text-gray-300 h-4 w-4" />
          </button>
          <button className="p-1.5 rounded-full bg-gray-800/80 border border-gray-700/60">
            <Bell className="text-gray-300 h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-3 mt-16">
        <div className="max-w-md mx-auto">
          <div className="w-full mb-4 rounded-2xl border border-gray-700/60 bg-gray-800/50 backdrop-blur-sm overflow-hidden">
            <div className="p-3 border-b border-gray-700/60">
              <h2 className="text-base font-bold mb-2.5 text-yellow-400 flex items-center">
                <Bell className="h-3.5 w-3.5 ml-1.5" />
                {t('notifications')}
              </h2>
              <div className="bg-gray-800/80 rounded-xl p-2.5 border border-gray-700/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Bell className="h-4 w-4 ml-2 text-yellow-400" />
                    <div className="mr-1">
                      <div className="font-medium text-sm">{t('signal_notifications')}</div>
                      <div className="text-[10px] text-gray-400">{t('receive_signal_notifications')}</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notifications}
                      onChange={() => setNotifications(!notifications)}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                  </label>
                </div>
              </div>
              <div className="bg-gray-800/80 rounded-xl p-2.5 border border-gray-700/50 shadow-sm mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Bell className="h-4 w-4 ml-2 text-yellow-400" />
                    <div className="mr-1">
                      <div className="font-medium text-sm">{t('market_alerts')}</div>
                      <div className="text-[10px] text-gray-400">{t('receive_market_alerts')}</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={marketAlerts}
                      onChange={() => setMarketAlerts(!marketAlerts)}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-3 border-b border-gray-700/60 bg-gray-800/30">
              <h2 className="text-base font-bold mb-2.5 text-yellow-400 flex items-center">
                <Clock className="h-3.5 w-3.5 ml-1.5" />
                {t('timezone')}
              </h2>
              <div className="bg-gray-800/80 rounded-xl p-2.5 border border-gray-700/50 shadow-sm mb-2">
                <div className="flex items-center mb-2">
                  <Clock className="h-4 w-4 ml-2 text-yellow-400" />
                  <div className="font-medium text-sm">{t('choose_timezone')}</div>
                </div>
                <select
                  className="w-full bg-gray-700 text-white p-2 text-sm rounded-xl border border-gray-600"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  {timezones.map(tz => (
                    <option key={tz.id} value={tz.id}>{tz.name}</option>
                  ))}
                </select>
                <div className="text-[10px] text-gray-400 mt-1.5 pt-1.5 border-t border-gray-700/30 flex items-center">
                  <Clock className="h-3 w-3 ml-1 opacity-60" />
                  {t('timezone_description')}
                </div>
              </div>

              {timezone === 'auto' && (
                <div className="bg-gray-800/80 rounded-xl p-2.5 border border-dashed border-yellow-500/30 shadow-sm">
                  <div className="flex items-center mb-1">
                    <Globe className="h-4 w-4 ml-2 text-yellow-400" />
                    <div className="font-medium text-sm">{t('detected_timezone')}</div>
                  </div>
                  <div className="bg-gray-700/50 border border-gray-600/50 rounded-lg py-1.5 px-2 text-sm flex items-center justify-between text-gray-200">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 ml-1 text-yellow-400" />
                      <span>{getActualTimezone()}</span>
                    </div>
                    <div className="text-xs text-yellow-400/80 py-0.5 px-1.5 bg-yellow-400/10 rounded border border-yellow-400/20">
                      {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1.5 pt-1.5 border-t border-gray-700/30 flex items-center">
                    <Clock className="h-3 w-3 ml-1 opacity-60" />
                    {t('auto_timezone_description')}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3">
              <h2 className="text-base font-bold mb-2.5 text-yellow-400 flex items-center">
                <Globe className="h-3.5 w-3.5 ml-1.5" />
                {t('language')}
              </h2>
              <div className="bg-gray-800/80 rounded-xl p-2.5 border border-gray-700/50 shadow-sm">
                <div className="mb-2 text-sm font-medium flex items-center">
                  <Globe className="h-4 w-4 ml-2 text-yellow-400" />
                  {t('choose_app_language')}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {languages.map(lang => (
                    <button
                      key={lang.id}
                      className={`py-2 px-3 text-sm rounded-xl border transition-all duration-150 ${
                        language === lang.id
                          ? 'bg-yellow-400 text-black border-yellow-500 font-bold shadow-md'
                          : 'bg-gray-700 border-gray-600 hover:bg-gray-650'
                      }`}
                      onClick={() => handleLanguageChange(lang.id)}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3">
              <h2 className="text-base font-bold mb-2.5 text-yellow-400 flex items-center">
                <Settings className="h-3.5 w-3.5 ml-1.5" />
                {t('themes')}
              </h2>
              <div className="bg-gray-800/80 rounded-xl p-2.5 border border-gray-700/50 shadow-sm">
                <div className="grid grid-cols-3 gap-2">
                  {themes.map(t => (
                    <button
                      key={t.id}
                      className={`py-2 px-3 text-sm rounded-xl border transition-all duration-150 ${
                        theme === t.id
                          ? 'bg-yellow-400 text-black border-yellow-500 font-bold shadow-md'
                          : 'bg-gray-700 border-gray-600 hover:bg-gray-650'
                      }`}
                      onClick={() => handleThemeChange(t.id as Theme)}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full mb-4 rounded-2xl border border-gray-700/60 bg-gray-800/50 backdrop-blur-sm overflow-hidden">
            <div className="p-3">
              <h2 className="text-base font-bold mb-2.5 text-yellow-400 flex items-center">
                <Settings className="h-3.5 w-3.5 ml-1.5" />
                {t('account_info')}
              </h2>
              <div className="bg-gray-800/80 rounded-xl p-3 border border-gray-700/50 shadow-sm mb-2">
                <div className="flex items-center">
                  <div className="rounded-full bg-gray-700 h-12 w-12 ml-2.5 flex items-center justify-center text-lg font-bold text-yellow-400">
                    {user?.username ? user.username.charAt(0).toUpperCase() : 'م'}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{user?.username || t('app_user')}</div>
                    <div className="text-[10px] text-gray-400">{t('free_account')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            className={`w-full py-3 rounded-xl font-bold text-base shadow-lg transition duration-150 transform hover:translate-y-[-2px] active:translate-y-[1px] ${
              saveUserSettingsMutation.isPending
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-yellow-400 hover:bg-yellow-500 text-black'
            }`}
            onClick={saveSettings}
            disabled={saveUserSettingsMutation.isPending}
            data-testid="button-save-settings"
          >
            {saveUserSettingsMutation.isPending ? 'Saving...' : t('save_settings')}
          </button>

          {showSuccess && (
            <div className="fixed top-20 left-1/2 transform -translate-x-1/2 p-3 bg-green-900/80 backdrop-blur-sm text-white rounded-xl border border-green-600 shadow-lg z-50 flex items-center transition-all duration-300 animate-in fade-in slide-in-from-top-3">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center ml-2 flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <span className="text-sm">{t('settings_saved')}</span>
            </div>
          )}

          <div className="text-center mt-3 text-[10px] text-gray-500">
            <p>{t('app_version')} 1.0.0</p>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-700/50 bg-gray-900/90 backdrop-blur-md z-50 pt-1.5 pb-2 mobile-navbar">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {user?.isAdmin ? (
            <Link href="/admin" className="flex flex-col items-center text-gray-400 hover:text-yellow-400 mobile-nav-item">
              <Users className="h-5 w-5" />
              <span className="text-[10px] mt-1 font-medium">{t('users')}</span>
            </Link>
          ) : (
            <Link href="/bot-info" className="flex flex-col items-center text-gray-400 hover:text-yellow-400 mobile-nav-item">
              <Bot className="h-5 w-5" />
              <span className="text-[10px] mt-1 font-medium">{t('bot_info')}</span>
            </Link>
          )}

          <Link href="/indicators" className="flex flex-col items-center text-gray-400 hover:text-yellow-400 mobile-nav-item">
            <BarChart className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('indicators')}</span>
          </Link>

          <Link href="/" className="flex flex-col items-center text-gray-400 hover:text-yellow-400 mobile-nav-item">
            <div className="relative p-3 bg-yellow-400 text-black rounded-full -mt-5 shadow-lg border-4 border-gray-900/90">
              <DollarSign className="h-6 w-6" />
            </div>
            <span className="text-[10px] mt-1 font-medium">{t('signal')}</span>
          </Link>

          <Link href="/group-chat" className="flex flex-col items-center text-gray-400 hover:text-yellow-400 mobile-nav-item">
            <MessageCircle className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('group_chats')}</span>
          </Link>

          <Link href="/settings" className="flex flex-col items-center text-yellow-400 mobile-nav-item active">
            <Settings className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('settings')}</span>
          </Link>
        </div>
      </footer>

      <div className="h-16"></div>
    </div>
  );
}