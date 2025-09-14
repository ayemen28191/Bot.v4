
/**
 * معالج الأخطاء العام للتطبيق
 */

import { toast } from '@/hooks/use-toast';
import { extractErrorMessage } from './errorTranslator';

// معالج الأخطاء العام
export const globalErrorHandler = (error: any, context?: string) => {
  console.error(`Error in ${context || 'application'}:`, error);
  
  const errorMessage = extractErrorMessage(error);
  
  // عرض رسالة خطأ للمستخدم
  toast({
    title: 'حدث خطأ',
    description: errorMessage || 'حدث خطأ غير متوقع',
    variant: 'destructive',
  });
};

// معالج أخطاء الشبكة
export const networkErrorHandler = (error: any) => {
  if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
    toast({
      title: 'خطأ في الشبكة',
      description: 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى',
      variant: 'destructive',
    });
    return;
  }
  
  globalErrorHandler(error, 'network');
};

// إعداد معالج الأخطاء العام للنافذة
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    globalErrorHandler(event.error, 'window');
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    globalErrorHandler(event.reason, 'promise');
  });
}
