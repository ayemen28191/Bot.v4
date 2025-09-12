import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, AlertTriangle, X, Info, Calendar, Bell, Zap, TimerReset, MapPin } from 'lucide-react';
import { t } from '@/lib/i18n';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface MarketClosedAlertProps {
  nextOpenTime: string;
  marketType: 'forex' | 'crypto' | 'stocks';
  nextCloseTime?: string;
}

export default function MarketClosedAlert({ nextOpenTime, nextCloseTime, marketType }: MarketClosedAlertProps) {
  // الحصول على ترجمة نوع السوق
  const marketTypeText = t(marketType);
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [initialDiff, setInitialDiff] = useState(0);
  const [currentDiff, setCurrentDiff] = useState(0);
  const [displayMode, setDisplayMode] = useState<'compact' | 'detailed'>('detailed');
  const [showNotificationBadge, setShowNotificationBadge] = useState(true);
  const [timeComponents, setTimeComponents] = useState<{hours: number, minutes: number, seconds: number}>({
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  // تحسين العد التنازلي بفاصل زمني أكثر تفاعلية
  useEffect(() => {
    if (!nextOpenTime) return;
    
    try {
      // استخراج تنسيق ISO من النص المركب (formattedString||ISOString)
      const [displayTime, isoTime] = nextOpenTime.split('||');
      // استخدام تنسيق ISO لتحليل التاريخ بدقة
      const openTime = new Date(isoTime || nextOpenTime);
      const now = new Date();
      const initialTimeDiff = openTime.getTime() - now.getTime();
      
      if (initialTimeDiff <= 0 || isNaN(initialTimeDiff)) {
        // إذا كان وقت الفتح في الماضي أو غير صالح، نعرض رسالة مختلفة وإعادة تحميل
        setTimeLeft(t('refreshing_market_data'));
        setProgress(100);
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
      
      setInitialDiff(initialTimeDiff);
      setCurrentDiff(initialTimeDiff);
      
      // استخدام مؤقت دقيق للتحديث كل ثانية
      const timer = setInterval(() => {
        const currentTime = new Date();
        const diff = openTime.getTime() - currentTime.getTime();
        
        if (diff <= 0) {
          clearInterval(timer);
          setTimeLeft(t('refreshing_market_data'));
          setProgress(100);
          
          // إضافة تأثير بصري قبل إعادة التحميل
          const alertElement = document.querySelector('.market-closed-alert');
          if (alertElement) {
            alertElement.classList.add('animate-pulse', 'bg-success/20', 'border-success/50');
            alertElement.classList.remove('bg-destructive/15', 'border-destructive/30');
          }
          
          // إظهار إشعار قبل إعادة التحميل
          const event = new CustomEvent('showToast', { 
            detail: { 
              title: t('market_opening_now'),
              description: t('refreshing_for_market_open'),
              variant: 'default' 
            } 
          });
          window.dispatchEvent(event);
          
          // تحديث الصفحة تلقائيًا عند فتح السوق (مع تأخير للتأثيرات)
          setTimeout(() => window.location.reload(), 2000);
          return;
        }
        
        setCurrentDiff(diff);
        
        // حساب نسبة التقدم بدقة
        const progressValue = Math.min(((initialTimeDiff - diff) / initialTimeDiff) * 100, 99.9);
        setProgress(progressValue);
        
        // تحويل الفرق الزمني إلى مكونات (ساعات، دقائق، ثواني)
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        // تحديث مكونات الوقت لاستخدامها في العرض التفصيلي
        setTimeComponents({ hours, minutes, seconds });
        
        // تنسيق النص حسب المدة المتبقية مع تحسين العرض
        if (hours > 0) {
          setTimeLeft(`${hours}${t('h')} ${minutes}${t('m')} ${seconds}${t('s')}`);
        } else if (minutes > 0) {
          setTimeLeft(`${minutes}${t('m')} ${seconds}${t('s')}`);
        } else {
          setTimeLeft(`${seconds}${t('s')}`);
        }
        
        // إخفاء شارة الإشعار بعد 5 ثوانٍ
        if (showNotificationBadge && Date.now() - now.getTime() > 5000) {
          setShowNotificationBadge(false);
        }
        
      }, 1000); // تحديث كل ثانية
      
      return () => clearInterval(timer);
    } catch (error) {
      console.error('Error updating countdown:', error, nextOpenTime);
      // معالجة أخطاء تحليل التاريخ
      setTimeLeft(t('time_calculation_error'));
    }
  }, [nextOpenTime]);

  // تبديل وضع العرض بين المفصل والمختصر
  const toggleDisplayMode = () => {
    setDisplayMode(prev => prev === 'detailed' ? 'compact' : 'detailed');
  };

  // معلومات إضافية عن أوقات التداول حسب نوع السوق مع تحسين المحتوى
  const getMarketInfo = (type: 'forex' | 'crypto' | 'stocks') => {
    switch (type) {
      case 'forex':
        return t('forex_market_hours_info_improved');
      case 'crypto':
        return t('crypto_market_hours_info_improved');
      case 'stocks':
        return t('stocks_market_hours_info_improved');
      default:
        return '';
    }
  };

  // الحصول على تصنيف معيّن للسوق
  const getMarketStatus = () => {
    // حساب عتبات مختلفة للإشعارات
    const oneHour = 60 * 60 * 1000;
    const fourHours = 4 * oneHour;
    
    if (currentDiff < oneHour) {
      return { label: t('opening_very_soon'), color: 'bg-success/20 text-success', icon: <Zap className="h-3 w-3" /> };
    } else if (currentDiff < fourHours) {
      return { label: t('opening_soon'), color: 'bg-warning/20 text-warning', icon: <Clock className="h-3 w-3" /> };
    } else {
      return { label: t('market_closed'), color: 'bg-destructive/20 text-destructive', icon: <AlertCircle className="h-3 w-3" /> };
    }
  };

  // إنشاء مكون العد التنازلي التفصيلي
  const DetailedCountdown = () => {
    const { hours, minutes, seconds } = timeComponents;
    
    return (
      <div className="grid grid-cols-3 gap-1 my-2">
        <div className="flex flex-col items-center">
          <div className="bg-destructive/40 w-full py-2 rounded text-center">
            <span className="text-xl font-bold text-destructive">{hours.toString().padStart(2, '0')}</span>
          </div>
          <span className="text-[9px] text-muted-foreground mt-1">{t('hours')}</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="bg-destructive/40 w-full py-2 rounded text-center">
            <span className="text-xl font-bold text-destructive">{minutes.toString().padStart(2, '0')}</span>
          </div>
          <span className="text-[9px] text-muted-foreground mt-1">{t('minutes')}</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="bg-destructive/40 w-full py-2 rounded text-center">
            <span className="text-xl font-bold text-destructive">{seconds.toString().padStart(2, '0')}</span>
          </div>
          <span className="text-[9px] text-muted-foreground mt-1">{t('seconds')}</span>
        </div>
      </div>
    );
  };

  if (!isVisible) return null;

  // تحسين العرض مع تأثيرات حركية
  const marketStatus = getMarketStatus();

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full max-w-sm mb-4 p-4 bg-destructive/10 backdrop-blur-sm rounded-xl border border-destructive/30 shadow-lg market-closed-alert"
    >
      <div className="flex items-start">
        <div className="ml-3 flex-shrink-0">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-8 h-8 bg-destructive/20 rounded-full flex items-center justify-center"
          >
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {showNotificationBadge && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"
              />
            )}
          </motion.div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-medium text-destructive">
                {`${t('market_closed')}: ${marketTypeText}`}
              </h3>
              <Badge variant="outline" className={`text-[9px] py-0 px-1.5 ${marketStatus.color}`}>
                <span className="flex items-center gap-1">
                  {marketStatus.icon}
                  {marketStatus.label}
                </span>
              </Badge>
            </div>
            <div className="flex gap-1">
              <button 
                onClick={toggleDisplayMode}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                title={displayMode === 'compact' ? t('show_details') : t('show_compact')}
              >
                <TimerReset className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => setIsVisible(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                title={t('close')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-1">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t('market_closed_message_improved').replace('{time}', 
                nextOpenTime && nextOpenTime.includes('||') 
                  ? nextOpenTime.split('||')[0] 
                  : nextOpenTime
              )}
            </p>
          </div>
          
          {/* بار تقدم العد التنازلي (مختلف حسب وضع العرض) */}
          <AnimatePresence mode="wait">
            {displayMode === 'detailed' ? (
              <motion.div
                key="detailed"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <DetailedCountdown />
              </motion.div>
            ) : (
              <motion.div 
                key="compact"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-2 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 ml-1" />
                    <span>{t('time_remaining')}</span>
                  </div>
                  <motion.span 
                    animate={{ 
                      backgroundColor: currentDiff < 60000 ? ['rgba(239,68,68,0.2)', 'rgba(239,68,68,0.4)'] : 'rgba(239,68,68,0.2)' 
                    }}
                    transition={{ duration: 1, repeat: currentDiff < 60000 ? Infinity : 0, repeatType: 'reverse' }}
                    className="font-medium text-destructive bg-destructive/10 py-0.5 px-1.5 rounded"
                  >
                    {timeLeft}
                  </motion.span>
                </div>
                
                <Progress 
                  value={progress} 
                  className="h-1.5 bg-destructive/20" 
                  indicatorClassName="bg-gradient-to-r from-destructive/60 to-destructive/40" 
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="mt-3 flex items-center text-[11px] bg-destructive/10 py-1 px-2 rounded-lg inline-flex text-destructive/90">
            <Calendar className="h-3.5 w-3.5 ml-1 animate-pulse" />
            <span>
              {t('market_opening')} {nextOpenTime && nextOpenTime.includes('||') 
                ? nextOpenTime.split('||')[0] 
                : nextOpenTime}
            </span>
          </div>
          
          {/* معلومات إضافية عن السوق */}
          <div className="mt-2 flex items-start gap-1 text-[10px] text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span className="opacity-75">{getMarketInfo(marketType)}</span>
          </div>
          
          {/* رابط لتلقي تنبيهات فتح السوق */}
          <div className="mt-2 text-center">
            <button 
              onClick={() => {
                localStorage.setItem('marketAlerts', 'enabled');
                setShowNotificationBadge(false);
                // إظهار رسالة تأكيد
                const event = new CustomEvent('showToast', { 
                  detail: { 
                    title: t('notifications_enabled'),
                    description: t('market_status_notifications_enabled'),
                    variant: 'default' 
                  } 
                });
                window.dispatchEvent(event);
              }} 
              className="text-[10px] flex items-center mx-auto gap-1 text-warning hover:text-warning/80 transition-colors py-1 px-2 rounded-full bg-warning/10 hover:bg-warning/20"
            >
              <Bell className="w-3 h-3" />
              <span>{t('enable_market_notifications')}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}