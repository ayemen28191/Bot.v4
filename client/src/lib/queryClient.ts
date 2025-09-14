import { QueryClient, QueryFunction } from "@tanstack/react-query";

type UnauthorizedBehavior = "throw" | "returnNull";

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
  retryCount = 0
): Promise<Response> {
  const maxRetries = 3;
  const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);

  try {
    // التأكد من أن URL يبدأ بـ / أو http/https
    const cleanUrl = url.startsWith('http') ? url : 
                     url.startsWith('/') ? url : `/${url}`;

    const res = await fetch(cleanUrl, {
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
      mode: 'cors', // تغيير إلى cors للسماح بطلبات cross-origin
      signal: AbortSignal.timeout(15000) // timeout بعد 15 ثانية
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    // تجاهل أخطاء AbortError ومنع الإبلاغ عنها
    if (error?.name === 'AbortError' || error?.message?.includes('user aborted') || error?.message?.includes('aborted')) {
      // لا تعيد المحاولة عند الإلغاء المتعمد
      if (process.env.NODE_ENV === 'development') {
        console.debug('🔄 API request aborted (normal behavior)');
      }
      throw error;
    }
    
    // إذا كان خطأ شبكة مؤقت وما زال لدينا محاولات، أعد المحاولة
    if (retryCount < maxRetries && 
        (error?.message?.includes('Failed to fetch') ||
         error?.message?.includes('NetworkError') ||
         error?.message?.includes('timeout'))) {
      
      console.warn(`🔄 إعادة المحاولة ${retryCount + 1}/${maxRetries} للطلب: ${url}`);
      
      // انتظار قبل إعادة المحاولة
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      return apiRequest(method, url, data, retryCount + 1);
    }

    throw error;
  }
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

// إضافة دالة مساعدة للحصول على عنوان WebSocket مع اختيار البروتوكول التلقائي
export function getWebSocketUrl(path: string = '/ws'): string {
  if (typeof window === 'undefined') {
    // إذا كان كود الخادم، فقط استخدم مسار نسبي
    return path;
  }

  try {
    // التحقق إذا كان وضع عدم الاتصال مفعل بالفعل
    const isOfflineMode = localStorage.getItem('offlineMode') === 'enabled' || 
                          localStorage.getItem('offline_mode') === 'enabled';
    
    if (isOfflineMode) {
      console.log('🔄 وضع عدم الاتصال مفعل، تجاهل WebSocket');
      return 'wss://offline-mode-enabled.local/ws';
    }

    // اختيار البروتوكول تلقائياً بناء على بروتوكول الصفحة
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // في بيئة Replit HTTPS، تفعيل وضع عدم الاتصال تلقائياً
    const isReplitHTTPS = window.location.protocol === 'https:' && 
                          (window.location.hostname.includes('replit') || 
                           window.location.hostname.includes('repl.co'));
    
    if (isReplitHTTPS) {
      console.log('🔒 بيئة Replit HTTPS - تفعيل وضع عدم الاتصال تلقائياً');
      localStorage.setItem('offline_mode', 'enabled');
      localStorage.setItem('offline_reason', 'replit_https_auto');
      return 'wss://replit-https-offline.local/ws';
    }

    const websocketUrl = `${protocol}//${host}${path}`;
    console.log(`🌐 اختيار البروتوكول التلقائي: ${websocketUrl}`);
    return websocketUrl;
  } catch (error) {
    console.error('خطأ في إنشاء عنوان WebSocket:', error);
    // في حالة الخطأ، أرجع عنوان آمن افتراضي
    return 'wss://fallback-offline-mode.local/ws';
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