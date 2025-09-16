
import { useEffect, useRef } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

export function useSessionMonitor() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const lastActiveTime = useRef(Date.now());
  const warningShown = useRef(false);

  useEffect(() => {
    if (!user || isLoading) return;

    // مراقبة نشاط المستخدم
    const updateActivity = () => {
      lastActiveTime.current = Date.now();
      warningShown.current = false;
    };

    // إضافة مستمعين للأحداث
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // فحص دوري للجلسة - أقل تكراراً
    const sessionCheck = setInterval(() => {
      const timeSinceActive = Date.now() - lastActiveTime.current;
      const thirtyMinutes = 30 * 60 * 1000;

      // تحذير قبل انتهاء الجلسة بـ 10 دقائق
      if (timeSinceActive > thirtyMinutes && !warningShown.current) {
        warningShown.current = true;
        toast({
          title: "⚠️ تحذير الجلسة",
          description: "ستنتهي جلستك قريباً بسبب عدم النشاط. تفاعل مع الصفحة للاستمرار.",
          variant: "destructive",
          duration: 10000
        });
      }

      // فحص صحة الجلسة كل 20 دقيقة فقط
      if (timeSinceActive % (20 * 60 * 1000) < 60000) {
        fetch('/api/user', { 
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache'
          }
        }).catch(error => {
          // تجاهل الأخطاء الصامتة
          if (process.env.NODE_ENV === 'development') {
            console.warn('Session validation failed:', error);
          }
        });
      }
    }, 60000); // فحص كل دقيقة بدلاً من 30 ثانية

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
      clearInterval(sessionCheck);
    };
  }, [user, isLoading, toast]);

  return null;
}
