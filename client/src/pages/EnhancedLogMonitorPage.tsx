import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogCard } from "@/components/LogCard";
import { LogsHeader } from "@/components/LogsHeader";
import { SignalStatsDashboard } from "@/components/SignalStatsDashboard";
import { StickyFilterTabs } from "@/components/StickyFilterTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ChevronUp, Wifi, WifiOff, Activity, Zap, Users, Monitor } from "lucide-react";
import { t } from "@/lib/i18n";
import type { SystemLog } from "@shared/schema";

// Enhanced LogEntry type that handles nullable database fields
interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  source: string;
  message: string;
  meta?: string | null;
  // Enhanced fields (nullable from DB)
  actorType?: string | null;
  actorId?: string | null;
  actorDisplayName?: string | null;
  action?: string | null;
  result?: string | null;
  details?: string | null;
  // Legacy fields for backward compatibility
  userId?: number | null;
  username?: string | null;
  userDisplayName?: string | null;
  userAvatar?: string | null;
  createdAt: string;
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
        const metaMatch = log.meta && log.meta.toLowerCase().includes(searchLower);
        const userMatch = log.userDisplayName?.toLowerCase().includes(searchLower) || 
                          log.username?.toLowerCase().includes(searchLower);
        if (!messageMatch && !metaMatch && !userMatch) return false;
      }

      // فلتر التبويب - Enhanced logic
      if (selectedTab === 'user') {
        const isUser = log.actorType === 'user' || (log.userId && log.username);
        if (!isUser) return false;
      }
      if (selectedTab === 'system') {
        const isSystem = log.actorType === 'system' || (!log.userId && !log.username);
        if (!isSystem) return false;
      }

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
    // Handle meta field - keep as string to match LogEntry interface
    const metaString = typeof rawLog.meta === 'string' ? rawLog.meta : 
                      rawLog.meta ? JSON.stringify(rawLog.meta) : null;

    return {
      id: rawLog.id?.toString() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: rawLog.timestamp || rawLog.ts || rawLog.createdAt || new Date().toISOString(),
      level: (rawLog.level || 'info').toLowerCase(),
      source: rawLog.source || 'system',
      message: rawLog.message || JSON.stringify(rawLog),
      meta: metaString,
      // Enhanced fields (handle nulls from database)
      actorType: rawLog.actorType || null,
      actorId: rawLog.actorId || null,
      actorDisplayName: rawLog.actorDisplayName || null,
      action: rawLog.action || null,
      result: rawLog.result || null,
      details: rawLog.details || null,
      // Legacy fields for backward compatibility
      userId: rawLog.userId || null,
      username: rawLog.username || null,
      userDisplayName: rawLog.userDisplayName || null,
      userAvatar: rawLog.userAvatar || null,
      createdAt: rawLog.createdAt || new Date().toISOString(),
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

  // معالج فلترة السجلات من لوحة الإحصائيات
  const handleDashboardFilter = (filters: { level?: string; source?: string; userId?: number }) => {
    if (filters.level) {
      setSelectedLevel(filters.level);
    }
    if (filters.source) {
      setSelectedSource(filters.source);
    }
    // يمكن إضافة فلترة المستخدمين لاحقاً إذا لزم الأمر
    
    // إظهار toast للإشارة للفلترة
    toast({
      title: t('stats_updated'),
      description: `${t('click_to_filter')}: ${filters.level || filters.source || 'user'}`,
      duration: 2000
    });
  };

  // تحديد محتوى التبويبات المحسّن
  const getTabTitle = () => {
    switch (selectedTab) {
      case 'user':
        return t('user_activity_logs');
      case 'system':
        return t('system_activity_logs');
      default:
        return t('all_logs_activity');
    }
  };

  const getTabDescription = () => {
    switch (selectedTab) {
      case 'user':
        return t('showing_user_logs_desc');
      case 'system':
        return t('showing_system_logs_desc');
      default:
        return t('showing_all_logs_desc');
    }
  };

  const getTabIcon = () => {
    switch (selectedTab) {
      case 'user':
        return <div className="h-12 w-12 mx-auto text-muted-foreground flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 rounded-full"><Users className="h-6 w-6" /></div>;
      case 'system':
        return <div className="h-12 w-12 mx-auto text-muted-foreground flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-full"><Monitor className="h-6 w-6" /></div>;
      default:
        return <Activity className="h-12 w-12 mx-auto text-muted-foreground" />;
    }
  };

  const getEmptyStateTitle = () => {
    switch (selectedTab) {
      case 'user':
        return t('no_user_logs_found');
      case 'system':
        return t('no_system_logs_found');
      default:
        return t('no_logs_match_filters');
    }
  };

  const getEmptyStateDescription = () => {
    switch (selectedTab) {
      case 'user':
        return t('no_user_logs_found_desc');
      case 'system':
        return t('no_system_logs_found_desc');
      default:
        return searchTerm || selectedLevel || selectedSource 
          ? t('no_logs_match_filters')
          : t('loading_logs');
    }
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
        totalLogs={logs.length}
        filteredLogs={filteredLogs.length}
        onRefresh={handleRefresh}
        onDownload={handleDownload}
        onClearLogs={handleClearLogs}
        isConnected={isConnected}
      />

      {/* لوحة الإحصائيات التفاعلية للإشارات - قابلة للتحرك */}
      <div className="px-3 sm:px-4 py-4">
        <SignalStatsDashboard />
      </div>

      {/* تبويبات الفلترة اللاصقة */}
      <StickyFilterTabs
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        selectedLevel={selectedLevel}
        onLevelChange={setSelectedLevel}
        selectedSource={selectedSource}
        onSourceChange={setSelectedSource}
        totalLogs={logs.length}
        userLogsCount={logs.filter(l => (l.actorType === 'user') || (l.userId && l.username)).length}
        systemLogsCount={logs.filter(l => (l.actorType === 'system') || (!l.userId && !l.username)).length}
      />

      {/* قائمة السجلات مع نظام التبويبات المحسّن */}
      <div className="relative flex-1 px-3 sm:px-4">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center space-x-2 space-x-reverse">
              <Activity className="h-5 w-5 text-primary" />
              <span>{getTabTitle()}</span>
            </h3>
            <div className="text-sm text-muted-foreground">
              {getTabDescription()}
            </div>
          </div>
        </div>
        
        <ScrollArea ref={scrollRef} className="h-[calc(100vh-520px)] sm:h-[calc(100vh-500px)] xl:h-[calc(100vh-480px)]">
          <div className="pb-20 space-y-2 sm:space-y-3 xl:space-y-2">
            {filteredLogs.length === 0 ? (
              <Card className="border-dashed border-2 bg-muted/30 backdrop-blur-sm" data-testid="no-logs-card">
                <CardContent className="p-8 sm:p-12 text-center">
                  <div className="mb-4 opacity-50">
                    {getTabIcon()}
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">{getEmptyStateTitle()}</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {getEmptyStateDescription()}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-1.5 sm:space-y-2 xl:space-y-1.5" data-testid="logs-list">
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

                {/* معلومات السجل المحسنة */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/30">
                    <div className="text-sm font-medium text-muted-foreground mb-1">المستوى</div>
                    <div className="font-semibold text-foreground" data-testid="log-details-level">
                      {selectedLog.level.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/30">
                    <div className="text-sm font-medium text-muted-foreground mb-1">المصدر</div>
                    <div className="font-semibold text-foreground" data-testid="log-details-source">
                      {selectedLog.source}
                    </div>
                  </div>
                  
                  {/* نوع الحدث */}
                  {selectedLog.action && (
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">نوع الحدث</div>
                      <div className="font-semibold text-blue-800 dark:text-blue-200" data-testid="log-details-action">
                        {selectedLog.action}
                      </div>
                    </div>
                  )}
                  
                  {/* النتيجة */}
                  {selectedLog.result && (
                    <div className={`p-3 rounded-lg border ${
                      selectedLog.result === 'success' 
                        ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/50' 
                        : 'bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/50'
                    }`}>
                      <div className={`text-sm font-medium mb-1 ${
                        selectedLog.result === 'success' 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-red-700 dark:text-red-300'
                      }`}>النتيجة</div>
                      <div className={`font-semibold ${
                        selectedLog.result === 'success' 
                          ? 'text-green-800 dark:text-green-200' 
                          : 'text-red-800 dark:text-red-200'
                      }`} data-testid="log-details-result">
                        {selectedLog.result === 'success' ? 'نجح' : selectedLog.result === 'failure' ? 'فشل' : selectedLog.result}
                      </div>
                    </div>
                  )}
                  
                  {/* المستخدم أو النظام */}
                  {(selectedLog.actorDisplayName || selectedLog.userDisplayName || selectedLog.username) && (
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
                      <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                        {selectedLog.actorType === 'user' || selectedLog.userId ? 'المستخدم' : 'النظام'}
                      </div>
                      <div className="font-semibold text-emerald-800 dark:text-emerald-200" data-testid="log-details-actor">
                        {selectedLog.actorDisplayName || selectedLog.userDisplayName || selectedLog.username}
                      </div>
                    </div>
                  )}
                  
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/30">
                    <div className="text-sm font-medium text-muted-foreground mb-1">الوقت</div>
                    <div className="font-semibold text-foreground text-sm" data-testid="log-details-time">
                      {new Date(selectedLog.timestamp).toLocaleString('ar-SA', {
                        dateStyle: 'short',
                        timeStyle: 'medium'
                      })}
                    </div>
                  </div>
                </div>
                
                {/* تفاصيل إضافية من الحقل الجديد */}
                {selectedLog.details && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">تفاصيل إضافية</h4>
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                      <pre className="whitespace-pre-wrap text-sm font-mono text-blue-600 dark:text-blue-400" data-testid="log-details-additional">
                        {typeof selectedLog.details === 'string' ? selectedLog.details : JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}