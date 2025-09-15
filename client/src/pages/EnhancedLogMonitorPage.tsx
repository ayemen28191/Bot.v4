import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogCard } from "@/components/LogCard";
import { LogsHeader } from "@/components/LogsHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ChevronUp, Wifi, WifiOff } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  source: string;
  message: string;
  meta?: any;
  userId?: number;
  username?: string;
  userDisplayName?: string;
  userAvatar?: string;
}

export default function EnhancedLogMonitorPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const wsRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // جلب السجلات الأولية
  const { data: initialLogs, isLoading, refetch } = useQuery({
    queryKey: ['/api/logs'],
    queryFn: async () => {
      const response = await fetch('/api/logs?limit=200');
      if (!response.ok) {
        throw new Error('فشل في جلب السجلات');
      }
      return response.json();
    },
  });

  // تطبيق الفلاتر على السجلات
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // فلتر النص
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const messageMatch = log.message.toLowerCase().includes(searchLower);
        const metaMatch = log.meta && JSON.stringify(log.meta).toLowerCase().includes(searchLower);
        const userMatch = log.userDisplayName?.toLowerCase().includes(searchLower) || 
                          log.username?.toLowerCase().includes(searchLower);
        if (!messageMatch && !metaMatch && !userMatch) return false;
      }

      // فلتر التبويب
      if (selectedTab === 'user' && (!log.userId || !log.username)) return false;
      if (selectedTab === 'system' && (log.userId && log.username)) return false;

      // فلتر المستوى
      if (selectedLevel && log.level !== selectedLevel) return false;

      // فلتر المصدر
      if (selectedSource && log.source !== selectedSource) return false;

      return true;
    });
  }, [logs, searchTerm, selectedTab, selectedLevel, selectedSource]);

  // إحصائيات السجلات
  const stats = useMemo(() => {
    const errors = logs.filter(l => l.level === 'error').length;
    const warnings = logs.filter(l => l.level === 'warn').length;
    const info = logs.filter(l => l.level === 'info').length;
    const debug = logs.filter(l => l.level === 'debug').length;
    const users = new Set(logs.filter(l => l.userId).map(l => l.userId)).size;
    const sources = new Set(logs.map(l => l.source)).size;

    return { errors, warnings, info, debug, users, sources };
  }, [logs]);

  // تحويل السجلات الأولية إلى تنسيق LogEntry
  const normalizeLog = (rawLog: any): LogEntry => {
    return {
      id: rawLog.id?.toString() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: rawLog.timestamp || rawLog.ts || rawLog.createdAt || new Date().toISOString(),
      level: (rawLog.level || 'info').toLowerCase(),
      source: rawLog.source || 'system',
      message: rawLog.message || JSON.stringify(rawLog),
      meta: typeof rawLog.meta === 'string' ? JSON.parse(rawLog.meta || '{}') : (rawLog.meta || {}),
      userId: rawLog.userId,
      username: rawLog.username,
      userDisplayName: rawLog.userDisplayName,
      userAvatar: rawLog.userAvatar,
    };
  };

  // تحديد السجلات الأولية
  useEffect(() => {
    if (initialLogs && Array.isArray(initialLogs)) {
      const normalizedLogs = initialLogs.map(normalizeLog);
      setLogs(normalizedLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    }
  }, [initialLogs]);

  // إعداد WebSocket للسجلات المباشرة
  useEffect(() => {
    let socket: any = null;

    async function connectWebSocket() {
      try {
        const { io } = await import('socket.io-client');
        
        socket = io({
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        wsRef.current = socket;

        socket.on('connect', () => {
          setIsConnected(true);
          socket.emit('subscribe-logs');
        });

        socket.on('disconnect', () => {
          setIsConnected(false);
        });

        socket.on('new-log', (logData: any) => {
          const normalizedLog = normalizeLog(logData);
          setLogs(prev => {
            const exists = prev.find(log => log.id === normalizedLog.id);
            if (exists) return prev;
            
            return [normalizedLog, ...prev].slice(0, 1000);
          });
        });

        socket.on('recent-logs', (logsArray: any[]) => {
          if (Array.isArray(logsArray)) {
            const normalizedLogs = logsArray.map(normalizeLog);
            setLogs(prev => {
              const newLogs = [...prev];
              normalizedLogs.forEach(log => {
                if (!newLogs.find(l => l.id === log.id)) {
                  newLogs.push(log);
                }
              });
              return newLogs
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 1000);
            });
          }
        });

      } catch (error) {
        console.error('فشل في الاتصال بـ WebSocket:', error);
      }
    }

    connectWebSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // مراقبة التمرير لإظهار زر العودة للأعلى
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        setShowScrollTop(scrollRef.current.scrollTop > 200);
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleRefresh = () => {
    refetch();
    toast({
      title: "تحديث السجلات",
      description: "تم تحديث السجلات بنجاح",
      duration: 2000
    });
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { 
      type: "application/json" 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "تم التنزيل",
      description: "تم تنزيل السجلات بنجاح",
      duration: 2000
    });
  };

  const handleClearLogs = () => {
    if (confirm('هل أنت متأكد من مسح جميع السجلات من الذاكرة؟')) {
      setLogs([]);
      toast({
        title: "تم المسح",
        description: "تم مسح جميع السجلات من الذاكرة",
        duration: 2000
      });
    }
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل السجلات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="enhanced-log-monitor">
      <LogsHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        selectedLevel={selectedLevel}
        onLevelChange={setSelectedLevel}
        selectedSource={selectedSource}
        onSourceChange={setSelectedSource}
        totalLogs={logs.length}
        filteredLogs={filteredLogs.length}
        stats={stats}
        onRefresh={handleRefresh}
        onDownload={handleDownload}
        onClearLogs={handleClearLogs}
      />

      {/* حالة الاتصال */}
      <div className="px-4 mb-3">
        <Card className={`border-l-4 ${isConnected ? 'border-l-green-500 bg-green-50 dark:bg-green-950/20' : 'border-l-red-500 bg-red-50 dark:bg-red-950/20'}`}>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${isConnected ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {isConnected ? 'متصل - السجلات المباشرة' : 'غير متصل - السجلات المحفوظة فقط'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة السجلات */}
      <div className="relative flex-1">
        <ScrollArea ref={scrollRef} className="h-[calc(100vh-400px)]">
          <div className="px-4 pb-20">
            {filteredLogs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">لا توجد سجلات متطابقة مع الفلاتر المحددة</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2" data-testid="logs-list">
                {filteredLogs.map((log) => (
                  <LogCard
                    key={log.id}
                    log={log}
                    onClick={() => setSelectedLog(log)}
                    isSelected={selectedLog?.id === log.id}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* زر العودة للأعلى */}
        {showScrollTop && (
          <Button
            className="fixed bottom-20 right-4 rounded-full h-12 w-12 shadow-lg z-50"
            onClick={scrollToTop}
            data-testid="scroll-to-top"
          >
            <ChevronUp className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* نافذة تفاصيل السجل */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 space-x-reverse">
              <span>تفاصيل السجل</span>
              {selectedLog && (
                <div className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground">
                  <span>•</span>
                  <span>{new Date(selectedLog.timestamp).toLocaleString('ar-SA')}</span>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">الرسالة:</h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">{selectedLog.message}</pre>
                  </div>
                </div>

                {selectedLog.meta && Object.keys(selectedLog.meta).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">البيانات الإضافية:</h4>
                    <div className="p-3 bg-muted rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm">
                        {JSON.stringify(selectedLog.meta, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>المستوى:</strong> {selectedLog.level.toUpperCase()}
                  </div>
                  <div>
                    <strong>المصدر:</strong> {selectedLog.source}
                  </div>
                  {selectedLog.username && (
                    <div>
                      <strong>المستخدم:</strong> {selectedLog.userDisplayName || selectedLog.username}
                    </div>
                  )}
                  <div>
                    <strong>الوقت:</strong> {new Date(selectedLog.timestamp).toLocaleString('ar-SA')}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}