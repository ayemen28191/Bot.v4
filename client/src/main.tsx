
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/common.css";
import { initializeLanguageSystem } from "./lib/i18n";
import { initializeDefaultTheme, setupSystemThemeListener } from "./lib/themeSystem";
import './lib/errorHandler';

async function initializeApp() {
  console.log('🚀 Starting app initialization...');
  
  try {
    // تطبيق إعدادات theme.json على DOM
    try {
      // @ts-ignore - theme.json is read-only config
      const themeConfig = await import("../../theme.json");
      document.documentElement.setAttribute('data-theme-config', JSON.stringify(themeConfig.default));
      console.log('✅ Theme config loaded');
    } catch (error) {
      console.warn('Theme config error:', error);
    }

    // تهيئة نظام الثيم أولاً
    try {
      initializeDefaultTheme();
      setupSystemThemeListener();
      console.log('✅ Theme system initialized');
    } catch (error) {
      console.warn('Theme initialization error:', error);
    }

    // تهيئة النظام اللغوي
    try {
      console.log('🌐 Initializing language system');
      initializeLanguageSystem();
      console.log('✅ Language system initialized');
    } catch (error) {
      console.warn('❌ Language initialization error:', error);
    }

    // إضافة معالج لخطأ WebSocket في بيئة HTTPS
    if (window.location.protocol === 'https:' && window.location.hostname.includes('replit')) {
      console.log('🔒 HTTPS environment detected - WebSocket issues expected and handled');
      
      // تجاهل أخطاء WebSocket في بيئة HTTPS
      const originalError = console.error;
      console.error = function(...args) {
        const message = args[0]?.toString() || '';
        if (message.includes('WebSocket') || message.includes('SecurityError')) {
          console.warn('🌐 WebSocket error suppressed in HTTPS environment:', ...args);
          return;
        }
        originalError.apply(console, args);
      };
    }

    // تشغيل التطبيق
    const root = createRoot(document.getElementById("root")!);
    root.render(<App />);
    console.log('✅ App rendered successfully');
    
  } catch (error) {
    console.error('❌ App initialization failed:', error);
    
    // عرض رسالة خطأ بدلاً من شاشة بيضاء
    document.body.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 20px;
        background: #f5f5f5;
      ">
        <h1 style="color: #e74c3c; margin-bottom: 20px;">خطأ في تحميل التطبيق</h1>
        <p style="color: #555; margin-bottom: 20px;">حدث خطأ أثناء تهيئة التطبيق</p>
        <button 
          onclick="window.location.reload()" 
          style="
            padding: 10px 20px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
          "
        >
          إعادة المحاولة
        </button>
        <pre style="
          background: #fff;
          padding: 20px;
          border-radius: 5px;
          margin-top: 20px;
          text-align: left;
          max-width: 90%;
          overflow: auto;
          border: 1px solid #ddd;
        ">${error}</pre>
      </div>
    `;
  }
}

// تشغيل التطبيق بعد تحميل DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
