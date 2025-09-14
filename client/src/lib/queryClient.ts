import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      // إضافة هيدر CSRF إذا كان موجوداً
      ...((window as any).csrfToken ? { 'X-CSRF-Token': (window as any).csrfToken } : {}),
      // إضافة رؤوس CORS إضافية
      'Accept': 'application/json, text/plain, */*',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // مهم لإرسال ملفات تعريف الارتباط
    mode: 'cors' // تغيير إلى cors للسماح بطلبات cross-origin
  });

  await throwIfResNotOk(res);
  return res;
}

// دالة مساعدة للطلبات الخارجية عبر الوكيل
export async function proxyRequest(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    data?: unknown;
  }
): Promise<any> {
  const response = await apiRequest('POST', '/api/proxy/fetch', {
    url,
    method: options?.method || 'GET',
    headers: options?.headers || {},
    data: options?.data
  });

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Proxy request failed');
  }
  
  return result.data;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        mode: 'same-origin',
        headers: {
          'Accept': 'application/json',
          ...((window as any).csrfToken ? { 'X-CSRF-Token': (window as any).csrfToken } : {})
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
        // عدم إعادة المحاولة للأخطاء المتعلقة بالمصادقة
        if (error instanceof Error && error.message.startsWith('401:')) {
          return false;
        }
        
        // عدم إعادة المحاولة للأخطاء الدائمة
        if (error instanceof Error && (
          error.message.includes('404:') ||
          error.message.includes('403:') ||
          error.message.includes('400:')
        )) {
          return false;
        }
        
        // إعادة المحاولة للأخطاء المؤقتة فقط
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => {
        // تأخير متزايد مع حد أقصى
        const baseDelay = 1000;
        const maxDelay = 30000;
        const delay = Math.min(baseDelay * Math.pow(2, attemptIndex), maxDelay);
        
        // إضافة jitter عشوائي لتجنب thundering herd
        const jitter = Math.random() * 0.1 * delay;
        return delay + jitter;
      },
      networkMode: 'online', // فقط عند وجود اتصال بالإنترنت
    },
    mutations: {
      retry: (failureCount, error) => {
        // نفس منطق الاستعلامات للطفرات
        if (error instanceof Error && (
          error.message.startsWith('401:') ||
          error.message.includes('404:') ||
          error.message.includes('403:') ||
          error.message.includes('400:')
        )) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 10000),
      networkMode: 'online',
    },
  },
});

// إضافة دالة مساعدة للحصول على عنوان WebSocket الآمن مع تحسينات
export function getWebSocketUrl(path: string = '/ws'): string {
  if (typeof window === 'undefined') {
    // إذا كان كود الخادم، فقط استخدم مسار نسبي
    return path;
  }

  try {
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
                          window.location.hostname.includes('.replit.dev');
      
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
  } catch (error) {
    console.error('خطأ في getWebSocketUrl:', error);
    // في حالة الخطأ، إرجاع URL آمن
    return 'wss://error-fallback.local/ws';
  }
}

// إضافة دالة مساعدة لاختبار اتصال WebSocket
export function testWebSocketConnection(url: string, timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(url);
      const timeoutId = setTimeout(() => {
        ws.close();
        resolve(false);
      }, timeout);

      ws.onopen = () => {
        clearTimeout(timeoutId);
        ws.close();
        resolve(true);
      };

      ws.onerror = () => {
        clearTimeout(timeoutId);
        resolve(false);
      };

      ws.onclose = () => {
        clearTimeout(timeoutId);
        resolve(false);
      };
    } catch (error) {
      resolve(false);
    }
  });
}