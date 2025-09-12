import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw, WifiOff, CloudOff, Check, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useStore as useChatStore } from '@/store/chatStore';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';

interface ConnectionErrorProps {
  message?: string;
  onRetry?: () => void;
  autoRetry?: boolean;
  retryInterval?: number; // بالثواني
  className?: string;
  onEnableOfflineMode?: () => void;
  showOfflineModeOption?: boolean;
}

const ConnectionError: React.FC<ConnectionErrorProps> = ({
  message = 'تحديث بيانات التحليل جارٍ. يمكنك الانتظار قليلاً أو استخدام وضع التحليل المحلي للاستمرار.',
  onRetry,
  autoRetry = true,
  retryInterval = 30,
  className = '',
  onEnableOfflineMode,
  showOfflineModeOption = true,
}) => {
  const { toast } = useToast();
  const enableOfflineMode = useChatStore(state => state.enableOfflineMode);
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showEnableOfflineButton, setShowEnableOfflineButton] = useState(false);

  // إعادة ضبط العداد التنازلي عند التغيير في فترة إعادة المحاولة
  useEffect(() => {
    if (autoRetry) {
      setCountdown(retryInterval);
    }
  }, [retryInterval, autoRetry]);

  // عداد تنازلي لإعادة المحاولة التلقائية
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (autoRetry && countdown > 0 && !isRetrying) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0 && autoRetry && !isRetrying) {
      handleRetry();
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown, autoRetry, isRetrying]);

  const handleRetry = async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    
    try {
      if (onRetry) {
        await onRetry();
      }
      
      // إعادة ضبط العداد التنازلي بعد المحاولة
      if (autoRetry) {
        setCountdown(retryInterval);
      }
      
      toast({
        title: "تم إعادة الاتصال بنجاح",
        description: "تم استعادة الاتصال بنجاح وتحديث البيانات",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "تحديث البيانات مستمر",
        description: "نحن نعمل على جلب أحدث البيانات. سنحاول مرة أخرى تلقائيًا",
        variant: "default",
      });
      
      // فشلت المحاولة، تقليل وقت الانتظار للمحاولة القادمة
      if (autoRetry) {
        const newInterval = Math.max(5, Math.floor(retryInterval / 2));
        setCountdown(newInterval);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  // إظهار زر وضع عدم الاتصال بعد عدد محدد من المحاولات
  useEffect(() => {
    if (retryCount >= 2 && showOfflineModeOption) {
      setShowEnableOfflineButton(true);
    }
  }, [retryCount, showOfflineModeOption]);

  // تصميم حسب عدد المحاولات
  const getRetryButtonVariant = () => {
    if (retryCount > 5) return "destructive";
    if (retryCount > 2) return "outline";
    return "default";
  };

  // تفعيل وضع عدم الاتصال
  const handleEnableOfflineMode = () => {
    try {
      // استخدام الدالة من المخزن
      enableOfflineMode();
      
      // استدعاء الدالة من الخارج إذا كانت متاحة
      if (onEnableOfflineMode) {
        onEnableOfflineMode();
      }
      
      toast({
        title: "تم تفعيل وضع عدم الاتصال",
        description: "يمكنك الآن استخدام التطبيق بدون اتصال بالإنترنت. ستتم مزامنة البيانات عند عودة الاتصال.",
        variant: "default",
      });
    } catch (error) {
      console.error('فشل في تفعيل وضع عدم الاتصال:', error);
      toast({
        title: "تعذر تفعيل وضع عدم الاتصال",
        description: "حدث خطأ أثناء محاولة تفعيل وضع عدم الاتصال. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={`w-full max-w-md mx-auto shadow-lg border-destructive ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <WifiOff className="h-5 w-5" />
          تحديث البيانات
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>تحديث البيانات جارٍ</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        
        {autoRetry && (
          <>
            <Progress 
              value={(countdown / retryInterval) * 100} 
              className="h-1 my-2"
              indicatorClassName="bg-primary"
            />
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              إعادة المحاولة خلال{" "}
              <span className="font-bold">{countdown}</span> ثانية
              {countdown !== 1 && ""}...
            </div>
          </>
        )}
        
        {/* عرض خيار وضع عدم الاتصال بعد عدد من المحاولات الفاشلة */}
        {showEnableOfflineButton && showOfflineModeOption && (
          <>
            <Separator className="my-3" />
            <div className="mt-3 space-y-2">
              <p className="text-sm">
                إذا استمرت مشكلة الاتصال، يمكنك تفعيل <strong>وضع عدم الاتصال</strong> للاستمرار في استخدام التطبيق.
              </p>
              <div className="flex items-center gap-2 bg-muted p-2 rounded-md text-xs">
                <CloudOff className="h-4 w-4 text-yellow-500" />
                <span>
                  في وضع عدم الاتصال، سيتم تخزين بياناتك محلياً ومزامنتها عند عودة الاتصال.
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col gap-2">
        <div className="flex justify-between w-full items-center">
          <p className="text-xs text-muted-foreground">
            {retryCount > 0 && `عدد المحاولات: ${retryCount}`}
          </p>
          
          <Button
            variant={getRetryButtonVariant()}
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? "جاري المحاولة..." : "إعادة المحاولة"}
          </Button>
        </div>
        
        {/* زر تفعيل وضع عدم الاتصال */}
        {showEnableOfflineButton && showOfflineModeOption && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnableOfflineMode}
            className="w-full gap-1 mt-2 border-yellow-500 hover:bg-yellow-500/10"
          >
            <CloudOff className="h-4 w-4" />
            تفعيل وضع عدم الاتصال
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ConnectionError;