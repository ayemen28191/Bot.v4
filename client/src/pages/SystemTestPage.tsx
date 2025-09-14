
import React, { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/layouts";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Play, 
  Database,
  Server,
  Settings,
  RefreshCw
} from "lucide-react";

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  message?: string;
  duration?: number;
}

export default function SystemTestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // إعداد الاختبارات
  const initializeTests = () => {
    setTests([
      { name: 'اختبار اتصال قاعدة البيانات', status: 'pending' },
      { name: 'اختبار APIs الأساسية', status: 'pending' },
      { name: 'اختبار مصادقة المستخدمين', status: 'pending' },
      { name: 'اختبار إدارة الخوادم', status: 'pending' },
      { name: 'اختبار سجلات النشر', status: 'pending' },
      { name: 'اختبار تحديثات النظام', status: 'pending' },
      { name: 'اختبار API Keys', status: 'pending' },
    ]);
  };

  useEffect(() => {
    initializeTests();
  }, []);

  // تحديث حالة اختبار معين
  const updateTestStatus = (index: number, status: TestResult['status'], message?: string, duration?: number) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, status, message, duration } : test
    ));
  };

  // تشغيل اختبار واحد
  const runSingleTest = async (testIndex: number) => {
    const testName = tests[testIndex].name;
    updateTestStatus(testIndex, 'running');
    const startTime = Date.now();

    try {
      let result;
      
      switch (testIndex) {
        case 0: // اختبار قاعدة البيانات
          result = await apiRequest('GET', '/api/deployment/servers');
          if (result.ok) {
            updateTestStatus(testIndex, 'success', 'اتصال قاعدة البيانات يعمل بشكل طبيعي', Date.now() - startTime);
          } else {
            throw new Error('فشل في الاتصال بقاعدة البيانات');
          }
          break;

        case 1: // اختبار APIs الأساسية
          const endpoints = ['/api/auth/me', '/api/deployment/logs', '/api/update/system-info'];
          for (const endpoint of endpoints) {
            const response = await apiRequest('GET', endpoint);
            if (!response.ok && response.status !== 401) {
              throw new Error(`فشل في API: ${endpoint}`);
            }
          }
          updateTestStatus(testIndex, 'success', 'جميع APIs الأساسية تعمل', Date.now() - startTime);
          break;

        case 2: // اختبار المصادقة
          const authResult = await apiRequest('GET', '/api/auth/me');
          if (authResult.ok) {
            updateTestStatus(testIndex, 'success', 'نظام المصادقة يعمل بشكل صحيح', Date.now() - startTime);
          } else {
            updateTestStatus(testIndex, 'failed', 'مشكلة في نظام المصادقة', Date.now() - startTime);
          }
          break;

        case 3: // اختبار إدارة الخوادم
          const serversResult = await apiRequest('GET', '/api/deployment/servers');
          if (serversResult.ok) {
            const servers = await serversResult.json();
            updateTestStatus(testIndex, 'success', `تم العثور على ${servers.length} خادم`, Date.now() - startTime);
          } else {
            throw new Error('فشل في جلب قائمة الخوادم');
          }
          break;

        case 4: // اختبار سجلات النشر
          const logsResult = await apiRequest('GET', '/api/deployment/logs');
          if (logsResult.ok) {
            const logs = await logsResult.json();
            updateTestStatus(testIndex, 'success', `تم العثور على ${logs.length} سجل نشر`, Date.now() - startTime);
          } else {
            throw new Error('فشل في جلب سجلات النشر');
          }
          break;

        case 5: // اختبار تحديثات النظام
          const updateResult = await apiRequest('GET', '/api/update/system-info');
          if (updateResult.ok) {
            updateTestStatus(testIndex, 'success', 'نظام التحديثات يعمل بشكل طبيعي', Date.now() - startTime);
          } else {
            throw new Error('مشكلة في نظام التحديثات');
          }
          break;

        case 6: // اختبار API Keys
          const keysResult = await apiRequest('GET', '/api/api-keys');
          if (keysResult.ok) {
            const keys = await keysResult.json();
            updateTestStatus(testIndex, 'success', `تم العثور على ${keys.length} مفتاح API`, Date.now() - startTime);
          } else {
            throw new Error('فشل في جلب مفاتيح API');
          }
          break;

        default:
          throw new Error('اختبار غير معروف');
      }
    } catch (error: any) {
      updateTestStatus(testIndex, 'failed', error.message, Date.now() - startTime);
    }
  };

  // تشغيل جميع الاختبارات
  const runAllTests = async () => {
    setIsRunning(true);
    initializeTests();

    for (let i = 0; i < tests.length; i++) {
      await runSingleTest(i);
      // توقف قصير بين الاختبارات
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
    
    // عرض نتيجة إجمالية
    const successCount = tests.filter(t => t.status === 'success').length;
    const totalCount = tests.length;
    
    toast({
      title: "اكتملت الاختبارات",
      description: `${successCount}/${totalCount} اختبار نجح`,
      variant: successCount === totalCount ? "default" : "destructive"
    });
  };

  // الحصول على أيقونة الحالة
  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <AdminLayout title="اختبار النظام">
      <div className="space-y-6">
        {/* عنوان الصفحة وأزرار التحكم */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary">اختبار النظام</h1>
            <p className="text-muted-foreground mt-2">فحص شامل لجميع وظائف النظام</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={initializeTests}
              variant="outline"
              disabled={isRunning}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              إعادة تعيين
            </Button>
            <Button 
              onClick={runAllTests}
              disabled={isRunning}
              className="bg-primary hover:bg-primary/90"
            >
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? 'جاري التشغيل...' : 'تشغيل جميع الاختبارات'}
            </Button>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المجموع</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tests.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">نجح</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {tests.filter(t => t.status === 'success').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">فشل</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {tests.filter(t => t.status === 'failed').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">قيد التشغيل</CardTitle>
              <RefreshCw className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {tests.filter(t => t.status === 'running').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* قائمة الاختبارات */}
        <Card>
          <CardHeader>
            <CardTitle>نتائج الاختبارات</CardTitle>
            <CardDescription>حالة كل اختبار ونتائجه</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tests.map((test, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <h3 className="font-medium">{test.name}</h3>
                      {test.message && (
                        <p className="text-sm text-muted-foreground">{test.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {test.duration && (
                      <span className="text-xs text-muted-foreground">
                        {test.duration}ms
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runSingleTest(index)}
                      disabled={test.status === 'running' || isRunning}
                    >
                      إعادة تشغيل
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
