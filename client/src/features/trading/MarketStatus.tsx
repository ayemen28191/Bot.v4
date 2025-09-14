import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  AlertCircle, 
  ArrowRightLeft, 
  BarChart2, 
  LineChart, 
  Calendar, 
  Bell, 
  Timer, 
  Globe, 
  ArrowUp, 
  ArrowDown, 
  Zap, 
  MapPin, 
  RefreshCw,
  BarChart 
} from 'lucide-react';
import { useTimezone } from '@/hooks/use-timezone';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { t } from '@/lib/i18n';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// تعريف أنواع المدخلات للمكون
interface MarketStatusProps {
  isOpen: boolean;
  marketType: 'forex' | 'crypto' | 'stocks';
  nextOpenTime?: string;
  nextCloseTime?: string;
}

// نص وأيقونة كل نوع سوق مع معلومات إضافية
const marketTypeInfo = {
  forex: { 
    Icon: ArrowRightLeft,
    tradingHours: '24/5',
    weekendClosed: true,
    color: 'text-primary',
    primaryColor: 'primary',
    volatility: 'medium',
    bestHours: ['8:00-12:00', '14:00-17:00'], // London & NY overlap
    description: 'forex_market_hours_info_improved'
  },
  crypto: { 
    Icon: BarChart2,
    tradingHours: '24/7',
    weekendClosed: false,
    color: 'text-warning',
    primaryColor: 'warning',
    volatility: 'high',
    bestHours: ['Always'],
    description: 'crypto_market_hours_info_improved'
  },
  stocks: { 
    Icon: LineChart,
    tradingHours: '8/5',
    weekendClosed: true,
    color: 'text-success',
    primaryColor: 'success',
    volatility: 'low',
    bestHours: ['9:30-10:30', '15:00-16:00'], // Opening & closing hours
    description: 'stocks_market_hours_info_improved'
  }
};

// مساعد لتحديد ما إذا كان السوق سيفتح/يغلق قريبًا
function getMarketProximity(
  isOpen: boolean, 
  secondsLeft: number | null
): { status: 'very-soon' | 'soon' | 'later', label: string } {
  if (secondsLeft === null) {
    return {
      status: 'later',
      label: isOpen ? t('market_is_open') : t('market_is_closed')
    };
  }

  // تحديد المستويات المختلفة من القرب
  const oneHour = 60 * 60;
  const fiveMinutes = 5 * 60;

  if (secondsLeft <= fiveMinutes) {
    return {
      status: 'very-soon',
      label: isOpen ? t('closing_soon') : t('opening_very_soon')
    };
  } else if (secondsLeft <= oneHour) {
    return {
      status: 'soon',
      label: isOpen ? t('closing_soon') : t('opening_soon')
    };
  } else {
    return {
      status: 'later',
      label: isOpen ? t('market_is_open') : t('market_is_closed')
    };
  }
}

function MarketStatus(props: MarketStatusProps) {
  const { isOpen, marketType, nextOpenTime, nextCloseTime } = props;
  
  // استخدام hook المنطقة الزمنية
  const timezone = useTimezone();
  const formatDate = timezone.formatDate;
  
  // الوقت الحالي - مع استخدام وظيفة مبدئية لإنشاء القيمة الأولية
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [progress, setProgress] = useState<number>(0); // نسبة مئوية للتقدم (0-100)
  const [totalSeconds, setTotalSeconds] = useState<number | null>(null); // إجمالي الثواني للفترة
  const [expandedInfo, setExpandedInfo] = useState<boolean>(false);

  // تحديث الوقت كل ثانية للتحديث الحي للعد التنازلي
  useEffect(() => {
    console.log('🔄 تشغيل مؤقت MarketStatus', { isOpen, nextOpenTime, nextCloseTime });
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      // حساب الوقت المتبقي إذا كان السوق مغلقًا
      if (!isOpen && nextOpenTime) {
        try {
          let openTime: Date;
          
          console.log('📅 معالجة وقت الفتح:', nextOpenTime);
          
          // تحسين تحليل التاريخ
          if (nextOpenTime.includes('||')) {
            const [displayTime, isoTime] = nextOpenTime.split('||');
            console.log('🔗 تحليل تاريخ مركب:', { displayTime, isoTime });
            openTime = new Date(isoTime);
          } else {
            console.log('📊 تحليل تاريخ مباشر:', nextOpenTime);
            openTime = new Date(nextOpenTime);
          }
          
          // التحقق من صحة التاريخ
          if (isNaN(openTime.getTime())) {
            console.error('❌ تنسيق تاريخ غير صحيح في MarketStatus:', nextOpenTime);
            return;
          }
          
          const now = new Date();
          const diff = Math.floor((openTime.getTime() - now.getTime()) / 1000);
          
          console.log('⏱️ حساب الفرق (ثواني):', diff, 'بين', now.toISOString(), 'و', openTime.toISOString());
          
          // الاحتفاظ بإجمالي الثواني إذا لم يتم تعيينه من قبل
          // هذا مهم لحساب نسبة التقدم
          if (totalSeconds === null || diff >= totalSeconds) {
            // نفترض أن الوقت الإجمالي 24 ساعة كحد أقصى إذا كان أكبر من ذلك
            const max = 24 * 60 * 60;
            const calculatedTotal = diff > max ? max : diff;
            console.log('📊 تعيين إجمالي الثواني:', calculatedTotal);
            setTotalSeconds(calculatedTotal);
          } else if (diff > 0) {
            // حساب نسبة التقدم - تم استخدام 100 - للحصول على شريط يتقدم مع مرور الوقت
            const calculatedProgress = 100 - ((diff / (totalSeconds || 1)) * 100);
            const finalProgress = calculatedProgress > 100 ? 100 : calculatedProgress;
            console.log('📈 نسبة التقدم:', finalProgress.toFixed(2), '%');
            setProgress(finalProgress);
          }
          
          setSecondsLeft(diff > 0 ? diff : 0);
        } catch (error) {
          console.error('❌ خطأ في حساب فرق الوقت:', error);
        }
      }
      // حساب الوقت المتبقي للإغلاق إذا كان السوق مفتوحًا
      else if (isOpen && nextCloseTime) {
        try {
          let closeTime: Date;
          
          // تحسين تحليل التاريخ
          if (nextCloseTime.includes('||')) {
            const [displayTime, isoTime] = nextCloseTime.split('||');
            closeTime = new Date(isoTime);
          } else {
            closeTime = new Date(nextCloseTime);
          }
          
          // التحقق من صحة التاريخ
          if (isNaN(closeTime.getTime())) {
            console.error('Invalid date format for close time:', nextCloseTime);
            return;
          }
          
          const now = new Date();
          const diff = Math.floor((closeTime.getTime() - now.getTime()) / 1000);
          
          // نفس المنطق أعلاه ولكن لوقت الإغلاق
          if (totalSeconds === null || diff >= totalSeconds) {
            const max = 24 * 60 * 60;
            setTotalSeconds(diff > max ? max : diff);
          } else if (diff > 0) {
            const calculatedProgress = 100 - ((diff / (totalSeconds || 1)) * 100);
            setProgress(calculatedProgress > 100 ? 100 : calculatedProgress);
          }
          
          setSecondsLeft(diff > 0 ? diff : 0);
        } catch (error) {
          console.error('Error calculating closing time difference:', error);
        }
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isOpen, nextOpenTime, nextCloseTime, totalSeconds]);
  
  // تحديد الأيقونة والنص والمعلومات لنوع السوق
  const { 
    Icon: MarketIcon, 
    tradingHours, 
    weekendClosed, 
    color,
    primaryColor,
    bestHours,
    description
  } = marketTypeInfo[marketType];
  
  const marketTypeText = t(marketType); // استخدام الترجمة من ملف i18n
  
  // تحديد قرب الفتح/الإغلاق
  const { status, label } = getMarketProximity(isOpen, secondsLeft);
  
  // تحديد لون وحالة السوق (مفتوح/مغلق) بناءً على القرب من الفتح/الإغلاق
  const getStatusColors = () => {
    if (isOpen) {
      // ألوان حالة السوق المفتوح
      switch (status) {
        case 'very-soon': // على وشك الإغلاق
          return 'bg-warning/25 text-foreground border-warning/60';
        case 'soon': // سيغلق قريبًا
          return 'bg-warning/20 text-foreground border-warning/60';
        default: // مفتوح عادي
          return 'bg-success/20 text-foreground border-success/60';
      }
    } else {
      // ألوان حالة السوق المغلق
      switch (status) {
        case 'very-soon': // على وشك الفتح
          return 'bg-success/25 text-foreground border-success/60';
        case 'soon': // سيفتح قريبًا
          return 'bg-warning/20 text-foreground border-warning/60';
        default: // مغلق لفترة طويلة
          return 'bg-destructive/20 text-destructive-foreground border-destructive/60';
      }
    }
  };
  
  const statusClass = getStatusColors();
  const statusText = isOpen ? t('market_open') : t('market_closed');
  
  // دالة للحصول على أيقونة الحالة المناسبة
  const getStatusIcon = () => {
    if (isOpen) {
      // أيقونات حالة السوق المفتوح
      switch (status) {
        case 'very-soon': // على وشك الإغلاق
          return <Timer className="h-4 w-4 mr-1" />;
        case 'soon': // سيغلق قريبًا
          return <AlertCircle className="h-4 w-4 mr-1" />;
        default: // مفتوح عادي
          return <ArrowUp className="h-4 w-4 mr-1" />;
      }
    } else {
      // أيقونات حالة السوق المغلق
      switch (status) {
        case 'very-soon': // على وشك الفتح
          return <Zap className="h-4 w-4 mr-1" />;
        case 'soon': // سيفتح قريبًا
          return <RefreshCw className="h-4 w-4 mr-1" />;
        default: // مغلق لفترة طويلة
          return <ArrowDown className="h-4 w-4 mr-1" />;
      }
    }
  };
  
  // تحويل الثواني إلى تنسيق زمني مقروء
  const formatTimeLeft = (seconds: number): string => {
    if (seconds <= 0) return isOpen ? t('closing_soon') : t('opening_soon');
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}${t('h')} ${minutes}${t('m')}`;
    } else if (minutes > 0) {
      return `${minutes}${t('m')} ${secs}${t('s')}`;
    } else {
      return `${secs}${t('s')}`;
    }
  };

  // دالة مساعدة لتحديد لون شريط التقدم حسب حالة السوق
  const getProgressBarColor = () => {
    if (isOpen) {
      if (status === 'very-soon') return 'from-warning/60 to-warning/40';
      if (status === 'soon') return 'from-warning/60 to-warning/40';
      return 'from-success/60 to-success/40';
    } else {
      if (status === 'very-soon') return 'from-success/60 to-success/40';
      if (status === 'soon') return 'from-warning/60 to-warning/40';
      return 'from-destructive/60 to-destructive/40';
    }
  };
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card className="market-status-card border-border bg-card/30 backdrop-blur-sm shadow-lg">
        <CardContent className="p-3">
          <div className="flex flex-col space-y-3">
            {/* القسم العلوي: معلومات الحالة الرئيسية */}
            <div className="flex flex-wrap justify-center items-center text-[10px] md:text-xs gap-2">
              {/* حالة السوق مع أيقونة ديناميكية */}
              <motion.div 
                className={`px-3 py-1.5 rounded-xl border ${statusClass} inline-flex items-center shadow-md transition-all duration-300`}
                animate={{ 
                  scale: status === 'very-soon' ? [1, 1.03, 1] : 1 
                }}
                transition={{ 
                  repeat: status === 'very-soon' ? Infinity : 0, 
                  duration: 1.5 
                }}
              >
                <div className="flex items-center gap-1.5">
                  {getStatusIcon()}
                  <span className="font-medium">
                    {statusText}
                  </span>
                  <Badge variant="outline" className="ml-1 py-0.5 px-1.5 text-[9px] whitespace-nowrap">
                    {label}
                  </Badge>
                </div>
              </motion.div>
              
              {/* نوع السوق مع الأيقونة */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`market-type text-foreground px-2.5 py-1.5 bg-card/80 rounded-xl border border-border inline-flex items-center gap-1.5`}>
                      <MarketIcon className={`h-3.5 w-3.5 ${color}`} />
                      <span>{`${marketTypeText}`}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <div className="space-y-1.5 text-xs p-1 max-w-xs">
                      <p className="font-semibold">{t('trading_hours')}: {tradingHours}</p>
                      {weekendClosed && (
                        <p className="text-warning text-[10px] flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {t('weekend_closed')}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">{t(description)}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* وقت الفتح/الإغلاق مع علامة الوقت */}
              {!isOpen && nextOpenTime && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="next-open text-foreground flex items-center gap-1.5 px-2.5 py-1.5 bg-card/80 rounded-xl border border-border">
                        <Calendar className="h-3.5 w-3.5 text-warning" />
                        <span>{t('next_open')}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <div className="space-y-1 p-1">
                        <p className="text-success">{nextOpenTime}</p>
                        {secondsLeft && (
                          <p className="text-[10px] text-muted-foreground">
                            ({formatTimeLeft(secondsLeft)} {t('remaining')})
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {isOpen && nextCloseTime && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="next-close text-foreground flex items-center gap-1.5 px-2.5 py-1.5 bg-card/80 rounded-xl border border-border">
                        <Timer className="h-3.5 w-3.5 text-destructive" />
                        <span>{t('next_close')}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <div className="space-y-1 p-1">
                        <p className="text-destructive">{nextCloseTime}</p>
                        {secondsLeft && (
                          <p className="text-[10px] text-muted-foreground">
                            ({formatTimeLeft(secondsLeft)} {t('remaining')})
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {/* المنطقة الزمنية والوقت الحالي */}
              <div className="flex space-x-1.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="current-time text-foreground flex items-center gap-1.5 px-2.5 py-1.5 bg-card/80 rounded-xl border border-border">
                        <Clock className="h-3.5 w-3.5 opacity-70" />
                        {formatDate(currentTime)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">{t('current_time_in_your_timezone')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="timezone text-muted-foreground flex items-center gap-1.5 px-2.5 py-1.5 bg-card/80 rounded-xl border border-border text-[10px]">
                        <Globe className="h-3.5 w-3.5 opacity-60" />
                        <span>{timezone.getActualTimezone()}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <div className="space-y-1 p-1 max-w-xs">
                        <p className="text-xs">{t('timezone_info')}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t('timezone_description')}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {/* زر توسيع/تقليص المعلومات الإضافية */}
              <motion.button
                onClick={() => setExpandedInfo(!expandedInfo)}
                className={`
                  text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 
                  bg-muted/80 rounded-full border border-border/50 
                  hover:bg-muted/60 transition duration-200
                `}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-[10px]">
                  {expandedInfo ? t('hide') : t('show')}
                </span>
                <BarChart className="h-3 w-3 opacity-70" />
              </motion.button>
            </div>
            
            {/* شريط التقدم مع الوقت المتبقي */}
            {secondsLeft !== null && totalSeconds !== null && (
              <div className="w-full space-y-1">
                <div className="flex justify-between items-center text-[9px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 opacity-60" />
                    <span>{t('time_remaining')}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`py-0.5 px-1.5 ${status === 'very-soon' ? 'animate-pulse' : ''}`}
                  >
                    {formatTimeLeft(secondsLeft)}
                  </Badge>
                </div>
                <Progress 
                  value={progress} 
                  className="h-1.5 bg-muted/60" 
                  indicatorClassName={`bg-gradient-to-r ${getProgressBarColor()}`} 
                />
              </div>
            )}
            
            {/* معلومات إضافية (قابلة للتوسيع/التقليص) */}
            <AnimatePresence>
              {expandedInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                    {/* معلومات عن ساعات التداول المفضلة */}
                    <div className="w-full flex items-start gap-1.5 text-muted-foreground bg-muted/30 rounded-lg p-2 text-[10px]">
                      <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium">{t('best_trading_hours')}:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {bestHours.map((hour, index) => (
                            <Badge key={index} variant="outline" className="text-[9px] bg-primary/20">
                              {hour}
                            </Badge>
                          ))}
                        </div>
                        <p className="opacity-70 text-[9px]">{t(description)}</p>
                      </div>
                    </div>
                    
                    {/* مؤشر نشاط السوق حسب الوقت (لعرض بصري فقط) */}
                    <div className="w-full flex flex-col bg-muted/30 rounded-lg p-2 text-[10px]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-muted-foreground font-medium">{t('market_activity')}</span>
                        <Badge variant="outline" className="text-[9px]">
                          {isOpen ? t('active_now') : t('inactive_now')}
                        </Badge>
                      </div>
                      <div className="flex items-center h-4 bg-muted/60 rounded-full overflow-hidden">
                        {/* This is a dummy activity indicator that shows the typical market activity throughout the day */}
                        <div className="flex h-full w-full">
                          {Array.from({ length: 24 }).map((_, hour) => {
                            // تحديد نشاط السوق لكل ساعة حسب نوع السوق
                            // هذا مثال بسيط - يمكن تطويره ليعكس النشاط الفعلي
                            let activityLevel = 0;
                            
                            if (marketType === 'forex') {
                              // أوقات نشاط الفوركس (جلسات التداول)
                              if (hour >= 8 && hour <= 11) activityLevel = 0.7; // جلسة لندن
                              else if (hour >= 12 && hour <= 16) activityLevel = 0.9; // تداخل لندن/نيويورك
                              else if (hour >= 17 && hour <= 20) activityLevel = 0.6; // جلسة نيويورك
                              else if (hour >= 0 && hour <= 4) activityLevel = 0.4; // جلسة طوكيو
                              else activityLevel = 0.2;
                            } else if (marketType === 'crypto') {
                              // العملات المشفرة نشطة دائمًا مع تغير طفيف
                              activityLevel = 0.3 + (Math.sin(hour / 3.82) + 1) * 0.3;
                            } else if (marketType === 'stocks') {
                              // أسواق الأسهم (مثال لسوق أمريكي)
                              if (hour >= 9 && hour <= 10) activityLevel = 0.9; // وقت الافتتاح
                              else if (hour >= 11 && hour <= 14) activityLevel = 0.5; // منتصف اليوم
                              else if (hour >= 15 && hour <= 16) activityLevel = 0.8; // قرب الإغلاق
                              else activityLevel = 0;
                            }
                            
                            // لون النشاط وارتفاعه
                            const height = `${Math.round(activityLevel * 100)}%`;
                            
                            // استخدام ألوان الثيم بدلاً من الألوان الديناميكية
                            let color = '';
                            if (marketType === 'forex') {
                              if (activityLevel > 0.7) color = 'bg-primary/60';
                              else if (activityLevel > 0.4) color = 'bg-primary/40';
                              else color = 'bg-primary/20';
                            } else if (marketType === 'crypto') {
                              if (activityLevel > 0.7) color = 'bg-warning/60';
                              else if (activityLevel > 0.4) color = 'bg-warning/40';
                              else color = 'bg-warning/20';
                            } else if (marketType === 'stocks') {
                              if (activityLevel > 0.7) color = 'bg-success/60';
                              else if (activityLevel > 0.4) color = 'bg-success/40';
                              else color = 'bg-success/20';
                            }
                            
                            // تمييز الساعة الحالية
                            const currentHour = currentTime.getHours();
                            const isCurrentHour = hour === currentHour;
                            
                            return (
                              <div key={hour} className="relative h-full flex-1">
                                <div 
                                  className={cn(
                                    "absolute bottom-0 w-full transition-all duration-500",
                                    color,
                                    isCurrentHour ? 'animate-pulse ring-1 ring-white/20' : ''
                                  )}
                                  style={{ height }}
                                />
                                {isCurrentHour && (
                                  <div className="absolute bottom-0 w-full h-full border-l-2 border-r-2 border-white/20" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex justify-between mt-0.5 text-[8px] text-muted-foreground">
                        <span>00:00</span>
                        <span>06:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                        <span>24:00</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
        
        {/* تنبيه إذا كان السوق مغلقًا وعلى وشك الفتح */}
        {!isOpen && status === 'very-soon' && (
          <CardFooter className="pt-0 p-2 justify-center">
            <motion.div 
              className="text-center flex items-center justify-center bg-success/20 py-1.5 px-3 rounded-lg"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Zap className="h-3.5 w-3.5 text-success mr-1.5" />
              <span className="text-success/90 text-[10px]">{t('market_opening_soon_notification')}</span>
            </motion.div>
          </CardFooter>
        )}
        
        {/* تنبيه إذا كان السوق سيغلق قريبًا */}
        {isOpen && status === 'very-soon' && (
          <CardFooter className="pt-0 p-2 justify-center">
            <motion.div 
              className="text-center flex items-center justify-center bg-warning/20 py-1.5 px-3 rounded-lg"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Timer className="h-3.5 w-3.5 text-foreground mr-1.5" />
              <span className="text-foreground/90 text-[10px]">{t('market_closing_soon_notification')}</span>
            </motion.div>
          </CardFooter>
        )}
        
        {/* تنبيه عام إذا كان السوق مغلقًا ولن يفتح قريبًا */}
        {!isOpen && status === 'later' && (
          <CardFooter className="pt-0 p-2 justify-center">
            <div className="text-center flex items-center justify-center bg-warning/20 py-1.5 px-3 rounded-lg transition-all duration-300">
              <Bell className="h-3.5 w-3.5 text-warning mr-1.5" />
              <span className="text-warning/90 text-[10px]">{t('market_closed_notification')}</span>
            </div>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}

export default MarketStatus;