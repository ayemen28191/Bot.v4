import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal, Clock, User, Monitor, AlertTriangle, Info, CheckCircle, XCircle, Activity, Settings, LogIn, LogOut, Signal, Edit, MessageCircle, Power, PowerOff, Copy, Search, MapPin, Smartphone, Globe, Hash, Calendar, TrendingUp, Wifi } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";

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
  // Request tracking fields
  requestId?: string | null;
  sessionId?: string | null;
  combinedTrackingId?: string | null;
  // Cumulative counter fields
  previousTotal?: number | null;
  dailyTotal?: number | null;
  monthlyTotal?: number | null;
  // Legacy fields for backward compatibility
  userId?: number | null;
  username?: string | null;
  userDisplayName?: string | null;
  userAvatar?: string | null;
}

interface LogCardProps {
  log: LogEntry;
  onClick?: () => void;
  isSelected?: boolean;
  onSearch?: (filters: { userId?: number; requestId?: string; sessionId?: string }) => void;
}

// دالة لتوليد الألوان للمستخدمين والمصادر
const generateColor = (str: string): string => {
  const colors = [
    'hsl(142, 76%, 36%)', // أخضر
    'hsl(221, 83%, 53%)', // أزرق
    'hsl(262, 83%, 58%)', // بنفسجي
    'hsl(346, 87%, 43%)', // أحمر
    'hsl(33, 100%, 50%)', // برتقالي
    'hsl(280, 100%, 70%)', // وردي
    'hsl(200, 100%, 50%)', // سماوي
    'hsl(120, 100%, 25%)', // أخضر داكن
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// دالة للحصول على الأيقونة المناسبة للمستوى
const getLevelIcon = (level: string) => {
  switch (level.toLowerCase()) {
    case 'error':
      return <AlertTriangle className="h-3 w-3 text-red-500" />;
    case 'warn':
      return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
    case 'info':
      return <Info className="h-3 w-3 text-blue-500" />;
    case 'debug':
      return <Monitor className="h-3 w-3 text-gray-500" />;
    default:
      return <Info className="h-3 w-3 text-gray-400" />;
  }
};

// دالة للحصول على أيقونة الإجراء
const getActionIcon = (action?: string | null) => {
  if (!action) return <Activity className="h-3 w-3 text-muted-foreground" />;

  switch (action.toLowerCase()) {
    case 'login':
      return <LogIn className="h-3 w-3 text-green-500" />;
    case 'logout':
      return <LogOut className="h-3 w-3 text-orange-500" />;
    case 'signal_request':
      return <Signal className="h-3 w-3 text-blue-500" />;
    case 'password_change':
      return <Edit className="h-3 w-3 text-purple-500" />;
    case 'change_avatar':
      return <User className="h-3 w-3 text-cyan-500" />;
    case 'chat_message':
      return <MessageCircle className="h-3 w-3 text-pink-500" />;
    case 'server_on':
      return <Power className="h-3 w-3 text-green-500" />;
    case 'server_off':
      return <PowerOff className="h-3 w-3 text-red-500" />;
    case 'error':
      return <XCircle className="h-3 w-3 text-red-500" />;
    default:
      return <Activity className="h-3 w-3 text-blue-500" />;
  }
};

// دالة للحصول على النص الوصفي للإجراء
const getActionDisplayName = (action?: string | null): string => {
  if (!action) return 'نشاط عام';

  switch (action.toLowerCase()) {
    case 'login':
      return 'تسجيل دخول';
    case 'logout':
      return 'تسجيل خروج';
    case 'signal_request':
      return 'طلب إشارة';
    case 'password_change':
      return 'تغيير كلمة المرور';
    case 'change_avatar':
      return 'تغيير الصورة';
    case 'chat_message':
      return 'رسالة دردشة';
    case 'server_on':
      return 'تشغيل الخادم';
    case 'server_off':
      return 'إيقاف الخادم';
    case 'error':
      return 'خطأ في النظام';
    default:
      return action.replace(/_/g, ' ');
  }
};

// دالة للحصول على أيقونة النتيجة
const getResultIcon = (result?: string) => {
  if (!result) return null;

  switch (result.toLowerCase()) {
    case 'success':
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    case 'failure':
    case 'error':
      return <XCircle className="h-3 w-3 text-red-500" />;
    default:
      return null;
  }
};

// دالة للحصول على النص الوصفي للنتيجة
const getResultDisplayName = (result?: string): string => {
  if (!result) return '';

  switch (result.toLowerCase()) {
    case 'success':
      return 'نجح';
    case 'failure':
      return 'فشل';
    case 'error':
      return 'خطأ';
    default:
      return result;
  }
};

// دالة للحصول على لون الحد الجانبي حسب المستوى
const getLevelBorderColor = (level: string): string => {
  switch (level.toLowerCase()) {
    case 'error':
      return 'border-l-red-500';
    case 'warn':
      return 'border-l-yellow-500';
    case 'info':
      return 'border-l-blue-500';
    case 'debug':
      return 'border-l-gray-400';
    default:
      return 'border-l-gray-300';
  }
};

// دالة لتحليل معلومات الجهاز والموقع الجغرافي من meta
const parseDeviceAndLocationInfo = (meta?: string | null) => {
  if (!meta) return null;

  try {
    const metaObj = typeof meta === 'string' ? JSON.parse(meta) : (meta || {});

    return {
      device: metaObj.device || metaObj.userAgent,
      location: metaObj.location || metaObj.country || metaObj.city,
      ip: metaObj.ip || metaObj.requestIp || metaObj.clientIP,
      browser: metaObj.browser,
      os: metaObj.os,
      country: metaObj.country,
      city: metaObj.city,
      timezone: metaObj.timezone
    };
  } catch (error) {
    return null;
  }
};

// دالة لتنسيق معرفات التتبع
const formatTrackingId = (id?: string | null): string => {
  if (!id) return '';
  return id.length > 6 ? `${id.slice(0, 6)}…` : id;
};

// دالة لتنسيق معلومات الجهاز
const formatDeviceInfo = (deviceInfo: any): string => {
  if (!deviceInfo) return '';

  const parts = [];
  if (deviceInfo.device && deviceInfo.device.includes('Android')) {
    const androidMatch = deviceInfo.device.match(/Android.*?([A-Z0-9-]+)/);
    if (androidMatch) {
      parts.push(`Android ${androidMatch[1]}`);
    }
  }

  if (deviceInfo.browser && deviceInfo.browser.includes('Chrome')) {
    const chromeMatch = deviceInfo.browser.match(/Chrome\s+(\d+)/);
    if (chromeMatch) {
      parts.push(`Chrome ${chromeMatch[1]}`);
    }
  }

  return parts.join(' • ') || 'Unknown Device';
};

// دالة لتنسيق معلومات الموقع
const formatLocationInfo = (deviceInfo: any): string => {
  if (!deviceInfo) return '';

  const parts = [];
  if (deviceInfo.ip) {
    parts.push(deviceInfo.ip);
  }
  if (deviceInfo.country) {
    parts.push(`(${deviceInfo.country})`);
  }

  return parts.join(' ');
};

// دالة لتنسيق العدادات التراكمية
const formatCumulativeCounts = (log: LogEntry): string => {
  const parts = [];

  if (log.previousTotal !== undefined && log.previousTotal !== null) {
    parts.push(`التراكمي (قبل): ${log.previousTotal}`);
  }

  if (log.dailyTotal !== undefined && log.dailyTotal !== null) {
    parts.push(`اليوم: ${log.dailyTotal}`);
  }

  if (log.monthlyTotal !== undefined && log.monthlyTotal !== null) {
    parts.push(`الشهر: ${log.monthlyTotal}`);
  }

  return parts.join(' • ');
};

// دالة لاستخراج معلومات الإشارة من الرسالة
const parseSignalInfo = (message: string, meta?: string | null) => {
  try {
    const metaObj = typeof meta === 'string' ? JSON.parse(meta) : (meta || {});

    // استخراج معلومات الإشارة
    const signalMatch = message.match(/Signal:\s*(\w+)/i);
    const confidenceMatch = message.match(/Confidence:\s*(\d+)%/i);
    const execTimeMatch = message.match(/execTime:\s*(\d+)ms/i);

    return {
      signal: signalMatch ? signalMatch[1] : null,
      confidence: confidenceMatch ? confidenceMatch[1] : null,
      execTime: execTimeMatch ? execTimeMatch[1] : null,
      ...metaObj
    };
  } catch (error) {
    return null;
  }
};

export function LogCard({ log, onClick, isSelected, onSearch }: LogCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const copyToClipboard = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('copy_success_title'),
      description: label ? `تم نسخ ${label}` : t('copy_success_description'),
      duration: 2000
    });
  };

  const handleSearch = (filters: { userId?: number; requestId?: string; sessionId?: string }) => {
    if (onSearch) {
      onSearch(filters);
      toast({
        title: 'بحث',
        description: 'تم تطبيق مرشح البحث',
        duration: 2000
      });
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Enhanced logic to determine actor information
  const actorType = log.actorType || (log.userId && log.username ? 'user' : 'system');
  const actorDisplayName = log.actorDisplayName || log.userDisplayName || log.username || log.source;
  const actorId = log.actorId || (log.userId ? log.userId.toString() : log.source);
  const isUserAction = actorType === 'user';

  // Parse device and location info
  const deviceInfo = parseDeviceAndLocationInfo(log.meta);
  const signalInfo = parseSignalInfo(log.message, log.meta);
  const cumulativeCounts = formatCumulativeCounts(log);

  return (
    <Card 
      className={`mb-1.5 transition-all duration-200 hover:shadow-sm border-l-4 ${getLevelBorderColor(log.level)} ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''} cursor-pointer bg-card/80 hover:bg-card/90`}
      onClick={onClick}
      data-testid={`log-card-${log.id}`}
    >
      <CardContent className="p-2.5">
        {/* الصف الأول: الوقت، المصدر، المستوى */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <div className="flex items-center space-x-1 space-x-reverse">
            <Clock className="h-3 w-3" />
            <span>{formatTime(log.timestamp)}</span>
            <span>•</span>
            <span className="font-medium">📈 {log.source}</span>
            <span>•</span>
            <div className="flex items-center space-x-0.5 space-x-reverse">
              {getLevelIcon(log.level)}
              <span className="uppercase font-medium">{log.level}</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-50 hover:opacity-100">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}>
                {isExpanded ? 'إخفاء التفاصيل' : 'تفاصيل'}
              </DropdownMenuItem>
              {onSearch && log.userId && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleSearch({ userId: log.userId! });
                }}>
                  بحث بنفس المستخدم
                </DropdownMenuItem>
              )}
              {log.requestId && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(log.requestId!, 'معرف الطلب');
                }}>
                  نسخ معرف الطلب
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* الصف الثاني: الرسالة الرئيسية */}
        <div className="text-sm font-medium text-foreground mb-1.5 leading-tight">
          {log.message}
        </div>

        {/* الصف الثالث: معلومات المستخدم */}
        {isUserAction && (
          <div className="text-xs text-muted-foreground mb-1.5">
            <span>المستخدم: </span>
            <span className="font-medium text-foreground">{actorDisplayName}</span>
            {log.userId && (
              <span> (id={log.userId})</span>
            )}
          </div>
        )}

        {/* الصف الرابع: معلومات الجهاز والشبكة */}
        {deviceInfo && (
          <div className="text-xs text-muted-foreground mb-1.5 flex items-center space-x-2 space-x-reverse">
            <div className="flex items-center space-x-1 space-x-reverse">
              <Smartphone className="h-3 w-3" />
              <span>Device: {formatDeviceInfo(deviceInfo)}</span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1 space-x-reverse">
              <Globe className="h-3 w-3" />
              <span>IP: {formatLocationInfo(deviceInfo)}</span>
            </div>
            {log.requestId && (
              <>
                <span>•</span>
                <div className="flex items-center space-x-1 space-x-reverse">
                  <Hash className="h-3 w-3" />
                  <span>RequestId: {formatTrackingId(log.requestId)}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* الصف الخامس: العدادات التراكمية */}
        {cumulativeCounts && (
          <div className="text-xs text-purple-600 dark:text-purple-400 mb-1.5">
            {cumulativeCounts}
          </div>
        )}

        {/* الصف السادس: معلومات الإشارة */}
        {signalInfo && (signalInfo.signal || signalInfo.confidence || signalInfo.execTime) && (
          <div className="text-xs space-x-2 space-x-reverse flex items-center">
            {signalInfo.signal && (
              <Badge variant={signalInfo.signal === 'BUY' ? 'default' : 'secondary'} className="text-xs px-1.5 py-0.5">
                <Signal className="h-2.5 w-2.5 mr-0.5" />
                Signal: {signalInfo.signal}
              </Badge>
            )}
            {signalInfo.confidence && (
              <span className="text-green-600 dark:text-green-400 font-medium">
                Confidence: {signalInfo.confidence}%
              </span>
            )}
            {signalInfo.execTime && (
              <span className="text-blue-600 dark:text-blue-400">
                execTime: {signalInfo.execTime}ms
              </span>
            )}
          </div>
        )}

        {/* صف الأزرار السفلي */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/30">
          <div className="flex items-center space-x-1 space-x-reverse">
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2 py-0" onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}>
              {isExpanded ? 'إخفاء' : 'تفاصيل'}
            </Button>

            {onSearch && log.userId && (
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 py-0" onClick={(e) => {
                e.stopPropagation();
                handleSearch({ userId: log.userId! });
              }}>
                <Search className="h-2.5 w-2.5 mr-0.5" />
                بحث بنفس المستخدم
              </Button>
            )}

            {log.requestId && (
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 py-0" onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(log.requestId!, 'معرف الطلب');
              }}>
                <Copy className="h-2.5 w-2.5 mr-0.5" />
                نسخ RequestId
              </Button>
            )}
          </div>

          {/* إشارة الحالة */}
          <div className="flex items-center space-x-1 space-x-reverse">
            {log.result && getResultIcon(log.result)}
            {getActionIcon(log.action)}
          </div>
        </div>

        {/* التفاصيل الموسعة */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-2 text-xs">
            {/* معلومات إضافية */}
            {log.meta && (
              <div className="p-2 bg-muted/30 rounded text-xs">
                <div className="font-medium mb-1">معلومات إضافية:</div>
                <pre className="whitespace-pre-wrap break-words text-xs">
                  {typeof log.meta === 'string' ? log.meta : JSON.stringify(log.meta, null, 2)}
                </pre>
              </div>
            )}

            {/* تفاصيل الحدث */}
            {log.details && (
              <div className="p-2 bg-blue-50/50 dark:bg-blue-950/20 rounded text-xs">
                <div className="font-medium mb-1 text-blue-700 dark:text-blue-300">تفاصيل الحدث:</div>
                <pre className="whitespace-pre-wrap break-words text-blue-600 dark:text-blue-400">
                  {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}