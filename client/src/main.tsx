
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/common.css";
import { initializeLanguageSystem } from "./lib/i18n";
import { initializeDefaultTheme, setupSystemThemeListener } from "./lib/themeSystem";
import './lib/errorHandler';

// تطبيق إعدادات theme.json على DOM
if (typeof window !== 'undefined') {
  try {
    // @ts-ignore - theme.json is read-only config
    const themeConfig = await import("../../theme.json");
    document.documentElement.setAttribute('data-theme-config', JSON.stringify(themeConfig.default));
  } catch (error) {
    console.warn('Theme config error:', error);
  }
}

// تهيئة النظام اللغوي
if (typeof window !== 'undefined') {
  try {
    console.log('🚀 main.tsx: Initializing language system');
    if (typeof initializeLanguageSystem === 'function') {
      initializeLanguageSystem();
    } else {
      console.warn('⚠️ initializeLanguageSystem function not found');
    }
  } catch (error) {
    console.warn('❌ Language initialization error:', error);
  }
}

// تهيئة نظام الثيم
if (typeof window !== 'undefined') {
  try {
    initializeDefaultTheme();
    setupSystemThemeListener();
  } catch (error) {
    console.warn('Theme initialization error:', error);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
