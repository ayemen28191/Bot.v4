import { useState } from 'react';
import ErrorTranslator from '@/components/ErrorTranslator';

/**
 * خطاف يتيح استخدام مترجم رسائل الخطأ في أي مكون
 */
export function useErrorTranslator() {
  // حالة عرض النافذة
  const [isOpen, setIsOpen] = useState(false);
  // رسالة الخطأ الحالية
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  /**
   * فتح النافذة مع رسالة خطأ معينة
   */
  const translateError = (message: string) => {
    setErrorMessage(message);
    setIsOpen(true);
  };
  
  /**
   * إغلاق النافذة
   */
  const closeTranslator = () => {
    setIsOpen(false);
  };
  
  /**
   * مكون مترجم رسائل الخطأ
   */
  const ErrorTranslatorComponent = () => {
    if (!isOpen || !errorMessage) return null;
    
    return (
      <ErrorTranslator
        errorMessage={errorMessage}
        isOpen={isOpen}
        onClose={closeTranslator}
      />
    );
  };
  
  return {
    translateError,
    closeTranslator,
    ErrorTranslatorComponent,
    isTranslatorOpen: isOpen
  };
}

export default useErrorTranslator;