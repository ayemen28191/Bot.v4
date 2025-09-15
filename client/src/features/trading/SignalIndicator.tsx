import { 
  ChevronUp, ChevronDown, Clock, ArrowUpCircle, ArrowDownCircle, 
  Clock3, TrendingUp, TrendingDown, MoveUp, MoveDown, ArrowUp, ArrowDown,
  LucideIcon, Activity, AlertCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';

export type SignalType = 'UP' | 'DOWN' | 'WAIT';

interface SignalIndicatorProps {
  signal: SignalType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  probability?: number; // احتمالية الإشارة من 0 إلى 100
  animated?: boolean; // إضافة تأثيرات حركية
  variant?: 'default' | 'filled' | 'outline' | 'minimal' | 'gradient'; // أنماط مختلفة للعرض
}

export default function SignalIndicator({ 
  signal, 
  size = 'md', 
  showLabel = true, 
  className = '',
  probability,
  animated = true,
  variant = 'default'
}: SignalIndicatorProps) {
  // استخدام حالة لتطبيق التأثيرات الحركية المتقدمة
  const [isPulsing, setIsPulsing] = useState(false);
  
  // تفعيل النبض بعد التحميل
  useEffect(() => {
    if (animated && (signal === 'UP' || signal === 'DOWN')) {
      const timer = setTimeout(() => setIsPulsing(true), 300);
      return () => clearTimeout(timer);
    }
  }, [animated, signal]);
  
  // تحديد حجم المؤشر بناءً على الخاصية size ومناسب للشاشات الصغيرة
  const sizeClasses = {
    sm: {
      container: 'py-1 px-2 text-xs',
      icon: 'w-3.5 h-3.5',
      pulse: 'w-9 h-9',
      glowSize: 'w-3.5 h-3.5',
      arrow: 'text-xl',
      bar: 'h-0.5 w-8'
    },
    md: {
      container: 'py-1.5 px-3 text-sm',
      icon: 'w-4.5 h-4.5',
      pulse: 'w-12 h-12',
      glowSize: 'w-4.5 h-4.5',
      arrow: 'text-2xl',
      bar: 'h-0.75 w-12'
    },
    lg: {
      container: 'py-2 px-4 text-base',
      icon: 'w-5.5 h-5.5',
      pulse: 'w-16 h-16',
      glowSize: 'w-5.5 h-5.5',
      arrow: 'text-3xl',
      bar: 'h-1 w-16'
    },
  };
  
  // تكوين العناصر المرئية بناءً على نوع الإشارة ونمط العرض
  let baseClassName = `rounded-lg flex items-center gap-1.5 justify-center font-semibold shadow-md ${sizeClasses[size].container} transition-all duration-300`;
  let containerClass = `${baseClassName} ${className}`;
  let iconClass = sizeClasses[size].icon;
  let pulseClass = `absolute ${sizeClasses[size].pulse} rounded-full opacity-75 pointer-events-none`;
  let glowClass = `absolute ${sizeClasses[size].glowSize} opacity-60 ${isPulsing ? 'animate-pulse' : ''}`;
  let barClass = `absolute ${sizeClasses[size].bar} rounded-full mx-auto`;
  
  let PrimaryIcon: LucideIcon | null = null;
  let SecondaryIcon: LucideIcon | null = null;
  let arrowClass = sizeClasses[size].arrow;
  let text = '';
  let showPulse = animated && isPulsing;
  let showGradient = variant === 'gradient';
  
  // قاموس الأيقونات لكل نوع إشارة
  const icons = {
    UP: {
      primary: TrendingUp,
      secondary: ArrowUp,
      filled: MoveUp
    },
    DOWN: {
      primary: TrendingDown,
      secondary: ArrowDown,
      filled: MoveDown
    },
    WAIT: {
      primary: Clock3,
      secondary: AlertCircle,
      filled: Clock
    }
  };
  
  // اختيار الأيقونات بناءً على نوع الإشارة ونمط العرض
  PrimaryIcon = icons[signal].primary;
  
  if (variant === 'filled') {
    PrimaryIcon = icons[signal].filled;
  } else if (variant === 'minimal') {
    PrimaryIcon = icons[signal].secondary;
  }
  
  SecondaryIcon = icons[signal].secondary;
  
  // تكوين الأنماط المختلفة
  switch (variant) {
    case 'filled':
      // نمط ممتلئ بلون الإشارة
      containerClass += ` ${signal === 'UP' 
        ? 'bg-success text-success-foreground border-none' 
        : signal === 'DOWN' 
          ? 'bg-destructive text-destructive-foreground border-none' 
          : 'bg-muted text-muted-foreground border-none'}`;
      break;
    
    case 'outline':
      // نمط الحدود فقط
      containerClass += ` bg-transparent ${signal === 'UP' 
        ? 'border-2 border-success text-success' 
        : signal === 'DOWN' 
          ? 'border-2 border-destructive text-destructive' 
          : 'border-2 border-muted text-muted-foreground'}`;
      break;
    
    case 'minimal':
      // نمط مبسط
      containerClass += ` bg-transparent border-none ${signal === 'UP' 
        ? 'text-success' 
        : signal === 'DOWN' 
          ? 'text-destructive' 
          : 'text-muted-foreground'}`;
      pulseClass = ''; // إلغاء تأثير النبض
      break;
    
    case 'gradient':
      // نمط التدرج اللوني
      containerClass += ` border-none ${signal === 'UP' 
        ? 'bg-gradient-to-r from-success/60 via-success/50 to-success/60 text-success-foreground' 
        : signal === 'DOWN' 
          ? 'bg-gradient-to-r from-destructive/60 via-destructive/50 to-destructive/60 text-destructive-foreground' 
          : 'bg-gradient-to-r from-muted/80 to-muted/70 text-muted-foreground'}`;
      break;
    
    default:
      // النمط الافتراضي
      containerClass += ` border ${signal === 'UP' 
        ? 'bg-success/10 border-success/30 text-success shadow-lg shadow-success/10' 
        : signal === 'DOWN' 
          ? 'bg-destructive/10 border-destructive/30 text-destructive shadow-lg shadow-destructive/10' 
          : 'bg-muted/50 border-muted/40 text-muted-foreground'}`;
      break;
  }
  
  // تعيين نص الإشارة بناءً على نوع الإشارة
  switch (signal) {
    case 'UP':
      pulseClass += ' bg-success/30 animate-ping';
      glowClass += ' text-success';
      barClass += ' bg-success/70';
      text = t('buy');
      break;
      
    case 'DOWN':
      pulseClass += ' bg-destructive/30 animate-ping';
      glowClass += ' text-destructive';
      barClass += ' bg-destructive/70';
      text = t('sell');
      break;
      
    case 'WAIT':
      text = t('wait');
      barClass += ' bg-muted/50';
      break;
  }
  
  // إضافة معلومات الاحتمالية إذا كانت متوفرة مع تنسيق العدد
  const probabilityText = probability !== undefined 
    ? `${Number(probability).toFixed(1)}%` 
    : '';
  
  return (
    <div className="relative flex items-center justify-center group">
      {showPulse && <span className={pulseClass}></span>}
      
      {/* تأثير الشريط الأفقي (للتعبير عن العلاقة مع الإطار الزمني) */}
      {variant !== 'minimal' && signal !== 'WAIT' && (
        <div className={`absolute -bottom-4 ${barClass} transform transition-all duration-500 opacity-80 ${isPulsing ? 'scale-x-100' : 'scale-x-0'}`}></div>
      )}
      
      <div className={containerClass}>
        {/* إظهار الأيقونة الرئيسية */}
        <span className="flex items-center justify-center relative z-10">
          {PrimaryIcon && <PrimaryIcon className={iconClass} />}
          
          {/* إضافة تأثير توهج للأيقونة */}
          {animated && (signal === 'UP' || signal === 'DOWN') && (
            <span className={glowClass}>
              {PrimaryIcon && <PrimaryIcon className={iconClass} />}
            </span>
          )}
        </span>
        
        {/* إظهار النص و/أو الأيقونة الثانوية */}
        {showLabel && (
          <div className="flex items-center">
            <span className="font-semibold">{text}</span>
            
            {/* إظهار العلامة و/أو النسبة المئوية */}
            {signal === 'UP' && <span className={`${arrowClass} leading-none font-bold ml-0.5`}>▲</span>}
            {signal === 'DOWN' && <span className={`${arrowClass} leading-none font-bold ml-0.5`}>▼</span>}
            
            {/* إظهار الاحتمالية */}
            {probability !== undefined && (
              <span className={`ml-1 text-xs bg-background/20 px-1.5 py-0.5 rounded ${
                signal === 'UP' ? 'text-success' : 
                signal === 'DOWN' ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {probabilityText}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}