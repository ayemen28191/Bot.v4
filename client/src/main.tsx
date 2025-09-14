
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/common.css";
import { initializeLanguageSystem, getCurrentLanguage } from "./lib/i18n";
import { initializeDefaultTheme, setupSystemThemeListener } from "./lib/themeSystem";
import './lib/errorHandler';

// تهيئة مبكرة للغة قبل بدء التطبيق
function initializeEarlyLanguage() {
  try {
    const currentLang = getCurrentLanguage();
    const isRTL = currentLang === 'ar';
    
    console.log('🚀 Early setup: Applying', currentLang, isRTL ? '(rtl)' : '(ltr)', 'to document');
    
    // تطبيق الإعدادات الأساسية فوراً
    document.documentElement.setAttribute('lang', currentLang);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    
    // إزالة جميع الفئات أولاً
    document.documentElement.classList.remove('ar', 'en', 'hi', 'rtl', 'ltr');
    document.body.classList.remove('font-arabic');
    
    // تطبيق الفئات الصحيحة
    if (isRTL) {
      document.documentElement.classList.add('ar', 'rtl');
      document.body.classList.add('font-arabic');
    } else {
      document.documentElement.classList.add('ltr');
    }
    
    return currentLang;
  } catch (error) {
    console.error('Error in early language setup:', error);
    // الافتراضي إلى الإنجليزية
    document.documentElement.setAttribute('lang', 'en');
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.classList.add('ltr');
    return 'en';
  }
}

async function initializeApp() {
  console.log('🚀 Starting app initialization...');
  
  try {
    // تطبيق اللغة مبكراً
    const currentLang = initializeEarlyLanguage();
    console.log('✅ Early language setup completed:', currentLang);
    
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

    // تهيئة النظام اللغوي بشكل كامل
    try {
      console.log('🌐 Initializing complete language system');
      initializeLanguageSystem();
      console.log('✅ Language system fully initialized');
    } catch (error) {
      console.warn('❌ Language initialization error:', error);
    }

    // إضافة معالج لخطأ WebSocket في بيئة HTTPS
    if (window.location.protocol === 'https:') {
      console.log('🔒 HTTPS environment detected - Setting up WebSocket error handling');
      
      // تجاهل أخطاء WebSocket في بيئة HTTPS
      const originalError = console.error;
      console.error = function(...args) {
        const message = args[0]?.toString() || '';
        if (message.includes('WebSocket') || 
            message.includes('SecurityError') || 
            message.includes('failed to connect to websocket') ||
            message.includes('ERR_SSL_PROTOCOL_ERROR') ||
            message.includes('net::ERR_CONNECTION_REFUSED')) {
          console.warn('🌐 WebSocket error suppressed in HTTPS environment:', ...args);
          
          // تفعيل وضع عدم الاتصال تلقائياً
          try {
            localStorage.setItem('offline_mode', 'enabled');
            localStorage.setItem('offline_reason', 'websocket_security_error');
            
            // إرسال إشعار للمستخدم
            const event = new CustomEvent('websocketError', {
              detail: { message: 'تم تفعيل وضع عدم الاتصال بسبب قيود HTTPS' }
            });
            window.dispatchEvent(event);
          } catch (e) {
            console.warn('Could not set offline mode in localStorage');
          }
          return;
        }
        originalError.apply(console, args);
      };
      
      // تفعيل وضع عدم الاتصال مسبقاً في بيئة HTTPS
      try {
        localStorage.setItem('offline_mode', 'enabled');
        localStorage.setItem('offline_reason', 'https_environment');
        console.log('✅ Offline mode pre-enabled for HTTPS environment');
      } catch (e) {
        console.warn('Could not pre-enable offline mode');
      }
    }

    // التأكد من استمرارية اللغة
    const finalLang = getCurrentLanguage();
    if (finalLang !== currentLang) {
      console.log('Language changed during initialization, reapplying:', finalLang);
      initializeEarlyLanguage();
    }

    // تشغيل التطبيق
    const root = createRoot(document.getElementById("root")!);
    root.render(<App />);
    console.log('✅ App rendered successfully with language:', finalLang);
    
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
        direction: ${getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr'};
      ">
        <h1 style="color: #e74c3c; margin-bottom: 20px;">
          ${getCurrentLanguage() === 'ar' ? 'خطأ في تحميل التطبيق' : 'Application Loading Error'}
        </h1>
        <p style="color: #555; margin-bottom: 20px;">
          ${getCurrentLanguage() === 'ar' ? 'حدث خطأ أثناء تهيئة التطبيق' : 'An error occurred during app initialization'}
        </p>
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
          ${getCurrentLanguage() === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
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
