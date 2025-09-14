import { useState, useEffect, useCallback } from 'react';

interface ConnectionState {
  isOnline: boolean;
  isChecking: boolean;
  lastCheckTime: number | null;
  checkConnection: () => Promise<boolean>;
  resetState: () => void;
}

export function useConnection(
  pingUrl = '/health',
  checkInterval = 90000, // فحص كل 1.5 دقيقة افتراضيًا - أقل تكرارًا
  autoCheck = true
): ConnectionState {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null);

  // فحص الاتصال بالخادم
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (isChecking) return isOnline;

    setIsChecking(true);

    try {
      // فحص الاتصال بالإنترنت أولًا
      if (!navigator.onLine) {
        setIsOnline(false);
        return false;
      }

      // فحص الاتصال بالخادم من خلال طلب بسيط
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // timeout بعد 12 ثانية - وقت أطول لتجنب الإلغاء المتكرر

      const response = await fetch(pingUrl, {
        method: 'GET',
        headers: { 
          'Cache-Control': 'no-cache',
          'Accept': 'application/json',
          'Connection': 'keep-alive'
        },
        signal: controller.signal,
        credentials: 'include'
      });

      clearTimeout(timeoutId);

      // التحقق من أن الاستجابة صحيحة ولها محتوى JSON
      const isConnected = response.ok && response.status === 200;
      setIsOnline(isConnected);
      setLastCheckTime(Date.now());

      return isConnected;
    } catch (error) {
      // تجاهل أخطاء الإنهاء والأخطاء المؤقتة - منع الإبلاغ عنها كأخطاء frontend
      const isAbortError = error instanceof Error && 
                          (error.name === 'AbortError' || error.message.includes('aborted') || error.message.includes('user aborted'));
      const isNetworkError = error instanceof Error && 
                           (error.message.includes('Failed to fetch') ||
                            error.message.includes('NetworkError') ||
                            error.message.includes('timeout'));

      // منع تسجيل الأخطاء المتوقعة تمامًا (abort, network, timeout)
      // هذه أخطاء طبيعية في فحص الاتصال ولا تستدعي القلق
      if (!isAbortError && !isNetworkError) {
        console.warn('🌐 Connection check failed:', { 
          url: pingUrl, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // منع انتشار أخطاء AbortError لتجنب الإبلاغ عنها في تقارير frontend
      if (isAbortError) {
        // تسجيل محدود فقط للتطوير
        if (process.env.NODE_ENV === 'development') {
          console.debug('🔄 Connection check aborted (normal behavior)');
        }
      }

      setIsOnline(false);
      setLastCheckTime(Date.now());

      return false;
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, isOnline, pingUrl]);

  // إعادة ضبط حالة الاتصال
  const resetState = useCallback(() => {
    setIsOnline(navigator.onLine);
    setLastCheckTime(null);
  }, []);

  // الاستماع لتغييرات الاتصال بالإنترنت
  useEffect(() => {
    const handleOnline = () => {
      // إعادة فحص الاتصال بالخادم عند عودة الإنترنت
      checkConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  // فحص دوري للاتصال
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (autoCheck) {
      // فحص أولي
      checkConnection();

      // فحص دوري
      intervalId = setInterval(() => {
        checkConnection();
      }, checkInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoCheck, checkConnection, checkInterval]);

  return {
    isOnline,
    isChecking,
    lastCheckTime,
    checkConnection,
    resetState
  };
}

export default useConnection;