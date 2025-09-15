import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogCard } from "@/components/LogCard";
import { LogsHeader } from "@/components/LogsHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ChevronUp, Wifi, WifiOff, Activity, Zap } from "lucide-react";
import { t } from "@/lib/i18n";

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

  // Safe JSON.stringify that handles circular structures
  const safeStringify = (obj: any): string => {
    const seen = new WeakSet();
    try {
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      });
    } catch (error) {
      console.warn('Failed to stringify object:', error);
      return String(obj);
    }
  };

  // جلب السجلات الأولية
  const { data: initialLogs, isLoading, refetch } = useQuery({
    queryKey: ['/api/logs?limit=200'],
  });

  // تطبيق الفلاتر على السجلات
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // فلتر النص
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const messageMatch = log.message.toLowerCase().includes(searchLower);
        const metaMatch = log.meta && safeStringify(log.meta).toLowerCase().includes(searchLower);
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
    // Safe JSON parsing for meta field
    let meta = {};
    if (typeof rawLog.meta === 'string') {
      try {
        meta = JSON.parse(rawLog.meta || '{}');
      } catch (error) {
        console.warn('Failed to parse log meta JSON:', rawLog.meta, error);
        meta = { _rawMeta: rawLog.meta }; // Store raw meta as fallback
      }
    } else {
      meta = rawLog.meta || {};
    }

    return {
      id: rawLog.id?.toString() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: rawLog.timestamp || rawLog.ts || rawLog.createdAt || new Date().toISOString(),
      level: (rawLog.level || 'info').toLowerCase(),
      source: rawLog.source || 'system',
      message: rawLog.message || JSON.stringify(rawLog),
      meta,
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
        console.error(t('error_network_failure'), error);
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
      title: t('logs_refreshed'),
      description: t('logs_refreshed_desc'),
      duration: 2000
    });
  };

  const handleDownload = () => {
    const blob = new Blob([safeStringify(filteredLogs)], { 
      type: "application/json" 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: t('logs_downloaded'),
      description: t('logs_downloaded_desc'),
      duration: 2000
    });
  };

  const handleClearLogs = () => {
    if (confirm(t('clear_logs_confirm'))) {
      setLogs([]);
      toast({
        title: t('logs_cleared'),
        description: t('logs_cleared_desc'),
        duration: 2000
      });
    }
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/50">
        <div className="text-center p-8">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto"></div>
            <Activity className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
          </div>
          <h2 className="text-lg font-semibold mb-2" data-testid="loading-title">{t('loading_logs')}</h2>
          <p className="text-sm text-muted-foreground" data-testid="loading-subtitle">{t('please_wait')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30" data-testid="enhanced-log-monitor">
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

      {/* حالة الاتصال المحسّنة */}
      <div className="px-3 sm:px-4 mb-4">
        <Card className={`transition-all duration-500 border-l-4 backdrop-blur-sm ${
          isConnected 
            ? 'border-l-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30 shadow-emerald-100/50 dark:shadow-emerald-900/20' 
            : 'border-l-amber-500 bg-amber-50/80 dark:bg-amber-950/30 shadow-amber-100/50 dark:shadow-amber-900/20'
        } shadow-lg hover:shadow-xl`} data-testid="connection-status-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="relative">
                  {isConnected ? (
                    <>
                      <Wifi className="h-5 w-5 text-emerald-600 dark:text-emerald-400" data-testid="icon-connected" />
                      <div className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-400" data-testid="icon-disconnected" />
                      <div className="absolute -top-1 -right-1 h-2 w-2 bg-amber-500 rounded-full animate-pulse"></div>
                    </>
                  )}
                </div>
                <div>
                  <span className={`text-sm font-semibold block ${
                    isConnected 
                      ? 'text-emerald-800 dark:text-emerald-200' 
                      : 'text-amber-800 dark:text-amber-200'
                  }`} data-testid="connection-status-text">
                    {isConnected ? t('connected_live_logs') : t('disconnected_cached_logs')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t('connection_status')}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className={`h-4 w-4 ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground/50'}`} />
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  isConnected 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' 
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                }`}>
                  {isConnected ? t('online') : t('offline')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة السجلات المحسّنة */}
      <div className="relative flex-1 px-3 sm:px-4">
        <ScrollArea ref={scrollRef} className="h-[calc(100vh-420px)] sm:h-[calc(100vh-400px)]">
          <div className="pb-20 space-y-3">
            {filteredLogs.length === 0 ? (
              <Card className="border-dashed border-2 bg-muted/30 backdrop-blur-sm" data-testid="no-logs-card">
                <CardContent className="p-8 sm:p-12 text-center">
                  <div className="mb-4 opacity-50">
                    <Activity className="h-12 w-12 mx-auto text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">{t('no_logs_match_filters')}</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {searchTerm || selectedLevel || selectedSource 
                      ? t('no_logs_match_filters')
                      : t('loading_logs')
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 sm:space-y-3" data-testid="logs-list">
                {filteredLogs.map((log, index) => (
                  <div 
                    key={log.id} 
                    className="animate-in slide-in-from-top duration-200" 
                    style={{ animationDelay: `${Math.min(index * 20, 300)}ms` }}
                  >
                    <LogCard
                      log={log}
                      onClick={() => setSelectedLog(log)}
                      isSelected={selectedLog?.id === log.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* زر العودة للأعلى المحسّن */}
        {showScrollTop && (
          <Button
            className="fixed bottom-6 right-4 sm:bottom-8 sm:right-6 rounded-full h-12 w-12 sm:h-14 sm:w-14 shadow-xl hover:shadow-2xl z-50 bg-primary/90 hover:bg-primary backdrop-blur-sm transition-all duration-300 hover:scale-110 animate-in slide-in-from-bottom"
            onClick={scrollToTop}
            data-testid="scroll-to-top"
            title={t('scroll_to_top_tooltip')}
          >
            <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="sr-only">{t('scroll_to_top_tooltip')}</span>
          </Button>
        )}
      </div>

      {/* نافذة تفاصيل السجل المحسّنة */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden bg-background/95 backdrop-blur-sm border-2" data-testid="log-details-dialog">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3 space-x-reverse">
                <Activity className="h-5 w-5 text-primary" />
                <span className="text-lg font-bold">{t('log_details_title')}</span>
              </div>
              {selectedLog && (
                <div className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                  <span>•</span>
                  <span data-testid="log-details-timestamp">
                    {new Date(selectedLog.timestamp).toLocaleString('ar-SA')}
                  </span>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* الرسالة */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground flex items-center space-x-2 space-x-reverse">
                    <span>{t('log_message_label')}</span>
                  </h4>
                  <div className="p-4 bg-muted/50 rounded-lg border border-border/50 backdrop-blur-sm">
                    <pre className="whitespace-pre-wrap text-sm font-mono text-foreground/90" data-testid="log-details-message">
                      {selectedLog.message}
                    </pre>
                  </div>
                </div>

                {/* البيانات الإضافية */}
                {selectedLog.meta && Object.keys(selectedLog.meta).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">{t('log_metadata_label')}</h4>
                    <div className="p-4 bg-secondary/30 rounded-lg border border-border/50 backdrop-blur-sm">
                      <pre className="whitespace-pre-wrap text-sm font-mono text-foreground/80" data-testid="log-details-metadata">
                        {JSON.stringify(selectedLog.meta, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* معلومات السجل */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/30">
                    <div className="text-sm font-medium text-muted-foreground mb-1">{t('log_level_label')}</div>
                    <div className="font-semibold text-foreground" data-testid="log-details-level">
                      {selectedLog.level.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/30">
                    <div className="text-sm font-medium text-muted-foreground mb-1">{t('log_source_label')}</div>
                    <div className="font-semibold text-foreground" data-testid="log-details-source">
                      {selectedLog.source}
                    </div>
                  </div>
                  
                  {selectedLog.username && (
                    <div className="p-3 bg-muted/30 rounded-lg border border-border/30">
                      <div className="text-sm font-medium text-muted-foreground mb-1">{t('log_user_label')}</div>
                      <div className="font-semibold text-foreground" data-testid="log-details-user">
                        {selectedLog.userDisplayName || selectedLog.username}
                      </div>
                    </div>
                  )}
                  
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/30">
                    <div className="text-sm font-medium text-muted-foreground mb-1">{t('log_time_label')}</div>
                    <div className="font-semibold text-foreground text-sm" data-testid="log-details-time">
                      {new Date(selectedLog.timestamp).toLocaleString('ar-SA', {
                        dateStyle: 'short',
                        timeStyle: 'medium'
                      })}
                    </div>
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