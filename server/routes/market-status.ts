
import { Router } from 'express';

const router = Router();

// دالة مساعدة لحساب أوقات فتح وإغلاق السوق
function getMarketTimes(marketType: string, timezone: string) {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  let nextOpenTime: Date | null = null;
  let nextCloseTime: Date | null = null;
  let isOpen = false;
  
  switch (marketType) {
    case 'forex':
      // سوق الفوركس مفتوح 24/5 (من الاثنين إلى الجمعة)
      isOpen = currentDay >= 1 && currentDay <= 5;
      
      if (isOpen) {
        // إذا كان السوق مفتوحًا، احسب وقت الإغلاق (الجمعة 5 مساءً EST)
        nextCloseTime = new Date(now);
        const daysUntilFriday = 5 - currentDay;
        nextCloseTime.setDate(now.getDate() + daysUntilFriday);
        nextCloseTime.setHours(17, 0, 0, 0); // 5 PM EST
      } else {
        // إذا كان السوق مغلقًا، احسب وقت الفتح (الاثنين 5 مساءً EST)
        nextOpenTime = new Date(now);
        let daysUntilMonday;
        if (currentDay === 0) { // Sunday
          daysUntilMonday = 1;
        } else if (currentDay === 6) { // Saturday
          daysUntilMonday = 2;
        } else {
          daysUntilMonday = 7 - currentDay + 1; // Next Monday
        }
        nextOpenTime.setDate(now.getDate() + daysUntilMonday);
        nextOpenTime.setHours(17, 0, 0, 0); // 5 PM EST on Sunday (Monday in some regions)
      }
      break;
      
    case 'stocks':
      // أسواق الأسهم (9:30 AM - 4:00 PM EST, Monday-Friday)
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const marketOpenMinutes = 9 * 60 + 30; // 9:30 AM
      const marketCloseMinutes = 16 * 60; // 4:00 PM
      
      isOpen = (currentDay >= 1 && currentDay <= 5) && 
               (currentTimeInMinutes >= marketOpenMinutes && currentTimeInMinutes < marketCloseMinutes);
      
      if (isOpen) {
        // السوق مفتوح، احسب وقت الإغلاق اليوم
        nextCloseTime = new Date(now);
        nextCloseTime.setHours(16, 0, 0, 0);
      } else {
        // السوق مغلق، احسب وقت الفتح التالي
        nextOpenTime = new Date(now);
        
        if (currentDay >= 1 && currentDay <= 5 && currentTimeInMinutes < marketOpenMinutes) {
          // نفس اليوم، لكن قبل وقت الفتح
          nextOpenTime.setHours(9, 30, 0, 0);
        } else {
          // البحث عن يوم الفتح التالي
          let daysToAdd = 1;
          let nextDay = (currentDay + 1) % 7;
          
          while (nextDay === 0 || nextDay === 6) { // تخطي السبت والأحد
            daysToAdd++;
            nextDay = (nextDay + 1) % 7;
          }
          
          nextOpenTime.setDate(now.getDate() + daysToAdd);
          nextOpenTime.setHours(9, 30, 0, 0);
        }
      }
      break;
      
    case 'crypto':
      // العملات المشفرة مفتوحة 24/7
      isOpen = true;
      nextCloseTime = null;
      nextOpenTime = null;
      break;
      
    default:
      throw new Error('نوع سوق غير مدعوم');
  }
  
  return {
    isOpen,
    nextOpenTime: nextOpenTime ? formatDateForClient(nextOpenTime, timezone) : null,
    nextCloseTime: nextCloseTime ? formatDateForClient(nextCloseTime, timezone) : null,
  };
}

// دالة لتنسيق التاريخ للعميل
function formatDateForClient(date: Date, timezone: string) {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  const formatted = new Intl.DateTimeFormat('ar-SA', options).format(date);
  const isoString = date.toISOString();
  
  return `${formatted}||${isoString}`;
}

// Route للحصول على حالة السوق
router.get('/market-status', (req, res) => {
  try {
    const { market = 'forex', timezone = 'Asia/Riyadh' } = req.query;
    
    if (typeof market !== 'string' || typeof timezone !== 'string') {
      return res.status(400).json({
        error: 'معاملات غير صحيحة'
      });
    }
    
    const marketData = getMarketTimes(market, timezone);
    
    res.json({
      ...marketData,
      marketType: market,
      timezone: timezone,
      currentTime: new Date().toISOString(),
      message: marketData.isOpen ? 'السوق مفتوح حاليًا' : 'السوق مغلق حاليًا'
    });
    
  } catch (error) {
    console.error('Error in market-status route:', error);
    res.status(500).json({
      error: 'خطأ في خادم حالة السوق',
      details: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});

export default router;
