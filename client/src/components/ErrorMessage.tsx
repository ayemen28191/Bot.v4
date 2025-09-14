/**
 * مكون ErrorMessage
 * مكون مخصص لعرض رسائل الخطأ مع ترجمتها تلقائيًا
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, X, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { translateError, ErrorTranslation, needsTranslation, extractErrorMessage } from '@/lib/errorTranslator';
import { t, getCurrentLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ErrorMessageProps {
  error?: any;
  message?: string;
  title?: string;
  showIcon?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  showDetails?: boolean;
  variant?: 'default' | 'destructive' | 'warning' | 'info';
  className?: string;
  children?: React.ReactNode;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  message,
  title,
  showIcon = true,
  dismissible = false,
  onDismiss,
  showDetails = false,
  variant = 'destructive',
  className,
  children,
}) => {
  // استخراج رسالة الخطأ من الخطأ إذا لم تكن محددة صراحة
  const errorMessage = message || (error ? extractErrorMessage(error) : '');
  
  // تسجيل الأخطاء في وضع التطوير
  if (error && process.env.NODE_ENV === 'development') {
    console.warn('Error in ErrorMessage component:', error);
  }
  
  // حالة الترجمة والتوسيع
  const [expanded, setExpanded] = useState<boolean>(false);
  const [translation, setTranslation] = useState<ErrorTranslation | null>(null);

  // ترجمة رسالة الخطأ عند تغيير الرسالة
  useEffect(() => {
    if (errorMessage) {
      const needsErrorTranslation = needsTranslation(errorMessage);
      
      if (needsErrorTranslation) {
        const translatedError = translateError(errorMessage);
        setTranslation(translatedError);
      } else {
        setTranslation(null);
      }
    } else {
      setTranslation(null);
    }
  }, [errorMessage]);

  // إذا لم تكن هناك رسالة خطأ، لا نعرض شيئًا
  if (!errorMessage && !children) {
    return null;
  }

  // اختيار الأيقونة المناسبة للتنبيه
  const Icon = variant === 'warning' ? AlertTriangle : AlertCircle;
  
  // تحديد اللون حسب النوع
  const variantStyles = {
    default: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive/15 text-destructive dark:bg-destructive/20',
    warning: 'bg-warning/15 text-warning-foreground dark:bg-warning/20',
    info: 'bg-primary/15 text-primary-foreground dark:bg-primary/20',
  };
  
  // تنسيق التنبيه
  const alertClass = variantStyles[variant] || variantStyles.default;

  return (
    <Alert 
      variant="default" 
      className={cn(
        "relative border-0 shadow-sm", 
        alertClass,
        className
      )}
    >
      {showIcon && (
        <Icon className="h-5 w-5 opacity-80" />
      )}
      
      <div className="w-full">
        {title && <AlertTitle>{title}</AlertTitle>}
        
        <AlertDescription className="flex flex-col space-y-2">
          {/* رسالة الخطأ الأصلية أو المترجمة */}
          <div className="text-sm">
            {children || (translation?.isTranslated ? translation.translatedMessage : errorMessage)}
          </div>
          
          {/* عرض شارة الترجمة إذا كانت متوفرة */}
          {translation?.isTranslated && (
            <div className="flex items-center mt-1 space-x-2 rtl:space-x-reverse">
              <Globe size={14} />
              <Badge variant="secondary" className="text-xs font-normal opacity-70">
                {t('error_translation_title')}
              </Badge>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 p-0 opacity-70" 
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </Button>
            </div>
          )}
          
          {/* عرض تفاصيل الترجمة إذا كانت موسعة */}
          {translation?.isTranslated && expanded && (
            <div className="text-xs border-t border-border/50 mt-1 pt-1 opacity-70 space-y-1">
              <div>
                <span className="font-medium">{t('original_error_message')}</span> {translation.originalMessage}
              </div>
              <div>
                <span className="font-medium">{t('translated_error_message')}</span> {translation.translatedMessage}
              </div>
            </div>
          )}
          
          {/* زر إغلاق التنبيه */}
          {dismissible && onDismiss && (
            <Button
              onClick={onDismiss}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 p-0 opacity-70 hover:opacity-100"
              aria-label="Close"
            >
              <X size={16} />
            </Button>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
};

export default ErrorMessage;