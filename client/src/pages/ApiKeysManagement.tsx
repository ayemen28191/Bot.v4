import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { t } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, RefreshCw, Save, Star, Check, AlertTriangle, KeyRound, 
  Info, HelpCircle, Database, Cog, RefreshCcw, ExternalLink, Key,
  DollarSign, Users, Settings
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// معلومات المفاتيح وشرح كل مفتاح
const API_KEYS_INFO = {
  'TWELVEDATA_API_KEY': {
    title: 'مفتاح TwelveData API',
    description: 'يستخدم لجلب بيانات أسعار الفوركس والأسهم. يمكنك الحصول على مفتاح مجاني من الموقع الرسمي.',
    serviceUrl: 'https://twelvedata.com',
    usage: 'يستخدم للحصول على أسعار تداول العملات والأسهم في الوقت الحقيقي',
    isRequired: true,
    category: 'أسعار السوق'
  },
  'PRIMARY_API_KEY': {
    title: 'مفتاح Alpha Vantage الرئيسي',
    description: 'المفتاح الرئيسي لخدمة Alpha Vantage لبيانات الأسهم والمؤشرات المالية.',
    serviceUrl: 'https://www.alphavantage.co',
    usage: 'يستخدم للحصول على أسعار وبيانات الأسهم والمؤشرات',
    isRequired: true,
    category: 'أسعار السوق'
  },
  'BACKUP_API_KEYS': {
    title: 'مفاتيح Alpha Vantage الاحتياطية',
    description: 'قائمة مفاتيح احتياطية لخدمة Alpha Vantage. يجب فصل المفاتيح بفواصل.',
    serviceUrl: 'https://www.alphavantage.co',
    usage: 'تستخدم في حالة استنفاد حد الاستخدام للمفتاح الرئيسي',
    isRequired: false,
    category: 'أسعار السوق'
  },
  'BINANCE_API_KEY': {
    title: 'مفتاح Binance API',
    description: 'يستخدم للوصول إلى بيانات أسعار العملات المشفرة من منصة Binance.',
    serviceUrl: 'https://www.binance.com',
    usage: 'يستخدم للحصول على أسعار العملات المشفرة والتداول',
    isRequired: true,
    category: 'عملات مشفرة'
  },
  'BINANCE_SECRET_KEY': {
    title: 'المفتاح السري لـ Binance',
    description: 'المفتاح السري المطلوب للمصادقة مع واجهة Binance API.',
    serviceUrl: 'https://www.binance.com',
    usage: 'يستخدم مع مفتاح API للمصادقة والوصول الآمن',
    isRequired: true,
    category: 'عملات مشفرة'
  },
  'MARKET_API_KEY': {
    title: 'مفتاح عام للسوق',
    description: 'مفتاح عام يستخدم للوصول إلى خدمات بيانات السوق المختلفة.',
    usage: 'مفتاح عام للاستخدام مع خدمات متنوعة',
    isRequired: false,
    category: 'عام'
  }
};

// نموذج مفتاح API
interface ApiKey {
  key: string;
  value: string;
  description?: string;
  isSecret: boolean;
  createdAt?: string;
  updatedAt?: string;
  status?: 'valid' | 'invalid' | 'untested';
}

// نموذج Zod للتحقق من صحة المدخلات
const apiKeyFormSchema = z.object({
  key: z.string().min(1, { message: "اسم المفتاح مطلوب" }),
  value: z.string().min(1, { message: "قيمة المفتاح مطلوبة" }),
  description: z.string().optional(),
  isSecret: z.boolean().default(true)
});

type ApiKeyFormValues = z.infer<typeof apiKeyFormSchema>;

export default function ApiKeysManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [keyStatuses, setKeyStatuses] = useState<Record<string, {status: 'valid' | 'invalid' | 'untested', message?: string}>>({});

  // تهيئة نموذج إدخال المفتاح
  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      key: "",
      value: "",
      description: "",
      isSecret: true
    }
  });

  // جلب جميع مفاتيح API عند تحميل الصفحة
  useEffect(() => {
    // وظيفة لتحميل المفاتيح
    const fetchApiKeys = async () => {
      try {
        setLoading(true);
        console.log("جاري تحميل المفاتيح...");
        
        // استخدم المسار الجديد للمفاتيح لضمان عرضها بغض النظر عن صلاحيات المستخدم
        const endpoint = "/api/config-keys/all";
        console.log(`استخدام مسار API: ${endpoint}`);
        
        const response = await apiRequest("GET", endpoint);
        const data = await response.json();
        
        console.log("تم استلام المفاتيح:", data);
        
        if (data.length === 0) {
          console.log("لا توجد مفاتيح، سيتم عرض القوالب الفارغة");
        }
        
        // تعيين حالة غير مختبرة لجميع المفاتيح
        const statuses: Record<string, {status: 'valid' | 'invalid' | 'untested', message?: string}> = {};
        data.forEach((key: ApiKey) => {
          statuses[key.key] = { status: 'untested' };
        });
        
        setApiKeys(data);
        setKeyStatuses(statuses);
      } catch (error) {
        console.error("خطأ في جلب مفاتيح API:", error);
        
        // في حالة الخطأ، نستخدم مسار المفاتيح الافتراضية
        try {
          console.log("محاولة جلب المفاتيح الافتراضية...");
          const fallbackResponse = await apiRequest("GET", "/api/config-keys/defaults");
          const fallbackData = await fallbackResponse.json();
          
          // تعيين حالة غير مختبرة لجميع المفاتيح
          const statuses: Record<string, {status: 'valid' | 'invalid' | 'untested', message?: string}> = {};
          fallbackData.forEach((key: ApiKey) => {
            statuses[key.key] = { status: 'untested' };
          });
          
          setApiKeys(fallbackData);
          setKeyStatuses(statuses);
          console.log("تم جلب المفاتيح الافتراضية بنجاح");
        } catch (fallbackError) {
          console.error("فشل في جلب المفاتيح الافتراضية:", fallbackError);
          toast({
            title: "خطأ",
            description: "فشل في جلب مفاتيح API",
            variant: "destructive"
          });
        }
      } finally {
        setLoading(false);
      }
    };

    // تنفيذ جلب المفاتيح عند تحميل الصفحة
    fetchApiKeys();
  }, [user, toast]);

  // حفظ مفتاح API جديد أو تحديث مفتاح موجود
  const handleSaveKey = async (data: ApiKeyFormValues) => {
    try {
      setUpdating(true);
      
      const response = await apiRequest("POST", "/api/config-keys", data);
      const savedKey = await response.json();
      
      // تحديث القائمة: إضافة مفتاح جديد أو تحديث موجود
      setApiKeys(prev => {
        const exists = prev.some(key => key.key === data.key);
        if (exists) {
          return prev.map(key => key.key === data.key ? { ...savedKey, status: 'untested' } : key);
        } else {
          return [...prev, { ...savedKey, status: 'untested' }];
        }
      });
      
      // تحديث حالة المفتاح في القائمة
      setKeyStatuses(prev => ({
        ...prev,
        [data.key]: { status: 'untested' }
      }));
      
      // إعادة تعيين النموذج
      form.reset();
      
      toast({
        title: "تم الحفظ",
        description: `تم حفظ المفتاح ${data.key} بنجاح`,
      });
      
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ مفتاح API",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  // اختبار صلاحية مفتاح API
  const testApiKey = async (keyName: string) => {
    try {
      // تعيين حالة الاختبار للمفتاح المحدد
      setTesting(prev => ({ ...prev, [keyName]: true }));
      
      console.log(`بدء اختبار المفتاح: ${keyName}`);
      
      // استخدام نقطة النهاية السريعة الجديدة للاختبار
      const response = await apiRequest("GET", `/api/config-keys/quicktest/${keyName}`);
      const result = await response.json();
      
      console.log(`نتيجة اختبار المفتاح ${keyName}:`, result);
      
      // تحديث حالة المفتاح بناءً على نتيجة الاختبار
      setKeyStatuses(prev => ({
        ...prev,
        [keyName]: {
          status: result.success ? 'valid' : 'invalid',
          message: result.message
        }
      }));
      
      // إظهار إشعار بنتيجة الاختبار
      toast({
        title: result.success ? "اختبار ناجح" : "اختبار فاشل",
        description: result.message || `تم اختبار المفتاح ${keyName}`,
        variant: result.success ? "default" : "destructive"
      });
      
    } catch (error: any) {
      console.error(`خطأ في اختبار المفتاح ${keyName}:`, error);
      
      // محاولة بديلة باستخدام نقطة النهاية القديمة إذا فشلت النقطة الجديدة
      try {
        console.log(`محاولة استخدام نقطة النهاية البديلة للمفتاح ${keyName}`);
        const fallbackResponse = await apiRequest("GET", `/api/config-keys/test/${keyName}`);
        const fallbackResult = await fallbackResponse.json();
        
        setKeyStatuses(prev => ({
          ...prev,
          [keyName]: {
            status: fallbackResult.success ? 'valid' : 'invalid',
            message: fallbackResult.message
          }
        }));
        
        toast({
          title: fallbackResult.success ? "اختبار ناجح" : "اختبار فاشل",
          description: fallbackResult.message || `تم اختبار المفتاح ${keyName}`,
          variant: fallbackResult.success ? "default" : "destructive"
        });
        
        return;
      } catch (fallbackError) {
        console.error(`فشل المحاولة البديلة لاختبار المفتاح ${keyName}:`, fallbackError);
      }
      
      // تحديث حالة المفتاح إلى فاشل في حالة وجود خطأ
      setKeyStatuses(prev => ({
        ...prev,
        [keyName]: {
          status: 'invalid',
          message: error.message || "فشل في اختبار المفتاح"
        }
      }));
      
      toast({
        title: "خطأ",
        description: `فشل في اختبار المفتاح ${keyName}: ${error.message || 'خطأ غير معروف'}`,
        variant: "destructive"
      });
    } finally {
      // إعادة تعيين حالة الاختبار
      setTesting(prev => ({ ...prev, [keyName]: false }));
    }
  };

  // حذف مفتاح API
  const deleteApiKey = async (keyName: string) => {
    if (!confirm(`هل أنت متأكد من حذف المفتاح ${keyName}؟`)) {
      return;
    }
    
    try {
      setUpdating(true);
      await apiRequest("DELETE", `/api/config-keys/${keyName}`);
      
      // إزالة المفتاح من القائمة
      setApiKeys(prev => prev.filter(key => key.key !== keyName));
      
      toast({
        title: "تم الحذف",
        description: `تم حذف المفتاح ${keyName} بنجاح`,
      });
    } catch (error) {
      console.error(`Error deleting API key ${keyName}:`, error);
      toast({
        title: "خطأ",
        description: `فشل في حذف المفتاح ${keyName}`,
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  // تعيين قيم نموذج تحرير مفتاح موجود
  const editApiKey = (key: ApiKey) => {
    form.reset({
      key: key.key,
      value: "", // لا نعرض القيمة الكاملة للأمان
      description: key.description || "",
      isSecret: key.isSecret
    });
  };

  // رندر حالة المفتاح
  const renderKeyStatus = (keyName: string) => {
    const status = keyStatuses[keyName];
    if (!status) return null;
    
    if (status.status === 'valid') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-600 hover:bg-green-50">
          <Check className="w-3 h-3 mr-1" /> صالح
        </Badge>
      );
    } else if (status.status === 'invalid') {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-600 hover:bg-red-50">
          <AlertTriangle className="w-3 h-3 mr-1" /> غير صالح
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground hover:bg-muted">
          غير مختبر
        </Badge>
      );
    }
  };

  // التحقق من وجود المستخدم وصلاحيات الإدارة
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-center text-muted-foreground mb-4">يرجى تسجيل الدخول للوصول إلى هذه الصفحة</p>
        <Link href="/auth">
          <Button>تسجيل الدخول</Button>
        </Link>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-center text-muted-foreground">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
      </div>
    );
  }

// مكون بطاقة مفتاح API - يعرض معلومات مفتاح واحد مع أزرار التحكم
interface ApiKeyCardProps {
  apiKey?: ApiKey;  // المفتاح (اختياري في حالة عدم وجوده بعد)
  keyName?: string; // اسم المفتاح (في حالة عدم وجود المفتاح)
  info?: any;       // معلومات إضافية عن المفتاح (اختياري)
  onTest: (key: string) => void;
  onEdit: (key: ApiKey) => void;
  testing: Record<string, boolean>;
  renderStatus: (key: string) => React.ReactNode;
}

function ApiKeyCard({ apiKey, keyName, info, onTest, onEdit, testing, renderStatus }: ApiKeyCardProps) {
  const key = apiKey?.key || keyName || '';
  const displayName = info?.title || key;
  const description = apiKey?.description || info?.description || '';

  return (
    <div className="border-2 rounded-lg p-3 bg-card shadow-sm border-border">
      <div className="mb-2">
        <div className="font-semibold text-md flex items-center gap-2 text-foreground">
          <Key className="h-4 w-4 text-primary" />
          {displayName}
          {apiKey && renderStatus(apiKey.key)}
          {info?.isRequired && (
            <Badge variant="outline" className="ml-1 text-xs bg-destructive/10 text-destructive font-bold">
              مطلوب
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1 mr-5">
          {description}
        </div>
      </div>
      
      <div className="space-y-3">
        {/* اسم المفتاح ثابت غير قابل للتعديل */}
        <div className="mb-1">
          <div className="text-xs font-bold text-foreground mb-1">اسم المفتاح:</div>
          <div className="px-2 py-1 bg-muted border-2 border-border rounded-md text-sm font-mono text-foreground font-medium">
            {key}
          </div>
        </div>
          
        {/* قيمة المفتاح - حقل قابل للتحديث */}
        <div className="flex flex-col">
          <div className="text-xs font-bold text-foreground mb-1">قيمة المفتاح:</div>
          {apiKey ? (
            <div className="flex gap-2 items-center">
              <div className="flex-1 bg-accent border border-border rounded-md p-2 text-sm font-mono text-foreground overflow-x-auto">
                {apiKey.value}
              </div>
              <Button 
                variant="outline"
                size="icon"
                onClick={() => onEdit(apiKey)}
                title="تحديث المفتاح"
                className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/30"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => onTest(apiKey.key)}
                disabled={testing[apiKey.key]}
                title="فحص المفتاح"
                className="bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"
              >
                {testing[apiKey.key] ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <div className="flex-1 bg-muted border border-border rounded-md p-2 text-sm font-mono text-muted-foreground">
                المفتاح غير مكون...
              </div>
              <Button 
                variant="outline"
                size="icon"
                onClick={() => {
                  if (keyName) {
                    form.reset({
                      key: keyName,
                      value: "",
                      description: info?.description || "",
                      isSecret: true
                    });
                  }
                }}
                title="إضافة المفتاح"
                className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/30"
              >
                <Key className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        {info?.usage && (
          <div className="text-xs text-muted-foreground mt-1">
            <span className="font-medium">الاستخدام:</span> {info.usage}
          </div>
        )}
      </div>
    </div>
  );
}

  return (
    <div className="container py-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">إدارة مفاتيح API</h1>
          <p className="text-muted-foreground">إدارة وتكوين مفاتيح API للوصول إلى خدمات الطرف الثالث</p>
        </div>
        <Button 
          onClick={() => {
            form.reset({
              key: "",
              value: "",
              description: "",
              isSecret: true
            });
          }}
          variant="outline"
          className="gap-1"
        >
          <Key className="h-4 w-4" />
          مفتاح جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* نموذج إضافة/تعديل المفتاح */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <KeyRound className="h-5 w-5 mr-2 text-primary" />
              {form.getValues().key ? `تحديث المفتاح: ${form.getValues().key}` : "إضافة مفتاح جديد"}
            </CardTitle>
            <CardDescription>أدخل تفاصيل المفتاح لإضافته أو تحديثه</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSaveKey)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم المفتاح</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="مثال: MARKET_API_KEY" 
                            {...field} 
                            disabled={updating}
                          />
                        </FormControl>
                        <FormDescription>
                          استخدم نفس اسم المتغير البيئي
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>قيمة المفتاح</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="أدخل قيمة المفتاح" 
                            {...field} 
                            disabled={updating}
                          />
                        </FormControl>
                        <FormDescription>
                          هذه القيمة سيتم تشفيرها في قاعدة البيانات
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الوصف (اختياري)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="وصف الغرض من هذا المفتاح" 
                          {...field} 
                          disabled={updating}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => form.reset()}>
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={updating}>
                    {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    حفظ المفتاح
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* قسم عرض المفاتيح */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center">
              <Database className="h-5 w-5 mr-2 text-primary" />
              مفاتيح API المتوفرة
            </h2>
            <Button 
              variant="outline" 
              onClick={async () => {
                setLoading(true);
                try {
                  const response = await apiRequest("GET", "/api/config-keys/all");
                  const data = await response.json();
                  
                  // تعيين حالة غير مختبرة لجميع المفاتيح
                  const statuses: Record<string, {status: 'valid' | 'invalid' | 'untested', message?: string}> = {};
                  data.forEach((key: ApiKey) => {
                    statuses[key.key] = { status: 'untested' };
                  });
                  
                  setApiKeys(data);
                  setKeyStatuses(statuses);
                  
                  toast({
                    title: "تم التحديث",
                    description: "تم تحديث قائمة المفاتيح بنجاح",
                  });
                } catch (error) {
                  console.error("Error refreshing API keys:", error);
                  toast({
                    title: "خطأ",
                    description: "فشل في تحديث قائمة المفاتيح",
                    variant: "destructive"
                  });
                } finally {
                  setLoading(false);
                }
              }}
              size="sm"
            >
              <RefreshCcw className="h-4 w-4 mr-1" />
              تحديث القائمة
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="market">
              <TabsList className="mb-4 w-full grid grid-cols-3">
                <TabsTrigger value="market">أسعار السوق</TabsTrigger>
                <TabsTrigger value="crypto">العملات المشفرة</TabsTrigger>
                <TabsTrigger value="others">مفاتيح أخرى</TabsTrigger>
              </TabsList>
              
              {/* مفاتيح أسعار السوق */}
              <TabsContent value="market" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* TWELVEDATA_API_KEY */}
                  <ApiKeyCard 
                    apiKey={apiKeys.find(key => key.key === 'TWELVEDATA_API_KEY')}
                    keyName="TWELVEDATA_API_KEY"
                    info={API_KEYS_INFO['TWELVEDATA_API_KEY']}
                    onTest={testApiKey}
                    onEdit={editApiKey}
                    testing={testing}
                    renderStatus={renderKeyStatus}
                  />
                  
                  {/* PRIMARY_API_KEY */}
                  <ApiKeyCard 
                    apiKey={apiKeys.find(key => key.key === 'PRIMARY_API_KEY')}
                    keyName="PRIMARY_API_KEY"
                    info={API_KEYS_INFO['PRIMARY_API_KEY']}
                    onTest={testApiKey}
                    onEdit={editApiKey}
                    testing={testing}
                    renderStatus={renderKeyStatus}
                  />
                </div>

                {/* BACKUP_API_KEYS */}
                <ApiKeyCard 
                  apiKey={apiKeys.find(key => key.key === 'BACKUP_API_KEYS')}
                  keyName="BACKUP_API_KEYS"
                  info={API_KEYS_INFO['BACKUP_API_KEYS']}
                  onTest={testApiKey}
                  onEdit={editApiKey}
                  testing={testing}
                  renderStatus={renderKeyStatus}
                />
              </TabsContent>
              
              {/* مفاتيح العملات المشفرة */}
              <TabsContent value="crypto" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* BINANCE_API_KEY */}
                  <ApiKeyCard 
                    apiKey={apiKeys.find(key => key.key === 'BINANCE_API_KEY')}
                    keyName="BINANCE_API_KEY"
                    info={API_KEYS_INFO['BINANCE_API_KEY']}
                    onTest={testApiKey}
                    onEdit={editApiKey}
                    testing={testing}
                    renderStatus={renderKeyStatus}
                  />
                  
                  {/* BINANCE_SECRET_KEY */}
                  <ApiKeyCard 
                    apiKey={apiKeys.find(key => key.key === 'BINANCE_SECRET_KEY')}
                    keyName="BINANCE_SECRET_KEY"
                    info={API_KEYS_INFO['BINANCE_SECRET_KEY']}
                    onTest={testApiKey}
                    onEdit={editApiKey}
                    testing={testing}
                    renderStatus={renderKeyStatus}
                  />
                </div>
              </TabsContent>
              
              {/* مفاتيح أخرى */}
              <TabsContent value="others" className="space-y-4">
                {/* MARKET_API_KEY */}
                <ApiKeyCard 
                  apiKey={apiKeys.find(key => key.key === 'MARKET_API_KEY')}
                  keyName="MARKET_API_KEY"
                  info={API_KEYS_INFO['MARKET_API_KEY']}
                  onTest={testApiKey}
                  onEdit={editApiKey}
                  testing={testing}
                  renderStatus={renderKeyStatus}
                />
                
                {/* المفاتيح الأخرى غير المعرفة مسبقاً */}
                {apiKeys
                  .filter(key => 
                    !['TWELVEDATA_API_KEY', 'PRIMARY_API_KEY', 'BACKUP_API_KEYS', 
                      'BINANCE_API_KEY', 'BINANCE_SECRET_KEY', 'MARKET_API_KEY']
                    .includes(key.key)
                  ).length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-md font-medium mb-3">مفاتيح أخرى مضافة</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {apiKeys
                          .filter(key => 
                            !['TWELVEDATA_API_KEY', 'PRIMARY_API_KEY', 'BACKUP_API_KEYS', 
                              'BINANCE_API_KEY', 'BINANCE_SECRET_KEY', 'MARKET_API_KEY']
                            .includes(key.key)
                          )
                          .map(apiKey => (
                            <ApiKeyCard 
                              key={apiKey.key}
                              apiKey={apiKey}
                              onTest={testApiKey}
                              onEdit={editApiKey}
                              testing={testing}
                              renderStatus={renderKeyStatus}
                            />
                          ))
                        }
                      </div>
                    </div>
                  )
                }
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* قسم المعلومات والمساعدة */}
        <div className="mt-6">
          <Alert className="bg-primary/5 text-foreground border-border">
            <HelpCircle className="h-5 w-5" />
            <AlertTitle className="font-bold">معلومات عن مفاتيح API</AlertTitle>
            <AlertDescription className="mt-2">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="api-keys-info">
                  <AccordionTrigger className="text-sm font-medium">
                    شرح أنواع المفاتيح المستخدمة في النظام
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="text-sm mt-2 space-y-3">
                      <div className="mb-3 font-bold">مفاتيح أسعار السوق:</div>
                      <div className="space-y-2">
                        <div className="border-r-4 border-blue-300 pr-3 py-1">
                          <div className="font-semibold">TWELVEDATA_API_KEY</div>
                          <p className="text-sm text-muted-foreground">يستخدم لجلب بيانات أسعار الفوركس والأسهم بشكل مباشر من خدمة TwelveData</p>
                        </div>
                        
                        <div className="border-r-4 border-blue-300 pr-3 py-1">
                          <div className="font-semibold">PRIMARY_API_KEY</div>
                          <p className="text-sm text-muted-foreground">المفتاح الرئيسي لـ Alpha Vantage لجلب بيانات الأسهم والمؤشرات المالية</p>
                        </div>
                        
                        <div className="border-r-4 border-blue-300 pr-3 py-1">
                          <div className="font-semibold">BACKUP_API_KEYS</div>
                          <p className="text-sm text-muted-foreground">مجموعة مفاتيح احتياطية مفصولة بفواصل تستخدم في حالة استنفاد حدود الاستخدام للمفتاح الرئيسي</p>
                        </div>
                      </div>
                      
                      <div className="mb-3 font-bold mt-4">مفاتيح العملات المشفرة:</div>
                      <div className="space-y-2">
                        <div className="border-r-4 border-purple-300 pr-3 py-1">
                          <div className="font-semibold">BINANCE_API_KEY و BINANCE_SECRET_KEY</div>
                          <p className="text-sm text-muted-foreground">زوج مفاتيح للوصول إلى بيانات العملات المشفرة من منصة Binance، يجب توفيرهما معًا</p>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="how-to-get-keys">
                  <AccordionTrigger className="text-sm font-medium">
                    كيفية الحصول على مفاتيح API
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="text-sm space-y-2">
                      <div>
                        <p className="font-medium">TwelveData:</p>
                        <p className="text-muted-foreground">
                          قم بالتسجيل في <a href="https://twelvedata.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">موقع TwelveData</a> والحصول على مفتاح API مجاني
                        </p>
                      </div>
                      
                      <div>
                        <p className="font-medium">Alpha Vantage:</p>
                        <p className="text-muted-foreground">
                          قم بالتسجيل في <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">موقع Alpha Vantage</a> للحصول على مفتاح API
                        </p>
                      </div>
                      
                      <div>
                        <p className="font-medium">Binance:</p>
                        <p className="text-muted-foreground">
                          قم بالتسجيل في <a href="https://www.binance.com/en/my/settings/api-management" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">منصة Binance</a> وإنشاء مفاتيح API من إعدادات الحساب
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </AlertDescription>
          </Alert>
        </div>
      </div>
      
      {/* شريط التنقل السفلي */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/90 backdrop-blur-md z-50 pt-1.5 pb-2 mobile-navbar">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <Link href="/admin" className="flex flex-col items-center text-muted-foreground hover:text-primary mobile-nav-item">
            <DollarSign className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('admin_panel')}</span>
          </Link>

          <Link href="/admin/users" className="flex flex-col items-center text-muted-foreground hover:text-primary mobile-nav-item">
            <Users className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('users')}</span>
          </Link>

          <Link href="/admin/api-keys" className="flex flex-col items-center text-primary mobile-nav-item active">
            <KeyRound className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">مفاتيح API</span>
          </Link>

          <Link href="/settings" className="flex flex-col items-center text-muted-foreground hover:text-primary mobile-nav-item">
            <Settings className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('settings')}</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}