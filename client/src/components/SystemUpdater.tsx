import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import type { QueryFunctionContext } from '@tanstack/react-query';
import { AlertCircle, Clock, RefreshCcw, CheckCircle2, XCircle, History, Server, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SystemInfo {
  nodeVersion: string;
  platform: string;
  memoryUsage: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
  };
  uptime: string;
  lastUpdate: {
    date: string;
    version: string;
  };
}

interface UpdateLog {
  timestamp: string;
  version: string;
  message: string;
}

export function SystemUpdater() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateLogs, setUpdateLogs] = useState<UpdateLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  // جلب معلومات النظام
  const fetchSystemInfo = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching system info...');
      const response = await fetch('/api/update/system-info', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('System info response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('System info data:', data);
      setSystemInfo(data);
      setUpdateError(null);
    } catch (error: any) {
      console.error('Error fetching system info:', error);
      setUpdateError(error.message || 'فشل في جلب معلومات النظام');
      toast({
        title: 'خطأ',
        description: 'فشل في جلب معلومات النظام',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // جلب سجلات التحديث
  const fetchUpdateLogs = async () => {
    try {
      console.log('Fetching update logs...');
      const response = await fetch('/api/update/logs', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('Update logs response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from logs:', errorText);
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Update logs data:', data);
      if (data.logs) {
        setUpdateLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching update logs:', error);
    }
  };

  // بدء عملية التحديث
  const startUpdateProcess = async () => {
    if (isUpdating) return;

    // تأكيد من المستخدم
    if (!window.confirm('هل أنت متأكد أنك تريد بدء عملية تحديث النظام؟ قد يتطلب ذلك إعادة تشغيل الخادم.')) {
      return;
    }

    setIsUpdating(true);
    setUpdateSuccess(null);
    setUpdateError(null);

    try {
      const response = await fetch('/api/update/run-update', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setUpdateSuccess(data.message || 'بدأت عملية التحديث بنجاح');
      toast({
        title: 'نجاح',
        description: 'بدأت عملية التحديث بنجاح',
        variant: 'default'
      });
      
      // جلب المعلومات مرة أخرى بعد 5 ثوانٍ
      setTimeout(() => {
        fetchSystemInfo();
        fetchUpdateLogs();
      }, 5000);
    } catch (error: any) {
      setUpdateError(error.message || 'فشل في بدء عملية التحديث');
      toast({
        title: 'خطأ',
        description: 'فشل في بدء عملية التحديث',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // جلب المعلومات عند التحميل
  useEffect(() => {
    fetchSystemInfo();
    fetchUpdateLogs();
  }, []);

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'غير متوفر') return 'غير متوفر';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ar-SA');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-6 w-6" />
            <span>حالة النظام والتحديثات</span>
          </CardTitle>
          <CardDescription>عرض معلومات النظام وإدارة التحديثات</CardDescription>
        </CardHeader>
        
        <CardContent>
          {updateError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>خطأ</AlertTitle>
              <AlertDescription>{updateError}</AlertDescription>
            </Alert>
          )}
          
          {updateSuccess && (
            <Alert className="mb-4 bg-green-50 border-green-500/50 text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>نجاح</AlertTitle>
              <AlertDescription>{updateSuccess}</AlertDescription>
            </Alert>
          )}
          
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="mr-2">جاري تحميل معلومات النظام...</span>
            </div>
          ) : systemInfo ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-secondary/20 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground">إصدار Node.js</div>
                  <div className="font-medium">{systemInfo.nodeVersion}</div>
                </div>
                
                <div className="bg-secondary/20 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground">نظام التشغيل</div>
                  <div className="font-medium">{systemInfo.platform}</div>
                </div>
                
                <div className="bg-secondary/20 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground">الذاكرة المستخدمة</div>
                  <div className="font-medium">
                    {systemInfo.memoryUsage.heapUsed} / {systemInfo.memoryUsage.heapTotal}
                  </div>
                </div>
                
                <div className="bg-secondary/20 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground">وقت التشغيل</div>
                  <div className="font-medium">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 ml-1" />
                      {systemInfo.uptime}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-primary/5 p-4 rounded-md border border-primary/20">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-sm text-primary">آخر تحديث للنظام</h3>
                    <div className="mt-1">
                      <Badge variant="outline" className="ml-2">
                        <span className="ml-1">النسخة:</span>
                        {systemInfo.lastUpdate.version || 'غير متوفر'}
                      </Badge>
                      <Badge variant="outline">
                        <span className="ml-1">التاريخ:</span>
                        {formatDate(systemInfo.lastUpdate.date)}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => setShowLogs(true)}
                    variant="ghost"
                  >
                    <History className="h-4 w-4 ml-1" />
                    سجل التحديثات
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>معلومات غير متوفرة</AlertTitle>
              <AlertDescription>
                لا يمكن الحصول على معلومات النظام حالياً
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            onClick={fetchSystemInfo} 
            variant="outline" 
            disabled={isLoading}
          >
            <RefreshCcw className={`h-4 w-4 ml-1 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث المعلومات
          </Button>
          
          <Button 
            onClick={startUpdateProcess} 
            disabled={isUpdating || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isUpdating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-1"></div>
                جاري التحديث...
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 ml-1" />
                تحديث النظام
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* نافذة سجل التحديثات */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <History className="h-5 w-5 ml-2" />
              سجل التحديثات
            </DialogTitle>
            <DialogDescription>
              عرض تاريخ التحديثات السابقة للنظام
            </DialogDescription>
          </DialogHeader>
          
          {updateLogs.length > 0 ? (
            <ScrollArea className="h-[400px] rounded-md border p-4">
              <div className="space-y-4">
                {updateLogs.map((log, index) => (
                  <div key={index} className="pb-3">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center">
                        {log.message.includes('نجاح') || log.message.includes('اكتملت') ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 ml-1" />
                        ) : log.message.includes('فشل') || log.message.includes('خطأ') ? (
                          <XCircle className="h-4 w-4 text-red-500 ml-1" />
                        ) : (
                          <Activity className="h-4 w-4 text-blue-500 ml-1" />
                        )}
                        <span className="font-semibold">{formatDate(log.timestamp)}</span>
                      </div>
                      <Badge variant="outline" className="ml-1">
                        {log.version}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mr-6">
                      {log.message}
                    </p>
                    {index < updateLogs.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              لا توجد سجلات تحديث متاحة
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SystemUpdater;