import { useState, useEffect, useCallback } from 'react';

interface ConnectionState {
  isOnline: boolean;
  isChecking: boolean;
  lastCheckTime: number | null;
  checkConnection: () => Promise<boolean>;
  resetState: () => void;
}

export function useConnection(
  pingUrl = '/api/test/health',
  checkInterval = 60000, // فحص كل دقيقة افتراضيًا
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
      const timeoutId = setTimeout(() => controller.abort(), 5000); // timeout بعد 5 ثواني

      const response = await fetch(pingUrl, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const isConnected = response.ok;
      setIsOnline(isConnected);
      setLastCheckTime(Date.now());

      return isConnected;
    } catch (error) {
      console.error('Connection check error:', error);
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