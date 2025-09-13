import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setLanguage, getBrowserLanguage } from "./lib/i18n";
import { initializeDefaultTheme, setupSystemThemeListener } from "./lib/themeSystem";
// @ts-ignore - theme.json is read-only config
import themeConfig from "../../theme.json";

// تطبيق إعدادات theme.json على DOM
if (typeof window !== 'undefined') {
  try {
    // تعيين بيانات theme config في DOM ليتمكن ThemeProvider من قراءتها
    document.documentElement.setAttribute('data-theme-config', JSON.stringify(themeConfig));
    
    // تطبيق الوضع الافتراضي من theme.json إذا لم يوجد إعداد محفوظ
    const savedTheme = localStorage.getItem('ui-theme');
    if (!savedTheme && themeConfig.appearance) {
      document.documentElement.setAttribute('data-theme', themeConfig.appearance);
      document.documentElement.classList.add(themeConfig.appearance);
    }
  } catch (error) {
    console.warn('Theme config error:', error);
  }
}

// تهيئة اللغة الإنجليزية كافتراضية
if (typeof window !== 'undefined') {
  try {
    const initialLanguage = getBrowserLanguage();
    setLanguage(initialLanguage);
  } catch (error) {
    console.warn('Language initialization error:', error);
    setLanguage('en'); // الإنجليزية كافتراضي في حالة الخطأ
  }
}

// تهيئة نظام Theme الافتراضي
if (typeof window !== 'undefined') {
  try {
    initializeDefaultTheme();
    setupSystemThemeListener();
  } catch (error) {
    console.warn('Theme initialization error:', error);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
