import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  getCurrentTheme, 
  changeTheme, 
  setupSystemThemeListener, 
  initializeDefaultTheme,
  getCurrentThemeState,
  type Theme 
} from '@/lib/themeSystem';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      // استخدام نظام السمات المتطور بدلاً من localStorage مباشرة
      const currentTheme = getCurrentTheme();
      console.log('ThemeProvider initialized with theme:', currentTheme);
      return currentTheme;
    }
    return defaultTheme;
  });

  useEffect(() => {
    // تهيئة النظام الافتراضي فقط في البداية
    if (typeof window !== 'undefined') {
      initializeDefaultTheme();
      
      // إعداد مستمع لتغييرات النظام
      const cleanupListener = setupSystemThemeListener();
      
      return cleanupListener;
    }
  }, []);
  
  useEffect(() => {
    // تحديث الحالة المحلية عند تغيير السمة من خلال النظام الخارجي
    const currentSystemTheme = getCurrentThemeState();
    if (currentSystemTheme !== theme) {
      setTheme(currentSystemTheme);
    }
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      console.log('ThemeProvider setTheme called with:', newTheme);
      // استخدام نظام السمات المتطور
      changeTheme(newTheme);
      setTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};