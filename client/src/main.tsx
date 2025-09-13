import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/common.css"; // Load common styles first instead of index.css
import { setLanguage, getBrowserLanguage } from "./lib/i18n";
import { initializeDefaultTheme, setupSystemThemeListener } from "./lib/themeSystem";
// @ts-ignore - theme.json is read-only config
import themeConfig from "../../theme.json";

// تطبيق إعدادات theme.json على DOM (للثيم الافتراضي فقط)
if (typeof window !== 'undefined') {
  try {
    // تعيين بيانات theme config في DOM ليتمكن ThemeProvider من قراءتها
    document.documentElement.setAttribute('data-theme-config', JSON.stringify(themeConfig));
  } catch (error) {
    console.warn('Theme config error:', error);
  }
}

// تهيئة اللغة مع تحميل CSS الديناميكي
if (typeof window !== 'undefined') {
  try {
    const initialLanguage = getBrowserLanguage();
    console.log('Initializing language and CSS system:', initialLanguage);
    setLanguage(initialLanguage); // This will now load the appropriate directional CSS
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
