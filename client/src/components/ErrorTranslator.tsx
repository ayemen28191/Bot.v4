import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Copy, Check, Languages, X } from "lucide-react";
import { t, getCurrentLanguage, supportedLanguages } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

/**
 * قاموس لأنماط رسائل الخطأ الشائعة
 * كل مفتاح هو نمط تعبير منتظم يطابق نوع معين من رسائل الخطأ
 * القيمة هي معرف النص المترجم المقابل في ملف i18n.ts
 */
const ERROR_PATTERNS: Record<string, string> = {
  // أخطاء الشبكة
  '(network|connection)\\s+(error|failure|issue)': 'error_network_failure',
  'server\\s+(down|unavailable|offline)': 'error_server_down',
  
  // أخطاء المصادقة
  '(authentication|auth)\\s+(failed|error|invalid)': 'error_authentication_failed',
  '(unauthorized|not authorized)': 'error_not_authorized',
  'permission denied': 'error_permission_denied',
  'forbidden': 'error_forbidden',
  
  // أخطاء التحقق من الصحة
  'validation (failed|error)': 'error_validation_failed',
  
  // أخطاء البيانات
  'data not found': 'error_data_not_found',
  
  // أخطاء API
  'invalid request': 'error_invalid_request',
  'api (limit|quota) exceeded': 'error_api_limit_exceeded',
  
  // أخطاء قاعدة البيانات
  'database (connection|connectivity) (error|issue)': 'error_database_connection',
  'database query (error|failed)': 'error_database_query',
  
  // أخطاء الملفات
  'file not found': 'error_file_not_found',
  'file (too large|size limit exceeded)': 'error_file_too_large',
  'unsupported file (type|format)': 'error_unsupported_file_type',
  
  // أخطاء الخدمة
  'timeout': 'error_timeout',
  'server error': 'error_server_error',
  'bad request': 'error_bad_request',
  
  // أخطاء التطبيق المحددة
  '(invalid|incorrect) (credentials|username|password)': 'error_invalid_credentials',
  'username (exists|already taken|not available)': 'error_username_exists',
  'email (exists|already registered|in use)': 'error_email_exists',
  '(weak|invalid) password': 'error_weak_password',
  'session (expired|timeout)': 'error_session_expired',
  'invalid api key': 'error_invalid_api_key',
  'api key (missing|required)': 'error_api_key_missing',
  'api key expired': 'error_api_key_expired',
  
  // أنماط عامة للأخطاء
  'error': 'error_server_error',
  'failed': 'error_server_error',
  'invalid': 'error_invalid_request',
  'conflict': 'error_conflict'
};

/**
 * تحليل رسالة الخطأ للعثور على الترجمة المناسبة
 * @param errorMessage رسالة الخطأ الأصلية
 * @returns معرف نص الترجمة المناسب
 */
const parseErrorMessage = (errorMessage: string): string | null => {
  // تحويل النص إلى أحرف صغيرة للمطابقة بغض النظر عن حالة الأحرف
  const lowerMessage = errorMessage.toLowerCase();
  
  // التحقق من كل نمط في القاموس
  for (const pattern in ERROR_PATTERNS) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(lowerMessage)) {
      return ERROR_PATTERNS[pattern];
    }
  }
  
  // إذا لم يتم العثور على أي مطابقة
  return null;
};

interface ErrorTranslatorProps {
  errorMessage: string;
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * مكون مترجم رسائل الخطأ
 * يعرض رسالة الخطأ الأصلية ويقدم ترجمات لها بلغات مختلفة
 */
export function ErrorTranslator({ errorMessage, isOpen = true, onClose }: ErrorTranslatorProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const currentLang = getCurrentLanguage();
  
  // الترجمة المناسبة لنوع الخطأ
  const errorType = parseErrorMessage(errorMessage);
  const [activeTab, setActiveTab] = useState(currentLang);
  
  useEffect(() => {
    // إعادة تعيين حالة النسخ بعد 1.5 ثانية
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [copied]);
  
  // إذا كانت النافذة مغلقة، لا تعرض شيئًا
  if (!isOpen) return null;
  
  // نسخ النص إلى الحافظة
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        toast({
          description: t('copied_to_clipboard') || 'Text copied to clipboard',
          duration: 2000,
        });
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        toast({
          variant: "destructive",
          description: t('copy_failed') || 'Failed to copy text',
          duration: 2000,
        });
      });
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto border shadow-md">
      <CardHeader className="bg-muted/30">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">{t('error_translation_title')}</CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          {errorType 
            ? t('translated_error_message')
            : t('error_not_recognized')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">{t('original_error_message')}</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8"
              onClick={() => copyToClipboard(errorMessage)}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="p-3 bg-muted rounded-md text-sm overflow-auto max-h-24">
            {errorMessage}
          </div>
        </div>
        
        <Separator className="my-4" />
        
        {errorType ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Languages className="h-4 w-4" />
              <h3 className="text-sm font-medium">{t('translated_error_message')}</h3>
            </div>
            
            <Tabs defaultValue={currentLang} value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 grid grid-cols-3">
                {supportedLanguages.map(lang => (
                  <TabsTrigger key={lang.id} value={lang.id}>
                    {lang.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {supportedLanguages.map(lang => (
                <TabsContent key={lang.id} value={lang.id} className="p-3 bg-muted rounded-md text-sm">
                  {/* استخدم الترجمة المناسبة للغة المحددة */}
                  <div className="flex justify-between items-center">
                    <div>
                      {t(errorType)}
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {lang.name}
                    </Badge>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            <AlertCircle className="h-6 w-6 mx-auto mb-2" />
            <p>{t('translation_not_available')}</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between bg-muted/30">
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('close')}
        </Button>
        
        {errorType && (
          <Button 
            variant="default" 
            size="sm"
            onClick={() => copyToClipboard(t(errorType))}
          >
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {t('copy_translation')}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default ErrorTranslator;