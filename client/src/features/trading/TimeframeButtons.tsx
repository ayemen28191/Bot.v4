import React, { useState, useEffect } from 'react';
import { Clock, Lock, Hourglass, TrendingUp, TrendingDown, ArrowUp, ArrowDown, AlertCircle, Activity } from 'lucide-react';
import { t } from '@/lib/i18n';

export type TimeFrame = '1M' | '5M' | '15M' | '1H' | '4H' | '1D';

interface TimeframeButtonsProps {
  selectedTimeframe: TimeFrame;
  onChange: (timeframe: TimeFrame) => void;
  // قائمة الأطر الزمنية المتاحة اختيارياً
  availableTimeframes?: TimeFrame[];
  // معلومات تحليلية إضافية للإطار الزمني (اختياري)
  timeframeAnalysis?: Partial<Record<TimeFrame, { trend: 'bullish' | 'bearish' | 'neutral', strength: number }>>;
  // نوع الإشارة الحالي لإظهار علاقته بالإطار الزمني (اختياري)
  currentSignal?: 'UP' | 'DOWN' | 'WAIT';
}

export default function TimeframeButtons({ 
  selectedTimeframe, 
  onChange, 
  availableTimeframes,
  timeframeAnalysis,
  currentSignal
}: TimeframeButtonsProps) {
  const [isMobile, setIsMobile] = useState(false);
  
  // قائمة بالأطر الزمنية المتاحة مع ترجمات من ملف i18n ووصف دلالي
  const timeframes: { value: TimeFrame; label: string; shortLabel: string; description: string }[] = [
    { value: '1M', label: t('timeframe_1m'), shortLabel: t('timeframe_1m_short'), description: t('timeframe_1m_desc') || 'إطار زمني قصير للغاية' },
    { value: '5M', label: t('timeframe_5m'), shortLabel: t('timeframe_5m_short'), description: t('timeframe_5m_desc') || 'إطار زمني قصير' },
    { value: '15M', label: t('timeframe_15m'), shortLabel: t('timeframe_15m_short'), description: t('timeframe_15m_desc') || 'إطار زمني متوسط القصر' },
    { value: '1H', label: t('timeframe_1h'), shortLabel: t('timeframe_1h_short'), description: t('timeframe_1h_desc') || 'إطار زمني متوسط' },
    { value: '4H', label: t('timeframe_4h'), shortLabel: t('timeframe_4h_short'), description: t('timeframe_4h_desc') || 'إطار زمني متوسط طويل' },
    { value: '1D', label: t('timeframe_1d'), shortLabel: t('timeframe_1d_short'), description: t('timeframe_1d_desc') || 'إطار زمني طويل' }
  ];

  // تحقق من حجم الشاشة واختر العرض المناسب
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 480);
    };
    
    // تحقق عند التحميل
    checkScreenSize();
    
    // تحقق عند تغيير حجم الشاشة
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // التحقق فيما إذا كان الإطار الزمني متاحاً
  const isTimeframeAvailable = (timeframe: TimeFrame) => {
    if (!availableTimeframes) return true; // إذا لم يتم توفير قائمة، فجميع الأطر متاحة
    return availableTimeframes.includes(timeframe);
  };

  // تعيين الإطار الزمني إذا كان متاحاً فقط
  const handleTimeframeSelect = (timeframe: TimeFrame) => {
    if (isTimeframeAvailable(timeframe)) {
      onChange(timeframe);
    }
  };
  
  // الحصول على مؤشر الاتجاه للإطار الزمني مع تأثير بصري محسن
  const getTrendIndicator = (timeframe: TimeFrame) => {
    if (!timeframeAnalysis || !timeframeAnalysis[timeframe] || !currentSignal || currentSignal === 'WAIT') return null;
    
    const analysis = timeframeAnalysis[timeframe];
    
    // تمييز خاص للإطار الزمني المحدد حالياً
    const isSelected = selectedTimeframe === timeframe;
    
    if (analysis.trend === 'bullish') {
      return (
        <div 
          className={`absolute ${isSelected ? 'top-0 right-0 h-full w-full' : '-top-1 -right-1 h-3 w-3 rounded-full'} 
          ${isSelected ? 'border-4 border-success/20 rounded-lg animate-pulse' : 'bg-success/20'} 
          flex items-center justify-center`}
          title={t('bullish_trend')}
        >
          {isSelected && currentSignal === 'UP' ? (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-success to-transparent" />
          ) : (
            <ArrowUp className="h-2 w-2 text-success" />
          )}
        </div>
      );
    } else if (analysis.trend === 'bearish') {
      return (
        <div 
          className={`absolute ${isSelected ? 'top-0 right-0 h-full w-full' : '-top-1 -right-1 h-3 w-3 rounded-full'} 
          ${isSelected ? 'border-4 border-destructive/20 rounded-lg animate-pulse' : 'bg-destructive/20'} 
          flex items-center justify-center`}
          title={t('bearish_trend')}
        >
          {isSelected && currentSignal === 'DOWN' ? (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-destructive to-transparent" />
          ) : (
            <ArrowDown className="h-2 w-2 text-destructive" />
          )}
        </div>
      );
    }
    
    return null;
  };
  
  // الحصول على أيقونة الإطار الزمني مع الأخذ بعين الاعتبار الإشارة الحالية
  const getTimeframeIcon = (timeframe: TimeFrame) => {
    // إظهار أيقونات خاصة للأطر الزمنية المختلفة بناءً على نوع الإشارة
    if (currentSignal === 'UP' && selectedTimeframe === timeframe) {
      return <Activity className="h-3.5 w-3.5 mr-1 text-success" />;
    }
    
    if (currentSignal === 'DOWN' && selectedTimeframe === timeframe) {
      return <Activity className="h-3.5 w-3.5 mr-1 text-destructive" />;
    }
    
    if (currentSignal === 'WAIT' && selectedTimeframe === timeframe) {
      return <AlertCircle className="h-3.5 w-3.5 mr-1 text-warning" />;
    }
    
    // الأيقونة العادية للأطر الزمنية المختلفة
    if (['1M', '5M'].includes(timeframe)) {
      return <Hourglass className="h-3 w-3 mr-1 opacity-70" />;
    }
    
    if (['15M', '1H'].includes(timeframe)) {
      return <Clock className="h-3 w-3 mr-1 opacity-70" />;
    }
    
    return <TrendingUp className="h-3 w-3 mr-1 opacity-70" />;
  };
  
  // تحديد لون خلفية الزر بناءً على الإشارة الحالية والإطار الزمني المحدد
  const getButtonStyles = (timeframe: TimeFrame, isAvailable: boolean) => {
    // إذا كان الإطار الزمني هو المحدد
    if (selectedTimeframe === timeframe) {
      // إذا كانت هناك إشارة حالية
      if (currentSignal) {
        switch (currentSignal) {
          case 'UP':
            return 'bg-success/20 text-success border-success/50 font-semibold shadow-lg ring-1 ring-success/30';
          case 'DOWN':
            return 'bg-destructive/20 text-destructive border-destructive/50 font-semibold shadow-lg ring-1 ring-destructive/30';
          default:
            return 'bg-warning/20 text-warning border-warning/50 font-semibold shadow-lg ring-1 ring-warning/30';
        }
      }
      return 'bg-primary/20 text-primary border-primary/50 font-semibold shadow-lg ring-1 ring-primary/30';
    }
    
    // تنسيق الأزرار غير المحددة ولكن متاحة
    if (isAvailable) {
      // تعزيز العلاقة مع الإشارة الحالية للأزرار المتاحة
      if (currentSignal === 'UP' && timeframeAnalysis?.[timeframe]?.trend === 'bullish') {
        return 'bg-muted border-success/20 text-success hover:bg-success/10 hover:border-success/30';
      }
      
      if (currentSignal === 'DOWN' && timeframeAnalysis?.[timeframe]?.trend === 'bearish') {
        return 'bg-muted border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/30';
      }
      
      return 'bg-muted border-border text-foreground hover:bg-accent hover:border-accent-foreground/20';
    }
    
    // الأزرار غير المتاحة
    return 'bg-muted/50 border-border/50 text-muted-foreground cursor-not-allowed opacity-60';
  };
  
  // إضافة مؤشر لتأثير الإطار الزمني على الإشارة
  const getSignalImpactIndicator = (timeframe: TimeFrame) => {
    if (!currentSignal || currentSignal === 'WAIT' || selectedTimeframe !== timeframe) return null;
    
    let impactClass = '';
    let impactIcon = null;
    
    // تحديد لون المؤشر بناءً على نوع الإشارة
    if (currentSignal === 'UP') {
      impactClass = 'text-success bg-success/10 border-success/20';
      impactIcon = '▲';
    } else if (currentSignal === 'DOWN') {
      impactClass = 'text-destructive bg-destructive/10 border-destructive/20';
      impactIcon = '▼';
    }
    
    return (
      <div className={`absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-[10px] rounded-sm
                       px-1 py-0.5 border ${impactClass} whitespace-nowrap`}>
        {impactIcon} {t('timeframe_impacts_signal')}
      </div>
    );
  };
  
  // إذا كانت الشاشة صغيرة جداً، اعرض الأزرار في شبكة 3×2
  if (isMobile) {
    return (
      <div className="grid grid-cols-3 gap-2 w-full mb-6 relative">
        {timeframes.map((timeframe) => {
          const isAvailable = isTimeframeAvailable(timeframe.value);
          return (
            <button
              key={timeframe.value}
              onClick={() => handleTimeframeSelect(timeframe.value)}
              disabled={!isAvailable}
              className={`py-2 px-1 text-sm rounded-lg border transition-all duration-200 flex flex-row items-center justify-center relative ${
                getButtonStyles(timeframe.value, isAvailable)
              }`}
              title={timeframe.description}
            >
              {/* مؤشر الاتجاه إذا كان متاحًا */}
              {getTrendIndicator(timeframe.value)}
              
              <div className="flex items-center z-10">
                {getTimeframeIcon(timeframe.value)}
                <span>{timeframe.shortLabel}</span>
              </div>
              
              {!isAvailable && (
                <Lock className="absolute top-1 right-1 h-2.5 w-2.5 text-muted-foreground" />
              )}
              
              {/* مؤشر تأثير الإطار الزمني على الإشارة */}
              {getSignalImpactIndicator(timeframe.value)}
            </button>
          );
        })}
      </div>
    );
  }
  
  // للشاشات الكبيرة، اعرض الأزرار في صف واحد
  return (
    <div className="grid grid-cols-6 gap-1 w-full mb-6 relative">
      {timeframes.map((timeframe) => {
        const isAvailable = isTimeframeAvailable(timeframe.value);
        return (
          <button
            key={timeframe.value}
            onClick={() => handleTimeframeSelect(timeframe.value)}
            disabled={!isAvailable}
            className={`py-2 px-1 text-sm rounded-lg border transition-all duration-200 flex items-center justify-center gap-1 relative ${
              getButtonStyles(timeframe.value, isAvailable)
            }`}
            title={timeframe.label}
          >
            {/* مؤشر الاتجاه إذا كان متاحًا */}
            {getTrendIndicator(timeframe.value)}
            
            <div className="flex items-center z-10">
              {getTimeframeIcon(timeframe.value)}
              <span>{timeframe.shortLabel}</span>
            </div>
            
            {!isAvailable && (
              <Lock className="absolute top-1 right-1 h-2.5 w-2.5 text-muted-foreground" />
            )}
            
            {/* مؤشر تأثير الإطار الزمني على الإشارة */}
            {getSignalImpactIndicator(timeframe.value)}
          </button>
        );
      })}
    </div>
  );
}