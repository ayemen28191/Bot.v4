
import { Router } from 'express';

const router = Router();

// Route لاختبار العداد مع أوقات مختلفة
router.get('/test-countdown', (req, res) => {
  try {
    const { testType = 'short' } = req.query;
    
    const now = new Date();
    let nextOpenTime: Date;
    
    switch (testType) {
      case 'short':
        // 30 ثانية من الآن
        nextOpenTime = new Date(now.getTime() + 30 * 1000);
        break;
      case 'medium':
        // 5 دقائق من الآن
        nextOpenTime = new Date(now.getTime() + 5 * 60 * 1000);
        break;
      case 'long':
        // ساعة واحدة من الآن
        nextOpenTime = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      default:
        nextOpenTime = new Date(now.getTime() + 30 * 1000);
    }
    
    const displayTime = nextOpenTime.toLocaleString('ar-SA', { 
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false 
    });
    
    const isoString = nextOpenTime.toISOString();
    const timestamp = nextOpenTime.getTime();
    
    console.log('🧪 اختبار العداد:');
    console.log('  - النوع:', testType);
    console.log('  - الوقت الحالي:', now.toISOString(), 'timestamp:', now.getTime());
    console.log('  - وقت الفتح:', nextOpenTime.toISOString(), 'timestamp:', timestamp);
    console.log('  - الفرق:', (timestamp - now.getTime()), 'مللي ثانية');
    console.log('  - الفرق بالثواني:', Math.floor((timestamp - now.getTime()) / 1000));
    
    res.json({
      isOpen: false,
      marketType: 'forex',
      timezone: 'Asia/Riyadh',
      currentTime: now.toISOString(),
      nextOpenTime: `${displayTime}||${isoString}||${timestamp}`,
      message: `اختبار العداد - ${testType}`,
      testInfo: {
        type: testType,
        secondsUntilOpen: Math.floor((timestamp - now.getTime()) / 1000),
        currentTimestamp: now.getTime(),
        targetTimestamp: timestamp
      }
    });
    
  } catch (error) {
    console.error('Error in test-countdown route:', error);
    res.status(500).json({
      error: 'خطأ في اختبار العداد',
      details: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});

export default router;
