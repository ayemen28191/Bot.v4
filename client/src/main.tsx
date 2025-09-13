import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
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
    console.warn(t('theme_config_error'), error);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
