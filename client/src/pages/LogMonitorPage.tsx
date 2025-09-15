import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, Trash2, Download, Copy, Eye } from "lucide-react";

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
  const wsRef = useRef<WebSocket | null>(null);
  const tailRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  // connect WebSocket with reconnection
  useEffect(() => {
    let closedByUser = false;
    let retry = 0;

    function connect() {
      const wsUrl = import.meta.env.VITE_WS_LOGS_URL || `ws://${window.location.host}/ws/logs`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[LogMonitor] WS connected');
        retry = 0;
      };

      ws.onmessage = (ev) => {
        if (paused) return; // ignore while paused
        try {
          const data = JSON.parse(ev.data);
          handleIncomingLog(data);
        } catch (err) {
          // if not JSON, wrap as message
          handleIncomingLog({ ts: new Date().toISOString(), level: "info", message: String(ev.data) });
        }
      };

      ws.onclose = () => {
        if (closedByUser) return;
        const timeout = Math.min(30000, 1000 * Math.pow(2, retry));
        retry++;
        console.warn(`[LogMonitor] WS closed, reconnect in ${timeout}ms`);
        setTimeout(connect, timeout);
      };

      ws.onerror = (e) => {
        console.error('[LogMonitor] WS error', e);
        ws.close();
      };
    }

    connect();
    return () => {
      closedByUser = true;
      wsRef.current?.close();
    };
  }, [paused]);

  // fallback polling when websocket unavailable
  useEffect(() => {
    let polling = true;
    let timer: any;

    async function poll() {
      if (!polling || paused) return;
      try {
        const since = lastFetch || new Date(Date.now() - 1000 * 60).toISOString();
        const res = await fetch(`/api/logs?since=${encodeURIComponent(since)}&limit=200`);
        if (res.ok) {
          const arr = await res.json();
          if (Array.isArray(arr) && arr.length) {
            arr.forEach((r: any) => handleIncomingLog(r));
            setLastFetch(new Date().toISOString());
          }
        }
      } catch (err) {
        // ignore polling errors
      } finally {
        timer = setTimeout(poll, 3000);
      }
    }

    poll();
    return () => {
      polling = false;
      clearTimeout(timer);
    };
  }, [lastFetch, paused]);

  function handleIncomingLog(like: any) {
    const normalized: RawLog = {
      id: like.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      ts: like.ts || new Date().toISOString(),
      level: (like.level || like.levelname || "info").toLowerCase(),
      source: like.source || (like.meta && like.meta.source) || "unknown",
      message: typeof like === "string" ? like : like.message || JSON.stringify(like),
      meta: like.meta || like.details || {},
    };

    setLogs((prev) => {
      const next = [...prev, normalized].slice(-2000); // cap memory
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
    <div className="min-h-screen p-6 bg-background text-foreground" data-testid="log-monitor-page">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">مراقب السجلات</h1>
            <p className="text-muted-foreground mt-1">مراقبة السجلات المباشرة لنظام Bot.v4</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={paused ? "default" : "secondary"} 
              onClick={() => setPaused((p) => !p)}
              data-testid="button-toggle-pause"
            >
              {paused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
              {paused ? 'استئناف' : 'إيقاف'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setAutoScroll((s) => !s)}
              data-testid="button-toggle-autoscroll"
            >
              {autoScroll ? 'توقيف التمرير' : 'تمكين التمرير'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => clearLogs()}
              data-testid="button-clear-logs"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              مسح
            </Button>
            <Button 
              variant="outline" 
              onClick={() => downloadLogs()}
              data-testid="button-download-logs"
            >
              <Download className="h-4 w-4 mr-2" />
              تنزيل JSON
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-4 gap-6">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">عناصر التحكم</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">فلتر المستوى</label>
                <Select value={filterLevel || ''} onValueChange={(value) => setFilterLevel(value === '' ? null : value)}>
                  <SelectTrigger data-testid="select-filter-level">
                    <SelectValue placeholder="كل المستويات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">كل المستويات</SelectItem>
                    {levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">فلتر المصدر</label>
                <Select value={filterSource || ''} onValueChange={(value) => setFilterSource(value === '' ? null : value)}>
                  <SelectTrigger data-testid="select-filter-source">
                    <SelectValue placeholder="كل المصادر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">كل المصادر</SelectItem>
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

          <Card className="col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">سجل الأحداث</CardTitle>
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

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">تفاصيل وتفسير</CardTitle>
            </CardHeader>
            <CardContent>
              {selected ? (
                <div className="space-y-4" data-testid="log-details-panel">
                  <div className="text-xs text-muted-foreground">
                    {new Date(selected.ts).toLocaleString()}
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm font-semibold mb-1">الرسالة</div>
                    <pre className="text-xs whitespace-pre-wrap" data-testid="text-selected-message">{selected.message}</pre>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm font-semibold mb-1">البيانات الإضافية</div>
                    <pre className="text-xs whitespace-pre-wrap" data-testid="text-selected-meta">{JSON.stringify(selected.meta, null, 2)}</pre>
                  </div>

                  <div className="p-3 bg-card rounded-lg border-l-4 border-primary">
                    <div className="text-sm font-semibold mb-1">تفسير تلقائي</div>
                    <div className="text-sm text-muted-foreground" data-testid="text-selected-explanation">{explainLog(selected)}</div>
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
                <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                  <li>تأكد من عدم طباعة المفاتيح السرية في السجلات.</li>
                  <li>ابحث عن 429 أو 451 أو timeout في السجلات.</li>
                  <li>عند ظهور 451: قد تحتاج لاستخدام proxy أو مصدر بديل.</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        <footer className="mt-6 text-xs text-muted-foreground">
          تم الإنشاء لعرض سجل تطبيق Bot.v4 — يمكنك تعديل قواعد التفسير داخل الدالة <code>explainLog</code>.
        </footer>
      </div>
    </div>
  );
}