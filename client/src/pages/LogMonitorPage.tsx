import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, Trash2, Download, Copy, Eye, Settings, List, Info, Menu, X } from "lucide-react";

type RawLog = {
  id?: string;
  ts: string; // ISO timestamp
  level: string; // info | warn | error | debug
  source?: string; // e.g., twelvedata, binance, price-service
  message: string;
  meta?: Record<string, any>;
};

export default function LogMonitorPage() {
  const [logs, setLogs] = useState<RawLog[]>([]);
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("logs");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const wsRef = useRef<any>(null);
  const tailRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  // connect Socket.IO with reconnection  
  useEffect(() => {
    let socket: any = null;
    let isDestroyed = false;

    async function connect() {
      if (isDestroyed) return;
      
      try {
        const { io } = await import('socket.io-client');
        
        socket = io({
          transports: ['websocket', 'polling'], // دعم للـ polling كـ fallback
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });
        
        wsRef.current = socket;

        socket.on('connect', () => {
          console.log('[LogMonitor] Socket.IO connected');
          // الاشتراك في قناة السجلات
          socket.emit('subscribe-logs');
        });

        socket.on('subscribed', (data: any) => {
          console.log('[LogMonitor] Subscribed to logs channel:', data.channel);
        });

        socket.on('recent-logs', (logsArray: any[]) => {
          console.log('[LogMonitor] Received recent logs:', logsArray.length);
          if (Array.isArray(logsArray)) {
            logsArray.forEach(logData => handleIncomingLog(logData));
          }
        });

        socket.on('new-log', (logData: any) => {
          if (paused) return; // ignore while paused
          console.log('[LogMonitor] Received new log:', logData);
          handleIncomingLog(logData);
        });

        socket.on('disconnect', (reason: string) => {
          console.warn('[LogMonitor] Socket.IO disconnected:', reason);
        });

        socket.on('connect_error', (error: any) => {
          console.error('[LogMonitor] Socket.IO connection error:', error);
        });

        socket.on('subscription-error', (data: any) => {
          console.error('[LogMonitor] Subscription error:', data.error);
          toast({
            title: "خطأ في الاشتراك",
            description: data.error || "فشل في الاشتراك في السجلات المباشرة",
            variant: "destructive"
          });
        });

      } catch (error) {
        console.error('[LogMonitor] Failed to load Socket.IO:', error);
        // سقوط للـ polling فقط إذا فشل Socket.IO
      }
    }

    connect();
    return () => {
      isDestroyed = true;
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [paused]);

  // تحميل جميع السجلات عند بدء التطبيق
  useEffect(() => {
    async function loadInitialLogs() {
      try {
        const res = await fetch('/api/logs?limit=100');
        if (res.ok) {
          const arr = await res.json();
          if (Array.isArray(arr) && arr.length) {
            // مسح السجلات السابقة وتحميل الجديدة
            setLogs([]);
            arr.forEach((r: any) => handleIncomingLog(r));
            setLastFetch(new Date().toISOString());
            console.log(`[LogMonitor] Loaded ${arr.length} initial logs`);
          }
        }
      } catch (err) {
        console.error('[LogMonitor] Failed to load initial logs:', err);
      }
    }

    loadInitialLogs();
  }, []);

  // fallback polling when websocket unavailable
  useEffect(() => {
    let polling = true;
    let timer: any;

    async function poll() {
      if (!polling || paused || !lastFetch) return;
      try {
        const since = lastFetch;
        const res = await fetch(`/api/logs?since=${encodeURIComponent(since)}&limit=50`);
        if (res.ok) {
          const arr = await res.json();
          if (Array.isArray(arr) && arr.length) {
            arr.forEach((r: any) => handleIncomingLog(r));
            setLastFetch(new Date().toISOString());
            console.log(`[LogMonitor] Polled ${arr.length} new logs`);
          }
        }
      } catch (err) {
        console.error('[LogMonitor] Polling error:', err);
      } finally {
        timer = setTimeout(poll, 5000); // كل 5 ثوان
      }
    }

    if (lastFetch) {
      poll();
    }
    return () => {
      polling = false;
      clearTimeout(timer);
    };
  }, [lastFetch, paused]);

  function handleIncomingLog(like: any) {
    const normalized: RawLog = {
      id: like.id ? like.id.toString() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      ts: like.timestamp || like.ts || like.createdAt || new Date().toISOString(),
      level: (like.level || like.levelname || "info").toLowerCase(),
      source: like.source || (like.meta && like.meta.source) || "system",
      message: typeof like === "string" ? like : like.message || JSON.stringify(like),
      meta: typeof like.meta === 'string' ? JSON.parse(like.meta || '{}') : (like.meta || like.details || {}),
    };

    setLogs((prev) => {
      // تأكد من عدم وجود السجل مسبقاً
      const exists = prev.find(log => log.id === normalized.id);
      if (exists) return prev;
      
      // إضافة السجل الجديد وترتيب حسب الوقت
      const next = [...prev, normalized]
        .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
        .slice(0, 1000); // الاحتفاظ بآخر 1000 سجل
      return next;
    });

    if (autoScroll && tailRef.current) {
      // wait next tick then scroll
      setTimeout(() => tailRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  // derived filtered logs
  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterLevel && l.level !== filterLevel) return false;
      if (filterSource && l.source !== filterSource) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(l.message.toLowerCase().includes(s) || JSON.stringify(l.meta).toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [logs, filterLevel, filterSource, search]);

  function clearLogs() {
    setLogs([]);
    toast({
      title: "تم مسح السجلات",
      description: "تم مسح جميع السجلات من الذاكرة"
    });
  }

  function downloadLogs() {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "تم تنزيل السجلات",
      description: "تم تنزيل السجلات كملف JSON"
    });
  }

  // explanation heuristic
  function explainLog(log: RawLog) {
    const msg = log.message || "";
    // rules (Arabic short explanations)
    if (/status code 451|451/.test(msg) || /restricted location/.test(msg)) return "خطأ حظر جغرافي: الخدمة غير متاحة من هذه المنطقة؛ قد تحتاج لاستخدام proxy أو مصدر بديل.";
    if (/429|rate limit|rate_limit/.test(msg) || /exceeded/.test(msg)) return "تجاوز حد الطلبات (Rate limit). يمكن تدوير المفاتيح أو الانتظار/تقليل التكرار.";
    if (/timeout|ETIMEDOUT|timeout/.test(msg)) return "انتهت المهلة (timeout). حاول زيادة قيمة timeout أو التحقق من اتصال الشبكة.";
    if (/Deserializing user/.test(msg)) return "تحميل بيانات المستخدم من قاعدة البيانات (Deserializing user). تأكد من صحة الجلسة وبيانات المستخدم.";
    if (/no data|لا توجد بيانات/.test(msg) || /no data available/.test(msg)) return "البيانات التاريخية غير متاحة لهذه المؤشرات — قد يحتاج المورد لمفتاح صالح أو فترة زمنية أكبر.";
    if (/AxiosError/.test(msg)) return "خطأ في طلب HTTP عبر axios — راجع الاستجابة و headers و status code.";
    // fallback: show short summary
    return `سجل ${log.level.toUpperCase()} من ${log.source || 'unknown'} — بداية الرسالة: "${msg.slice(0, 120)}"`;
  }

  // collect sources and levels
  const sources = useMemo(() => Array.from(new Set(logs.map((l) => l.source || 'unknown')).values()), [logs]);
  const levels = ['error', 'warn', 'info', 'debug'];

  // selected log
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = logs.find((l) => l.id === selectedId) || null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "تم النسخ",
      description: "تم نسخ النص إلى الحافظة"
    });
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'secondary';
      case 'info':
        return 'default';
      case 'debug':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" data-testid="log-monitor-page">
      {/* شريط علوي مثل تطبيقات الهاتف */}
      <header className="bg-card shadow-sm border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div>
            <h1 className="text-lg font-bold" data-testid="text-page-title">مراقب السجلات</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Bot.v4 System</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant={paused ? "default" : "ghost"} 
            onClick={() => setPaused((p) => !p)}
            data-testid="button-toggle-pause"
            size="sm"
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            <span className="hidden sm:inline mr-2">{paused ? 'استئناف' : 'إيقاف'}</span>
          </Button>
          <div className="text-xs text-muted-foreground">
            <span className="hidden sm:inline">السجلات: </span>
            <strong data-testid="text-total-logs">{logs.length}</strong>
          </div>
        </div>
      </header>

      {/* قائمة الهاتف المحمول */}
      {showMobileMenu && (
        <div className="md:hidden bg-card border-b px-4 py-3 space-y-2">
          <Button 
            variant="outline" 
            onClick={() => setAutoScroll((s) => !s)}
            data-testid="button-toggle-autoscroll"
            size="sm"
            className="w-full justify-start"
          >
            <Settings className="h-4 w-4 mr-2" />
            {autoScroll ? 'توقيف التمرير' : 'تمكين التمرير'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => clearLogs()}
            data-testid="button-clear-logs"
            size="sm"
            className="w-full justify-start"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            مسح السجلات
          </Button>
          <Button 
            variant="outline" 
            onClick={() => downloadLogs()}
            data-testid="button-download-logs"
            size="sm"
            className="w-full justify-start"
          >
            <Download className="h-4 w-4 mr-2" />
            تنزيل JSON
          </Button>
        </div>
      )}

      {/* المحتوى الرئيسي مع نظام التبويبات */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          {/* نظام التبويبات */}
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-4 md:hidden">
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              السجلات
            </TabsTrigger>
            <TabsTrigger value="controls" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              التحكم
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              التفاصيل
            </TabsTrigger>
          </TabsList>

          {/* شاشات سطح المكتب */}
          <div className="hidden md:flex flex-1 gap-4 p-4">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">عناصر التحكم</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">فلتر المستوى</label>
                  <Select value={filterLevel || 'all'} onValueChange={(value) => setFilterLevel(value === 'all' ? null : value)}>
                    <SelectTrigger data-testid="select-filter-level">
                      <SelectValue placeholder="كل المستويات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل المستويات</SelectItem>
                      {levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">فلتر المصدر</label>
                  <Select value={filterSource || 'all'} onValueChange={(value) => setFilterSource(value === 'all' ? null : value)}>
                    <SelectTrigger data-testid="select-filter-source">
                      <SelectValue placeholder="كل المصادر" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل المصادر</SelectItem>
                      {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">بحث</label>
                  <Input 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    placeholder="بحث بالنص أو meta"
                    data-testid="input-search"
                  />
                </div>

                <Separator />

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>المجموع: <strong data-testid="text-total-logs">{logs.length}</strong></p>
                  <p>المفلترة: <strong data-testid="text-filtered-logs">{filtered.length}</strong></p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">مصادر معروفة</h3>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {sources.slice(0, 20).map(s => (
                      <div key={s} className="text-sm truncate" data-testid={`text-source-${s}`}>• {s}</div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-[2]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">سجل الأحداث</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    عرض: <strong data-testid="text-displaying-count">{filtered.length}</strong>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-96 overflow-auto border rounded-lg p-4 bg-muted/20" data-testid="log-entries-container">
                  <div className="space-y-2">
                    {filtered.map((l) => (
                      <div 
                        key={l.id} 
                        onClick={() => setSelectedId(l.id || null)} 
                        className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                          selectedId === l.id ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'
                        }`}
                        data-testid={`log-entry-${l.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">
                              {new Date(l.ts).toLocaleString()}
                            </div>
                            <div className="flex gap-2 items-center mb-1">
                              <Badge variant={getLevelBadgeVariant(l.level)} className="text-xs">
                                {l.level}
                              </Badge>
                              <div className="text-sm font-medium truncate">{l.message}</div>
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {l.source} • {l.meta && JSON.stringify(l.meta).slice(0,120)}
                            </div>
                          </div>
                          <div className="ml-2 text-xs text-muted-foreground flex-shrink-0">
                            {l.source}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={tailRef} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">تفاصيل وتفسير</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selected ? (
                  <div className="space-y-4" data-testid="log-details-panel">
                    <div className="text-xs text-muted-foreground">
                      {new Date(selected.ts).toLocaleString()}
                    </div>
                    
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm font-semibold mb-1">الرسالة</div>
                      <pre className="text-xs whitespace-pre-wrap break-words" data-testid="text-selected-message">{selected.message}</pre>
                    </div>

                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm font-semibold mb-1">البيانات الإضافية</div>
                      <pre className="text-xs whitespace-pre-wrap break-words" data-testid="text-selected-meta">{JSON.stringify(selected.meta, null, 2)}</pre>
                    </div>

                    <div className="p-3 bg-card rounded-lg border-l-4 border-primary">
                      <div className="text-sm font-semibold mb-1">تفسير تلقائي</div>
                      <div className="text-sm text-muted-foreground break-words" data-testid="text-selected-explanation">{explainLog(selected)}</div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(selected.message)}
                        data-testid="button-copy-message"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        نسخ الرسالة
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const raw = JSON.stringify(selected, null, 2);
                          copyToClipboard(raw);
                        }}
                        data-testid="button-copy-raw"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        نسخ RAW
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground" data-testid="text-no-selection">
                    اختر سطرًا من السجل لعرض التفاصيل وشرح الإجراء المقترح.
                  </div>
                )}

                <Separator className="my-4" />

                <div>
                  <h3 className="font-medium mb-2">نصائح التشغيل</h3>
                  <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1 break-words">
                    <li>تأكد من عدم طباعة المفاتيح السرية في السجلات.</li>
                    <li>ابحث عن 429 أو 451 أو timeout في السجلات.</li>
                    <li>عند ظهور 451: قد تحتاج لاستخدام proxy أو مصدر بديل.</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* تبويبات الهاتف المحمول */}
          <TabsContent value="logs" className="flex-1 md:hidden p-4">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">سجل الأحداث</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    <strong data-testid="text-displaying-count-mobile">{filtered.length}</strong>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-full">
                <div className="h-96 overflow-auto border rounded-lg p-2 bg-muted/20" data-testid="log-entries-container-mobile">
                  <div className="space-y-2">
                    {filtered.map((l) => (
                      <div 
                        key={l.id} 
                        onClick={() => {
                          setSelectedId(l.id || null);
                          setSelectedTab("details");
                        }} 
                        className={`p-2 rounded-lg cursor-pointer transition-colors border ${
                          selectedId === l.id ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'
                        }`}
                        data-testid={`log-entry-mobile-${l.id}`}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="text-xs text-muted-foreground">
                            {new Date(l.ts).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getLevelBadgeVariant(l.level)} className="text-xs">
                              {l.level}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{l.source}</span>
                          </div>
                          <div className="text-sm font-medium break-words">{l.message}</div>
                        </div>
                      </div>
                    ))}
                    <div ref={tailRef} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="controls" className="flex-1 md:hidden p-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">عناصر التحكم والفلاتر</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">فلتر المستوى</label>
                  <Select value={filterLevel || 'all'} onValueChange={(value) => setFilterLevel(value === 'all' ? null : value)}>
                    <SelectTrigger data-testid="select-filter-level-mobile">
                      <SelectValue placeholder="كل المستويات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل المستويات</SelectItem>
                      {levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">فلتر المصدر</label>
                  <Select value={filterSource || 'all'} onValueChange={(value) => setFilterSource(value === 'all' ? null : value)}>
                    <SelectTrigger data-testid="select-filter-source-mobile">
                      <SelectValue placeholder="كل المصادر" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل المصادر</SelectItem>
                      {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">بحث</label>
                  <Input 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    placeholder="بحث بالنص أو meta"
                    data-testid="input-search-mobile"
                  />
                </div>

                <Separator />

                <div className="text-sm text-muted-foreground space-y-2">
                  <div className="flex justify-between">
                    <span>إجمالي السجلات:</span>
                    <strong data-testid="text-total-logs-mobile">{logs.length}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>السجلات المفلترة:</span>
                    <strong data-testid="text-filtered-logs-mobile">{filtered.length}</strong>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">مصادر السجلات</h3>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {sources.slice(0, 10).map(s => (
                      <div key={s} className="text-sm break-words" data-testid={`text-source-mobile-${s}`}>• {s}</div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="flex-1 md:hidden p-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">تفاصيل السجل</CardTitle>
              </CardHeader>
              <CardContent>
                {selected ? (
                  <div className="space-y-4" data-testid="log-details-panel-mobile">
                    <div className="text-xs text-muted-foreground">
                      {new Date(selected.ts).toLocaleString()}
                    </div>
                    
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm font-semibold mb-2">الرسالة</div>
                      <pre className="text-xs whitespace-pre-wrap break-words" data-testid="text-selected-message-mobile">{selected.message}</pre>
                    </div>

                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm font-semibold mb-2">البيانات الإضافية</div>
                      <pre className="text-xs whitespace-pre-wrap break-words" data-testid="text-selected-meta-mobile">{JSON.stringify(selected.meta, null, 2)}</pre>
                    </div>

                    <div className="p-3 bg-card rounded-lg border-l-4 border-primary">
                      <div className="text-sm font-semibold mb-2">تفسير تلقائي</div>
                      <div className="text-sm text-muted-foreground break-words" data-testid="text-selected-explanation-mobile">{explainLog(selected)}</div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => copyToClipboard(selected.message)}
                        data-testid="button-copy-message-mobile"
                        className="w-full justify-start"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        نسخ الرسالة
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          const raw = JSON.stringify(selected, null, 2);
                          copyToClipboard(raw);
                        }}
                        data-testid="button-copy-raw-mobile"
                        className="w-full justify-start"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        نسخ البيانات الخام
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <div className="text-sm text-muted-foreground" data-testid="text-no-selection-mobile">
                      اختر سجل من التبويب "السجلات" لعرض التفاصيل
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* شريط سفلي مثل تطبيقات الهاتف */}
      <footer className="bg-card border-t px-4 py-2 md:py-3 mt-auto">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Bot.v4 Log Monitor
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => setAutoScroll((s) => !s)}
                data-testid="button-toggle-autoscroll-footer"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                {autoScroll ? 'توقيف التمرير' : 'تمكين التمرير'}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => clearLogs()}
                data-testid="button-clear-logs-footer"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                مسح
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => downloadLogs()}
                data-testid="button-download-logs-footer"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                تنزيل
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              آخر تحديث: {new Date().toLocaleTimeString('ar')}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}