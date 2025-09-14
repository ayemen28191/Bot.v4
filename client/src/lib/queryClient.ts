import { QueryClient, QueryFunction } from "@tanstack/react-query";

// إعداد العنوان الأساسي للـ API
const getBaseURL = () => {
  if (typeof window === 'undefined') return '';

  // في بيئة التطوير المحلية
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://localhost:5000`;
  }

  // في بيئة Replit أو الإنتاج، استخدم العنوان الحالي
  return window.location.origin;
};

const baseURL = getBaseURL();

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // بناء URL صحيح
  let requestUrl = url;
  
  // إذا كان URL نسبياً، أضف العنوان الأساسي
  if (!requestUrl.startsWith('http')) {
    const baseUrl = baseURL;
    requestUrl = `${baseUrl}${requestUrl.startsWith('/') ? '' : '/'}${requestUrl}`;
  }

  try {
    const res = await fetch(requestUrl, {
      method,
      headers: {
        'Accept': 'application/json',
        ...(data ? { "Content-Type": "application/json" } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include"
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('🌐 API Request Error:', { 
      url: requestUrl, 
      method,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      let url = queryKey[0] as string;
      
      // إضافة العنوان الأساسي للمسارات النسبية
      if (!url.startsWith('http')) {
        url = `${baseURL}${url.startsWith('/') ? '' : '/'}${url}`;
      }

      const res = await fetch(url, {
        credentials: "include",
        headers: {
          'Accept': 'application/json',
        }
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // تمكين إعادة التحميل عند التركيز للحفاظ على تزامن الحالة
      staleTime: 900000, // 15 دقيقة
      gcTime: 3600000, // ساعة واحدة
      retry: (failureCount, error) => {
        // محاولة إعادة المحاولة فقط للأخطاء غير المتعلقة بالمصادقة
        if (error instanceof Error && error.message.startsWith('401:')) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 2,
      retryDelay: 1000,
    },
  },
});

// إضافة دالة مساعدة للحصول على عنوان WebSocket الآمن
export function getWebSocketUrl(path: string = '/ws'): string {
  if (typeof window === 'undefined') {
    // إذا كان كود الخادم، فقط استخدم مسار نسبي
    return path;
  }

  // تحديد البروتوكول بناء على بروتوكول الموقع
  const isSecure = window.location.protocol === 'https:';
  const host = window.location.host;

  // التحقق إذا كان وضع عدم الاتصال مفعل بالفعل
  const isOfflineMode = localStorage.getItem('offlineMode') === 'enabled' || 
                        localStorage.getItem('offline_mode') === 'enabled';

  if (isOfflineMode) {
    console.log('وضع عدم الاتصال مفعل، إعادة مسار WebSocket غير قابل للاتصال');
    return 'wss://offline-mode-enabled-do-not-connect.local/ws';
  }

  // إذا التطبيق على HTTPS في بيئة Replit
  if (isSecure) {
    console.log('HTTPS طريقة الاتصال - التحقق من بيئة التشغيل');

    // التحقق إذا كنا في بيئة Replit
    const isReplitApp = window.location.hostname.endsWith('.replit.app') || 
                        window.location.hostname.endsWith('.repl.co') ||
                        window.location.hostname === 'replit.com' ||
                        window.location.hostname.includes('replit.dev') ||
                        window.location.hostname.includes('replit') ||
                        // فحص في بيئة التطوير المحلية في Replit
                        (isSecure && (window.location.host.includes('5000') || 
                                     window.location.host.includes('8080')));

    if (isReplitApp) {
      console.log('تم اكتشاف بيئة Replit HTTPS - تفعيل وضع عدم الاتصال تلقائيًا');

      // تفعيل وضع عدم الاتصال بشكل فوري
      try {
        // إنشاء حدث مخصص لتفعيل وضع عدم الاتصال
        const event = new CustomEvent('enableOfflineMode', { 
          detail: { 
            reason: 'https_websocket_limitation',
            message: 'لا يمكن الاتصال بـ WebSocket من صفحة HTTPS في Replit. تم تفعيل وضع عدم الاتصال تلقائيًا.' 
          } 
        });
        window.dispatchEvent(event);
        console.log('تم تفعيل وضع عدم الاتصال تلقائيًا');

        // تخزين حالة وضع عدم الاتصال
        try {
          localStorage.setItem('offlineMode', 'enabled');
          localStorage.setItem('offlineModeReason', 'https_websocket_limitation');
        } catch (storageErr) {
          console.warn('فشل في تخزين حالة وضع عدم الاتصال:', storageErr);
        }
      } catch (e) {
        console.error('فشل في تفعيل وضع عدم الاتصال:', e);
      }

      // إرجاع URL خاص للإشارة إلى وضع عدم الاتصال
      return 'wss://offline-mode-enabled-in-replit-https.local/ws';
    }
  }

  // استخدام البروتوكول المناسب بناءً على بروتوكول الصفحة
  const protocol = isSecure ? 'wss:' : 'ws:';
  return `${protocol}//${host}${path}`;
}