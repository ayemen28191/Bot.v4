// نظام السمات متعدد المصادر مشابه لنظام i18n
import { z } from "zod";
import { type User } from "@shared/schema";

export type Theme = 'light' | 'dark' | 'system';

// قائمة السمات المدعومة
export const supportedThemes: Theme[] = ['light', 'dark', 'system'];

// Global state للسمة الحالية
let currentTheme: Theme = 'system';
let isUserAuthenticated = false;
let currentUser: User | null = null;

// دالة للحصول على السمة الحالية
export function getCurrentTheme(user?: User | null): Theme {
  // أولوية 1: إذا كان المستخدم مسجل دخول ولديه سمة مفضلة
  if (user && user.preferredTheme && supportedThemes.includes(user.preferredTheme as Theme)) {
    console.log('Theme from user preferences:', user.preferredTheme);
    return user.preferredTheme as Theme;
  }

  // أولوية 2: إذا كان المستخدم غير مسجل، استخدم localStorage
  if (!user) {
    try {
      const savedSettings = localStorage.getItem('settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.theme && supportedThemes.includes(settings.theme)) {
          console.log('Theme from localStorage settings:', settings.theme);
          return settings.theme as Theme;
        }
      }
    } catch (e) {
      console.error('Error loading saved theme setting:', e);
    }
  }

  // أولوية 3: fallback إلى system
  console.log('Using default theme: system');
  return 'system';
}

// دالة لتطبيق السمة على DOM
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  
  // إزالة جميع classes الخاصة بالسمات
  root.classList.remove('light', 'dark');
  
  if (theme === 'system') {
    // استخدام إعدادات النظام
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.add(systemTheme);
    root.setAttribute('data-theme', systemTheme);
    console.log('Applied system theme:', systemTheme);
  } else {
    // استخدام السمة المحددة
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
    console.log('Applied theme:', theme);
  }
}

// دالة لتغيير السمة
export function changeTheme(newTheme: Theme, saveToDatabase: boolean = true) {
  if (!supportedThemes.includes(newTheme)) {
    console.error('Unsupported theme:', newTheme);
    return;
  }

  currentTheme = newTheme;
  applyTheme(newTheme);
  
  console.log('Theme changed to:', newTheme, 'Save to DB:', saveToDatabase);

  // حفظ في localStorage للمستخدمين غير المسجلين
  if (!isUserAuthenticated || !saveToDatabase) {
    try {
      const savedSettings = localStorage.getItem('settings') || '{}';
      const settings = JSON.parse(savedSettings);
      settings.theme = newTheme;
      localStorage.setItem('settings', JSON.stringify(settings));
      console.log('Theme saved to localStorage');
    } catch (e) {
      console.error('Error saving theme to localStorage:', e);
    }
  }

  // حفظ في قاعدة البيانات للمستخدمين المسجلين
  if (isUserAuthenticated && saveToDatabase && currentUser) {
    saveThemeToDatabase(newTheme);
  }

  // إرسال حدث لإخطار ThemeProvider بالتغيير
  dispatchThemeChangeEvent(newTheme);
}

// دالة لحفظ السمة في قاعدة البيانات
async function saveThemeToDatabase(theme: Theme) {
  try {
    const response = await fetch('/api/user/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ preferredTheme: theme }),
    });

    if (!response.ok) {
      throw new Error('Failed to save theme to database');
    }

    const result = await response.json();
    console.log('Theme saved to database successfully:', result);
    
    // تحديث بيانات المستخدم المحلية
    if (currentUser) {
      currentUser.preferredTheme = theme;
    }
  } catch (error) {
    console.error('Error saving theme to database:', error);
  }
}

// دالة تهيئة نظام السمات مع بيانات المستخدم
export function initializeThemeSystem(user: User) {
  console.log('Theme system initialized with user:', user.preferredTheme, '(from user data)');
  isUserAuthenticated = true;
  currentUser = user;
  
  const userTheme = getCurrentTheme(user);
  changeTheme(userTheme, false); // false لمنع الحفظ في قاعدة البيانات مرة أخرى
}

// دالة مسح السمة عند تسجيل الخروج
export function clearThemeOnLogout() {
  console.log('Theme cleared on logout, reset to system');
  isUserAuthenticated = false;
  currentUser = null;
  
  // العودة إلى system theme
  changeTheme('system', false);
  console.log('Theme system reset to system on logout');
}

// دالة التهيئة الأولية للنظام
export function initializeDefaultTheme() {
  console.log('Initial theme system setup with system');
  const defaultTheme = getCurrentTheme();
  changeTheme(defaultTheme, false);
}

// دالة للاستماع لتغييرات النظام
export function setupSystemThemeListener() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleSystemThemeChange = () => {
    // إعادة تطبيق السمة فقط إذا كانت system
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  };

  mediaQuery.addEventListener('change', handleSystemThemeChange);
  
  // إرجاع دالة لإزالة المستمع
  return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
}

// دوال مساعدة للتحقق من السمة الحالية
export function isCurrentTheme(theme: Theme): boolean {
  return currentTheme === theme;
}

export function getCurrentThemeState(): Theme {
  return currentTheme;
}

// دالة للحصول على السمة المطبقة فعلياً (حل system إلى light/dark)
export function getResolvedTheme(): 'light' | 'dark' {
  if (currentTheme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return currentTheme as 'light' | 'dark';
}