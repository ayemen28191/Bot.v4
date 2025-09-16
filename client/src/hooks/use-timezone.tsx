import { useEffect, useState, useCallback } from 'react';
import { safeGetLocalStorage } from '@/lib/storage-utils';

// استخدام نفس أسماء المناطق الزمنية المستخدمة في صفحة الإعدادات
export const DEFAULT_TIMEZONE = 'auto';

// Hook لإدارة المنطقة الزمنية
export function useTimezone() {
  // تحميل المنطقة الزمنية من التخزين المحلي
  const [timezone, setTimezone] = useState<string>(() => {
    const settings = safeGetLocalStorage('settings', {});
    return settings.timezone || DEFAULT_TIMEZONE;
  });

  // استخدام useCallback لتحسين الأداء وتجنب التحديثات غير الضرورية
  const loadTimezoneFromStorage = useCallback(() => {
    const settings = safeGetLocalStorage('settings', {});
    setTimezone(settings.timezone || DEFAULT_TIMEZONE);
  }, []);

  // مراقبة تغييرات التخزين المحلي في نافذة أخرى
  useEffect(() => {
    // الاشتراك في حدث تغيير التخزين
    window.addEventListener('storage', loadTimezoneFromStorage);

    // إلغاء الاشتراك عند تفكيك المكون
    return () => {
      window.removeEventListener('storage', loadTimezoneFromStorage);
    };
  }, [loadTimezoneFromStorage]);

  // الحصول على المنطقة الزمنية الفعلية (بعد معالجة 'auto')
  const getActualTimezone = (): string => {
    // نقوم بإعادة منطقة زمنية مبسطة للسيرفر
    if (timezone === 'auto') {
      return 'UTC';  // استخدام UTC كافتراضي لتبسيط العملية
    } else if (timezone === 'riyadh') {
      return 'Asia/Riyadh';
    } else if (timezone === 'dubai') {
      return 'Asia/Dubai';
    } else if (timezone === 'kuwait') {
      return 'Asia/Kuwait';
    } else if (timezone === 'doha') {
      return 'Asia/Qatar';
    } else if (timezone === 'jerusalem') {
      return 'Asia/Jerusalem';
    } else if (timezone === 'cairo') {
      return 'Africa/Cairo';
    } else if (timezone === 'london') {
      return 'Europe/London';
    } else if (timezone === 'paris') {
      return 'Europe/Paris';
    } else if (timezone === 'new_york') {
      return 'America/New_York';
    } else if (timezone === 'tokyo') {
      return 'Asia/Tokyo';
    } else if (timezone === 'hong_kong') {
      return 'Asia/Hong_Kong';
    } else if (timezone === 'sydney') {
      return 'Australia/Sydney';
    } else {
      return 'UTC';  // الافتراضي
    }
  };

  // تنسيق التاريخ وفقًا للمنطقة الزمنية المحددة
  const formatDate = (date: Date | string | number): string => {
    const actualTimezone = getActualTimezone();
    
    if (typeof date === 'string' || typeof date === 'number') {
      date = new Date(date);
    }
    
    // تنسيق التاريخ بتنسيق قياسي للغة العربية
    // نقوم بإضافة طابع زمني ISO في سمة الـ data-iso لسهولة تحليله في جانب العميل
    // وإضافة التاريخ المنسق للعرض البصري
    const isoString = date.toISOString();
    const formattedString = date.toLocaleString('ar-SA', {
      timeZone: actualTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    // إرجاع التنسيقين معا (ISO للمعالجة وAR للعرض)
    return `${formattedString}||${isoString}`;
  };

  // فحص ما إذا كان الوقت المحدد ضمن اليوم الحالي
  const isToday = (date: Date | string | number): boolean => {
    const actualTimezone = getActualTimezone();
    
    if (typeof date === 'string' || typeof date === 'number') {
      date = new Date(date);
    }
    
    const today = new Date();
    
    // تحويل التواريخ إلى نفس المنطقة الزمنية للمقارنة
    const dateOptions = { timeZone: actualTimezone };
    const dateToCheck = new Intl.DateTimeFormat('en-US', dateOptions).format(date);
    const currentDate = new Intl.DateTimeFormat('en-US', dateOptions).format(today);
    
    return dateToCheck === currentDate;
  };

  // تهيئة أوقات فتح وإغلاق الأسواق وفقًا للمنطقة الزمنية
  const getMarketTimes = (marketType: 'forex' | 'crypto' | 'stocks'): { 
    opens: Date; 
    closes: Date; 
    isOpen: boolean;
    nextOpenTime?: string;
    nextCloseTime?: string;
  } => {
    const now = new Date();
    const actualTimezone = getActualTimezone();
    
    // الحصول على اليوم الحالي (0 = الأحد، 6 = السبت)
    const dayOfWeek = now.getDay();
    
    let opens: Date;
    let closes: Date;
    let isOpen = false;
    let nextOpenTime: string | undefined;
    let nextCloseTime: string | undefined;
    
    // تعيين أوقات فتح وإغلاق مختلفة بناءً على نوع السوق
    switch (marketType) {
      case 'forex':
        // سوق الفوركس مفتوح من الاثنين 00:00 إلى الجمعة 23:59 (بتوقيت جرينتش)
        isOpen = (dayOfWeek >= 1 && dayOfWeek <= 5); // من الاثنين إلى الجمعة
        
        if (isOpen) {
          // السوق مفتوح حاليًا، سيغلق في الجمعة المقبلة
          const fridayClose = new Date(now);
          fridayClose.setDate(now.getDate() + (5 - dayOfWeek));
          fridayClose.setHours(23, 59, 0, 0);
          nextCloseTime = formatDate(fridayClose);
        } else {
          // السوق مغلق حاليًا، سيفتح في الاثنين المقبل
          const mondayOpen = new Date(now);
          mondayOpen.setDate(now.getDate() + (1 + (7 - dayOfWeek) % 7));
          mondayOpen.setHours(0, 0, 0, 0);
          nextOpenTime = formatDate(mondayOpen);
        }
        
        opens = new Date();
        opens.setHours(0, 0, 0, 0);
        closes = new Date();
        closes.setHours(23, 59, 59, 999);
        break;
        
      case 'crypto':
        // سوق العملات المشفرة مفتوح 24/7
        isOpen = true;
        opens = new Date();
        opens.setHours(0, 0, 0, 0);
        closes = new Date();
        closes.setHours(23, 59, 59, 999);
        break;
        
      case 'stocks':
        // الأسهم تفتح عادة من 9:30 صباحًا إلى 4:00 مساءً بالتوقيت المحلي للبورصة
        // هنا نفترض بورصة نيويورك كمثال
        const marketOpen = 9; // الساعة 9 صباحًا
        const marketClose = 16; // الساعة 4 مساءً
        
        const currentHour = now.getHours();
        
        isOpen = (dayOfWeek >= 1 && dayOfWeek <= 5) && // من الاثنين إلى الجمعة
                (currentHour >= marketOpen && currentHour < marketClose);
        
        opens = new Date(now);
        opens.setHours(marketOpen, 30, 0, 0);
        
        closes = new Date(now);
        closes.setHours(marketClose, 0, 0, 0);
        
        if (!isOpen) {
          if (dayOfWeek === 0 || dayOfWeek === 6 || currentHour >= marketClose) {
            // خارج أيام التداول أو بعد وقت الإغلاق
            const daysToAdd = dayOfWeek === 0 ? 1 : // الأحد -> الاثنين
                              dayOfWeek === 6 ? 2 : // السبت -> الاثنين
                              1; // نفس اليوم بعد الإغلاق -> اليوم التالي
            
            const nextOpenDate = new Date(now);
            nextOpenDate.setDate(now.getDate() + daysToAdd);
            nextOpenDate.setHours(marketOpen, 30, 0, 0);
            nextOpenTime = formatDate(nextOpenDate);
          } else if (currentHour < marketOpen) {
            // قبل افتتاح السوق في نفس اليوم
            const nextOpenDate = new Date(now);
            nextOpenDate.setHours(marketOpen, 30, 0, 0);
            nextOpenTime = formatDate(nextOpenDate);
          }
        } else {
          // السوق مفتوح حاليًا، حساب وقت الإغلاق
          nextCloseTime = formatDate(closes);
        }
        break;
    }
    
    return { opens, closes, isOpen, nextOpenTime, nextCloseTime };
  };

  return {
    timezone,
    getActualTimezone,
    formatDate,
    isToday,
    getMarketTimes
  };
}