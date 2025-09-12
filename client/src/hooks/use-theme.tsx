import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

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
    // أولاً نحاول قراءة من localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) return stored as Theme;
      
      // ثم نحاول قراءة من theme.json إذا لم يوجد في localStorage
      try {
        // قراءة theme.json من العنصر data إذا كان موجود
        const themeJsonElement = document.querySelector('[data-theme-config]');
        if (themeJsonElement) {
          const themeConfig = JSON.parse(themeJsonElement.getAttribute('data-theme-config') || '{}');
          if (themeConfig.appearance) {
            return themeConfig.appearance as Theme;
          }
        }
      } catch (error) {
        console.warn('فشل في قراءة إعدادات theme.json:', error);
      }
    }
    
    return defaultTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      root.setAttribute('data-theme', systemTheme);
      return;
    }

    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
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