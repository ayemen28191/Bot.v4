import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/common.css"; // Load common styles first instead of index.css
import { initializeLanguageSystem } from "./lib/i18n";
import { initializeDefaultTheme, setupSystemThemeListener } from "./lib/themeSystem";
import './lib/errorHandler'; // تحميل معالج الأخطاء العام

// تهيئة النظام اللغوي
initializeLanguageSystem();

// تهيئة النظام اللوني الافتراضي وإعداد مستمع تغيير سمة النظام
initializeDefaultTheme();
setupSystemThemeListener();

// إنشاء جذر التطبيق
const root = createRoot(document.getElementById("root")!);

// عرض التطبيق
root.render(
  <App />
);