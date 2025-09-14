
import { Router } from 'express';

const router = Router();

// دالة مساعدة لحساب أوقات فتح وإغلاق السوق
function getMarketTimes(marketType: string, timezone: string) {
  console.log(`🕐 حساب أوقات السوق - النوع: ${marketType}, المنطقة الزمنية: ${timezone}`);
  
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  console.log(`📅 الوقت الحالي: ${now.toISOString()}, اليوم: ${currentDay}, الساعة: ${currentHour}:${currentMinute}`);
  
  let nextOpenTime: Date | null = null;
  let nextCloseTime: Date | null = null;
  let isOpen = false;
  
  switch (marketType) {
    case 'forex':
      // سوق الفوركس مفتوح 24/5 (من الاثنين 00:00 إلى الجمعة 23:59)
      const isWeekday = currentDay >= 1 && currentDay <= 5;
      const isFridayEvening = currentDay === 5 && currentHour >= 22; // إغلاق يوم الجمعة في المساء
      const isSundayEvening = currentDay === 0 && currentHour >= 17; // فتح يوم الأحد في المساء
      
      isOpen = isWeekday && !isFridayEvening || isSundayEvening;
      
      console.log(`📊 فوركس - أيام الأسبوع: ${isWeekday}, جمعة مساء: ${isFridayEvening}, أحد مساء: ${isSundayEvening}, مفتوح: ${isOpen}`);
      
      if (isOpen) {
        // حساب وقت الإغلاق القادم (الجمعة 22:00)
        nextCloseTime = new Date(now);
        if (currentDay < 5) {
          // إذا لم نصل للجمعة بعد
          const daysUntilFriday = 5 - currentDay;
          nextCloseTime.setDate(now.getDate() + daysUntilFriday);
        }
        nextCloseTime.setHours(22, 0, 0, 0);
        
        // إذا كان وقت الإغلاق قد مضى هذا الأسبوع، انتقل للأسبوع القادم
        if (nextCloseTime.getTime() <= now.getTime()) {
          nextCloseTime.setDate(nextCloseTime.getDate() + 7);
        }
      } else {
        // حساب وقت الفتح القادم (الأحد 17:00 أو الاثنين 00:00)
        nextOpenTime = new Date(now);
        
        if (currentDay === 0 && currentHour < 17) {
          // الأحد قبل الساعة 17:00
          nextOpenTime.setHours(17, 0, 0, 0);
        } else if (currentDay === 6) {
          // السبت - انتظار حتى الأحد 17:00
          nextOpenTime.setDate(now.getDate() + 1);
          nextOpenTime.setHours(17, 0, 0, 0);
        } else if (currentDay === 5 && currentHour >= 22) {
          // الجمعة بعد الإغلاق - انتظار حتى الأحد
          const daysUntilSunday = 7 - currentDay;
          nextOpenTime.setDate(now.getDate() + daysUntilSunday);
          nextOpenTime.setHours(17, 0, 0, 0);
        } else {
          // حالة أخرى - الاثنين 00:00
          let daysUntilMonday = (8 - currentDay) % 7;
          if (daysUntilMonday === 0) daysUntilMonday = 7;
          nextOpenTime.setDate(now.getDate() + daysUntilMonday);
          nextOpenTime.setHours(0, 0, 0, 0);
        }
      }
      break;
      
    case 'stocks':
      // أسواق الأسهم (9:30 AM - 4:00 PM EST, Monday-Friday)
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const marketOpenMinutes = 9 * 60 + 30; // 9:30 AM
      const marketCloseMinutes = 16 * 60; // 4:00 PM
      
      const isWeekdayStocks = currentDay >= 1 && currentDay <= 5;
      const isWithinHours = currentTimeInMinutes >= marketOpenMinutes && currentTimeInMinutes < marketCloseMinutes;
      
      isOpen = isWeekdayStocks && isWithinHours;
      
      console.log(`📊 أسهم - أيام أسبوع: ${isWeekdayStocks}, ضمن ساعات العمل: ${isWithinHours}, مفتوح: ${isOpen}`);
      console.log(`⏰ وقت بالدقائق: ${currentTimeInMinutes}, فتح: ${marketOpenMinutes}, إغلاق: ${marketCloseMinutes}`);
      
      if (isOpen) {
        // السوق مفتوح، احسب وقت الإغلاق اليوم
        nextCloseTime = new Date(now);
        nextCloseTime.setHours(16, 0, 0, 0);
        console.log(`🔚 وقت الإغلاق المحسوب: ${nextCloseTime.toISOString()}`);
      } else {
        // السوق مغلق، احسب وقت الفتح التالي
        nextOpenTime = new Date(now);
        
        if (isWeekdayStocks && currentTimeInMinutes < marketOpenMinutes) {
          // نفس اليوم، لكن قبل وقت الفتح
          nextOpenTime.setHours(9, 30, 0, 0);
          console.log(`🌅 فتح اليوم في ${nextOpenTime.toISOString()}`);
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
          console.log(`📅 فتح يوم العمل التالي في ${nextOpenTime.toISOString()} (بعد ${daysToAdd} أيام)`);
        }
      }
      break;
      
    case 'crypto':
      // العملات المشفرة مفتوحة 24/7
      isOpen = true;
      nextCloseTime = null;
      nextOpenTime = null;
      console.log(`₿ عملات مشفرة - مفتوحة دائماً: ${isOpen}`);
      break;
      
    default:
      console.error(`❌ نوع سوق غير مدعوم: ${marketType}`);
      throw new Error(`نوع سوق غير مدعوم: ${marketType}`);
  }
  
  console.log(`✅ النتيجة النهائية - مفتوح: ${isOpen}`);
  if (nextOpenTime) console.log(`🔜 وقت الفتح التالي: ${nextOpenTime.toISOString()}`);
  if (nextCloseTime) console.log(`🔚 وقت الإغلاق التالي: ${nextCloseTime.toISOString()}`);
  
  return {
    isOpen,
    nextOpenTime: nextOpenTime ? formatDateForClient(nextOpenTime, timezone) : null,
    nextCloseTime: nextCloseTime ? formatDateForClient(nextCloseTime, timezone) : null,
  };
}

// دالة لتنسيق التاريخ للعميل
function formatDateForClient(date: Date, timezone: string) {
  try {
    console.log(`📅 تنسيق التاريخ: ${date.toISOString()} للمنطقة الزمنية: ${timezone}`);
    
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
    
    const result = `${formatted}||${isoString}`;
    console.log(`✅ التاريخ المنسق: ${result}`);
    
    return result;
  } catch (error) {
    console.error(`❌ خطأ في تنسيق التاريخ:`, error);
    // استخدام تنسيق احتياطي
    return `${date.toLocaleString()}||${date.toISOString()}`;
  }
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
