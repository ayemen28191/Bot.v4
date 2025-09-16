
import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MoreHorizontal, Clock, User, Monitor, AlertTriangle, Info, CheckCircle, XCircle, 
  Activity, Settings, LogIn, LogOut, Signal, Edit, MessageCircle, Power, PowerOff, 
  Copy, Search, MapPin, Smartphone, Globe, Hash, Calendar, TrendingUp, Wifi, 
  BarChart3, Timer, ChevronDown, ChevronUp, Database, Zap, Shield, Eye, EyeOff,
  Network, Cpu, HardDrive, Terminal, Code, Server, Cloud, Lock, Unlock,
  MousePointer, Layers, Gauge, Fingerprint, Key, Radar
} from "lucide-react";
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

// الألوان الديناميكية المتقدمة
const generateAdvancedColor = (str: string): { 
  primary: string; 
  secondary: string; 
  gradient: string;
  glow: string;
} => {
  const colorPalettes = [
    {
      primary: 'rgb(59, 130, 246)', // blue
      secondary: 'rgb(147, 197, 253)',
      gradient: 'from-blue-500/20 via-blue-400/10 to-blue-300/5',
      glow: 'shadow-blue-500/20'
    },
    {
      primary: 'rgb(16, 185, 129)', // emerald
      secondary: 'rgb(110, 231, 183)',
      gradient: 'from-emerald-500/20 via-emerald-400/10 to-emerald-300/5',
      glow: 'shadow-emerald-500/20'
    },
    {
      primary: 'rgb(139, 92, 246)', // violet
      secondary: 'rgb(196, 181, 253)',
      gradient: 'from-violet-500/20 via-violet-400/10 to-violet-300/5',
      glow: 'shadow-violet-500/20'
    },
    {
      primary: 'rgb(236, 72, 153)', // pink
      secondary: 'rgb(251, 207, 232)',
      gradient: 'from-pink-500/20 via-pink-400/10 to-pink-300/5',
      glow: 'shadow-pink-500/20'
    },
    {
      primary: 'rgb(245, 158, 11)', // amber
      secondary: 'rgb(252, 211, 77)',
      gradient: 'from-amber-500/20 via-amber-400/10 to-amber-300/5',
      glow: 'shadow-amber-500/20'
    },
    {
      primary: 'rgb(239, 68, 68)', // red
      secondary: 'rgb(252, 165, 165)',
      gradient: 'from-red-500/20 via-red-400/10 to-red-300/5',
      glow: 'shadow-red-500/20'
    }
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorPalettes[Math.abs(hash) % colorPalettes.length];
};

// تأثيرات المستوى المتقدمة
const getLevelStyle = (level: string) => {
  const styles = {
    error: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      color: 'text-red-500 dark:text-red-400',
      bg: 'bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20',
      border: 'border-red-200/60 dark:border-red-800/40',
      glow: 'shadow-red-500/20',
      pulse: 'animate-pulse',
      badge: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20'
    },
    warn: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      color: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20',
      border: 'border-amber-200/60 dark:border-amber-800/40',
      glow: 'shadow-amber-500/20',
      pulse: '',
      badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
    },
    info: {
      icon: <Info className="h-3.5 w-3.5" />,
      color: 'text-blue-500 dark:text-blue-400',
      bg: 'bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20',
      border: 'border-blue-200/60 dark:border-blue-800/40',
      glow: 'shadow-blue-500/20',
      pulse: '',
      badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
    },
    debug: {
      icon: <Terminal className="h-3.5 w-3.5" />,
      color: 'text-gray-500 dark:text-gray-400',
      bg: 'bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-950/30 dark:to-gray-900/20',
      border: 'border-gray-200/60 dark:border-gray-800/40',
      glow: 'shadow-gray-500/20',
      pulse: '',
      badge: 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20'
    }
  };
  
  return styles[level.toLowerCase() as keyof typeof styles] || styles.info;
};

// أيقونات الإجراءات المتقدمة
const getAdvancedActionIcon = (action?: string | null) => {
  if (!action) return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;

  const iconMap: Record<string, JSX.Element> = {
    login: <LogIn className="h-3.5 w-3.5 text-green-500" />,
    logout: <LogOut className="h-3.5 w-3.5 text-orange-500" />,
    signal_request: <Signal className="h-3.5 w-3.5 text-blue-500" />,
    password_change: <Key className="h-3.5 w-3.5 text-purple-500" />,
    change_avatar: <User className="h-3.5 w-3.5 text-cyan-500" />,
    chat_message: <MessageCircle className="h-3.5 w-3.5 text-pink-500" />,
    server_on: <Power className="h-3.5 w-3.5 text-green-500" />,
    server_off: <PowerOff className="h-3.5 w-3.5 text-red-500" />,
    error: <XCircle className="h-3.5 w-3.5 text-red-500" />,
    database: <Database className="h-3.5 w-3.5 text-indigo-500" />,
    network: <Network className="h-3.5 w-3.5 text-teal-500" />,
    security: <Shield className="h-3.5 w-3.5 text-rose-500" />,
    api_call: <Code className="h-3.5 w-3.5 text-violet-500" />,
    deployment: <Cloud className="h-3.5 w-3.5 text-sky-500" />
  };

  return iconMap[action.toLowerCase()] || <Activity className="h-3.5 w-3.5 text-blue-500" />;
};

// تحليل معلومات النظام المتقدم
const parseAdvancedSystemInfo = (meta?: string | null) => {
  if (!meta) return null;

  try {
    const metaObj = typeof meta === 'string' ? JSON.parse(meta) : (meta || {});

    return {
      // Device Information
      device: metaObj.device || metaObj.userAgent,
      browser: metaObj.browser,
      os: metaObj.os,
      platform: metaObj.platform,
      
      // Network Information
      ip: metaObj.ip || metaObj.requestIp || metaObj.clientIP,
      location: metaObj.location || metaObj.country || metaObj.city,
      country: metaObj.country,
      city: metaObj.city,
      timezone: metaObj.timezone,
      isp: metaObj.isp,
      
      // Performance Metrics
      responseTime: metaObj.responseTime || metaObj.execTime,
      memoryUsage: metaObj.memoryUsage,
      cpuUsage: metaObj.cpuUsage,
      
      // Security Information
      ssl: metaObj.ssl,
      userAgent: metaObj.userAgent,
      referer: metaObj.referer,
      
      // Technical Details
      method: metaObj.method,
      statusCode: metaObj.statusCode,
      contentLength: metaObj.contentLength,
      
      // Trading Specific
      signal: metaObj.signal,
      confidence: metaObj.confidence,
      symbol: metaObj.symbol,
      timeframe: metaObj.timeframe
    };
  } catch (error) {
    return null;
  }
};

// مكونات العرض المتقدمة
const AdvancedMetricBadge = ({ 
  icon, 
  label, 
  value, 
  color = 'blue',
  animated = false 
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
  animated?: boolean;
}) => (
  <div className={`
    group relative flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 
    rounded-lg border backdrop-blur-sm transition-all duration-300
    hover:scale-105 hover:shadow-lg cursor-default
    bg-gradient-to-r from-${color}-50/80 via-${color}-100/40 to-${color}-50/60
    dark:from-${color}-950/40 dark:via-${color}-900/20 dark:to-${color}-950/30
    border-${color}-200/50 dark:border-${color}-800/30
    ${animated ? 'animate-pulse' : ''}
  `}>
    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/20 via-white/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
    <div className="relative flex items-center space-x-1.5 space-x-reverse">
      <div className={`
        p-1 rounded-md bg-gradient-to-br from-${color}-500/20 to-${color}-600/20 
        border border-white/20 text-${color}-600 dark:text-${color}-400
      `}>
        {icon}
      </div>
      <span className={`text-xs font-medium text-${color}-700 dark:text-${color}-300`}>
        {label}:
      </span>
      <span className={`text-xs font-bold text-${color}-800 dark:text-${color}-200`}>
        {value}
      </span>
    </div>
  </div>
);

const PerformanceIndicator = ({ responseTime }: { responseTime?: number }) => {
  if (!responseTime) return null;
  
  const getPerformanceColor = (time: number) => {
    if (time < 100) return 'green';
    if (time < 500) return 'yellow';
    return 'red';
  };

  const color = getPerformanceColor(responseTime);
  
  return (
    <AdvancedMetricBadge
      icon={<Gauge className="h-3 w-3" />}
      label="أداء"
      value={`${responseTime}ms`}
      color={color}
      animated={responseTime > 1000}
    />
  );
};

const SecurityIndicator = ({ ssl, ip }: { ssl?: boolean; ip?: string }) => {
  if (!ssl && !ip) return null;
  
  return (
    <div className="flex items-center space-x-1 space-x-reverse">
      {ssl !== undefined && (
        <AdvancedMetricBadge
          icon={ssl ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          label="SSL"
          value={ssl ? "آمن" : "غير آمن"}
          color={ssl ? 'green' : 'red'}
        />
      )}
      {ip && (
        <AdvancedMetricBadge
          icon={<Globe className="h-3 w-3" />}
          label="IP"
          value={ip.slice(0, 12) + (ip.length > 12 ? '...' : '')}
          color="blue"
        />
      )}
    </div>
  );
};

const TradingSignalIndicator = ({ signal, confidence, symbol }: {
  signal?: string;
  confidence?: number;
  symbol?: string;
}) => {
  if (!signal && !confidence && !symbol) return null;
  
  return (
    <div className="flex items-center space-x-1.5 space-x-reverse">
      {signal && (
        <Badge className={`
          text-xs px-2 py-1 font-bold border-2 transition-all duration-300
          ${signal.toUpperCase() === 'BUY' 
            ? 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30 shadow-green-500/20' 
            : 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30 shadow-red-500/20'
          }
        `}>
          <Signal className="h-3 w-3 mr-1" />
          {signal.toUpperCase()}
        </Badge>
      )}
      {confidence && (
        <AdvancedMetricBadge
          icon={<Radar className="h-3 w-3" />}
          label="ثقة"
          value={`${confidence}%`}
          color={confidence > 80 ? 'green' : confidence > 60 ? 'yellow' : 'red'}
        />
      )}
      {symbol && (
        <AdvancedMetricBadge
          icon={<TrendingUp className="h-3 w-3" />}
          label="رمز"
          value={symbol}
          color="purple"
        />
      )}
    </div>
  );
};

// Enhanced Cumulative Counters with animations
const ENHANCED_COUNTER_VARIANTS = {
  previousTotal: {
    gradient: 'bg-gradient-to-br from-purple-500/10 via-purple-400/5 to-purple-300/10',
    border: 'border-purple-300/40 dark:border-purple-700/40',
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    iconBg: 'bg-purple-500/20 border-purple-500/30',
    textColor: 'text-purple-700 dark:text-purple-300',
    valueColor: 'text-purple-900 dark:text-purple-100',
    glow: 'hover:shadow-purple-500/25'
  },
  dailyTotal: {
    gradient: 'bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-blue-300/10',
    border: 'border-blue-300/40 dark:border-blue-700/40',
    icon: <Calendar className="h-3.5 w-3.5" />,
    iconBg: 'bg-blue-500/20 border-blue-500/30',
    textColor: 'text-blue-700 dark:text-blue-300',
    valueColor: 'text-blue-900 dark:text-blue-100',
    glow: 'hover:shadow-blue-500/25'
  },
  monthlyTotal: {
    gradient: 'bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-emerald-300/10',
    border: 'border-emerald-300/40 dark:border-emerald-700/40',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    iconBg: 'bg-emerald-500/20 border-emerald-500/30',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    valueColor: 'text-emerald-900 dark:text-emerald-100',
    glow: 'hover:shadow-emerald-500/25'
  }
};

const EnhancedCumulativeCounter = ({ 
  label, 
  value, 
  variant 
}: { 
  label: string; 
  value: number; 
  variant: keyof typeof ENHANCED_COUNTER_VARIANTS;
}) => {
  const config = ENHANCED_COUNTER_VARIANTS[variant];
  
  return (
    <div className={`
      group relative flex items-center space-x-1.5 space-x-reverse px-3 py-2 
      rounded-xl border backdrop-blur-md transition-all duration-500
      hover:scale-110 hover:rotate-1 cursor-default
      ${config.gradient} ${config.border} ${config.glow}
      transform-gpu will-change-transform
    `}>
      {/* Animated background overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/30 via-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Content */}
      <div className="relative flex items-center space-x-1.5 space-x-reverse z-10">
        <div className={`
          p-1.5 rounded-lg border backdrop-blur-sm
          ${config.iconBg} ${config.textColor}
          group-hover:scale-110 transition-transform duration-300
        `}>
          {config.icon}
        </div>
        <div className="flex flex-col">
          <span className={`text-xs font-medium ${config.textColor} leading-tight`}>
            {label}
          </span>
          <span className={`text-sm font-bold ${config.valueColor} leading-tight`}>
            {value.toLocaleString()}
          </span>
        </div>
      </div>
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    </div>
  );
};

export function LogCard({ log, onClick, isSelected, onSearch }: LogCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // تحسين معالجة البيانات
  const levelStyle = useMemo(() => getLevelStyle(log.level), [log.level]);
  const systemInfo = useMemo(() => parseAdvancedSystemInfo(log.meta), [log.meta]);
  const sourceColor = useMemo(() => generateAdvancedColor(log.source), [log.source]);

  // Animation effects
  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isSelected]);

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
        title: 'بحث متقدم',
        description: 'تم تطبيق مرشح البحث المتقدم',
        duration: 2000
      });
    }
  };

  const formatTime = useMemo(() => {
    const date = new Date(log.timestamp);
    return {
      time: date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      date: date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
      full: date.toLocaleString('ar-SA')
    };
  }, [log.timestamp]);

  const timeInfo = formatTime;
  const actorDisplayName = useMemo(() => 
    log.actorDisplayName || log.userDisplayName || log.username || log.source
  , [log.actorDisplayName, log.userDisplayName, log.username, log.source]);
  
  const isUserAction = useMemo(() => 
    log.actorType === 'user' || 
    Boolean(log.userId) || 
    Boolean(log.username) || 
    Boolean(log.userDisplayName) ||
    (log.source === 'signal-logger' && log.meta && 
     (() => {
       try {
         const metaData = typeof log.meta === 'string' ? JSON.parse(log.meta) : log.meta;
         return metaData?.context?.userId || metaData?.userId;
       } catch {
         return false;
       }
     })())
  , [log.actorType, log.userId, log.username, log.userDisplayName, log.source, log.meta]);

  return (
    <Card 
      ref={cardRef}
      className={`
        group relative mb-3 transition-all duration-500 cursor-pointer backdrop-blur-md
        border-l-4 ${levelStyle.border} ${levelStyle.glow}
        hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1
        ${isSelected ? 'ring-2 ring-primary shadow-2xl scale-[1.02] -translate-y-1' : ''}
        ${levelStyle.bg}
        transform-gpu will-change-transform
      `}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`enhanced-log-card-${log.id}`}
    >
      {/* Animated border gradient */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      
      <CardContent className="relative p-4 z-10">
        {/* Header Row - Enhanced */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 space-x-reverse">
            {/* Time with enhanced styling */}
            <div className="flex items-center space-x-1.5 space-x-reverse">
              <div className={`
                p-1.5 rounded-lg ${levelStyle.color} 
                ${levelStyle.bg} border ${levelStyle.border}
                group-hover:scale-110 transition-transform duration-300
              `}>
                <Clock className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">{timeInfo.time}</span>
                <span className="text-xs text-muted-foreground">{timeInfo.date}</span>
              </div>
            </div>

            <div className="h-6 w-px bg-border/50"></div>

            {/* Source with enhanced styling */}
            <div className="flex items-center space-x-1.5 space-x-reverse">
              <div 
                className={`
                  p-1.5 rounded-lg border backdrop-blur-sm
                  bg-gradient-to-br ${sourceColor.gradient}
                  hover:scale-110 transition-all duration-300
                `}
                style={{ borderColor: sourceColor.primary + '40' }}
              >
                <Server className="h-3.5 w-3.5" style={{ color: sourceColor.primary }} />
              </div>
              <span 
                className="text-sm font-bold"
                style={{ color: sourceColor.primary }}
              >
                {log.source}
              </span>
            </div>

            <div className="h-6 w-px bg-border/50"></div>

            {/* Level Badge Enhanced */}
            <Badge className={`
              ${levelStyle.badge} border text-xs px-2.5 py-1 font-bold
              hover:scale-105 transition-transform duration-300
              ${levelStyle.pulse}
            `}>
              <div className="flex items-center space-x-1 space-x-reverse">
                {levelStyle.icon}
                <span className="uppercase">{log.level}</span>
              </div>
            </Badge>
          </div>

          {/* Actions Menu Enhanced */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`
                  h-8 w-8 p-0 rounded-full transition-all duration-300
                  opacity-60 hover:opacity-100 hover:scale-110 hover:bg-primary/10
                  ${isHovered ? 'opacity-100' : ''}
                `}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}>
                <Eye className="h-4 w-4 mr-2" />
                {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
              </DropdownMenuItem>
              {onSearch && log.userId && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleSearch({ userId: log.userId! });
                }}>
                  <Search className="h-4 w-4 mr-2" />
                  بحث بنفس المستخدم
                </DropdownMenuItem>
              )}
              {log.requestId && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(log.requestId!, 'معرف الطلب');
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  نسخ معرف الطلب
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(timeInfo.full, 'الوقت الكامل');
              }}>
                <Calendar className="h-4 w-4 mr-2" />
                نسخ الوقت الكامل
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Message Row Enhanced */}
        <div className="mb-3">
          <p className="text-sm leading-relaxed text-foreground font-medium">
            {log.message}
          </p>
        </div>

        {/* User Information Enhanced */}
        {isUserAction && (
          <div className="flex items-center space-x-2 space-x-reverse mb-3">
            <Avatar className="h-6 w-6 border-2 border-primary/20">
              <AvatarFallback className="text-xs bg-primary/10">
                {actorDisplayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center space-x-1.5 space-x-reverse">
              <span className="text-xs text-muted-foreground">المستخدم:</span>
              <span className="text-sm font-medium text-foreground">{actorDisplayName}</span>
              {log.userId && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  ID: {log.userId}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* System Information Row */}
        {systemInfo && (
          <div className="mb-3 space-y-2">
            {/* Performance & Security */}
            <div className="flex items-center space-x-2 space-x-reverse flex-wrap gap-1">
              <PerformanceIndicator responseTime={systemInfo.responseTime} />
              <SecurityIndicator ssl={systemInfo.ssl} ip={systemInfo.ip} />
              
              {systemInfo.method && (
                <AdvancedMetricBadge
                  icon={<Code className="h-3 w-3" />}
                  label="طريقة"
                  value={systemInfo.method}
                  color="indigo"
                />
              )}
              
              {systemInfo.statusCode && (
                <AdvancedMetricBadge
                  icon={<Activity className="h-3 w-3" />}
                  label="حالة"
                  value={systemInfo.statusCode}
                  color={systemInfo.statusCode < 300 ? 'green' : systemInfo.statusCode < 400 ? 'yellow' : 'red'}
                />
              )}
            </div>

            {/* Device Information */}
            {(systemInfo.browser || systemInfo.os || systemInfo.platform) && (
              <div className="flex items-center space-x-2 space-x-reverse flex-wrap gap-1">
                {systemInfo.browser && (
                  <AdvancedMetricBadge
                    icon={<Globe className="h-3 w-3" />}
                    label="متصفح"
                    value={systemInfo.browser.split(' ')[0]}
                    color="cyan"
                  />
                )}
                
                {systemInfo.os && (
                  <AdvancedMetricBadge
                    icon={<Monitor className="h-3 w-3" />}
                    label="نظام"
                    value={systemInfo.os.split(' ')[0]}
                    color="slate"
                  />
                )}
                
                {systemInfo.platform && (
                  <AdvancedMetricBadge
                    icon={<Smartphone className="h-3 w-3" />}
                    label="منصة"
                    value={systemInfo.platform}
                    color="pink"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Trading Signal Information */}
        <TradingSignalIndicator 
          signal={systemInfo?.signal} 
          confidence={systemInfo?.confidence} 
          symbol={systemInfo?.symbol}
        />

        {/* Enhanced Cumulative Counters */}
        {(log.previousTotal !== undefined && log.previousTotal !== null) || 
         (log.dailyTotal !== undefined && log.dailyTotal !== null) || 
         (log.monthlyTotal !== undefined && log.monthlyTotal !== null) ? (
          <div className="my-4">
            <div className="flex items-center space-x-2 space-x-reverse flex-wrap gap-2">
              {log.previousTotal !== undefined && log.previousTotal !== null && (
                <EnhancedCumulativeCounter
                  label="التراكمي"
                  value={log.previousTotal}
                  variant="previousTotal"
                />
              )}
              {log.dailyTotal !== undefined && log.dailyTotal !== null && (
                <EnhancedCumulativeCounter
                  label="اليوم"
                  value={log.dailyTotal}
                  variant="dailyTotal"
                />
              )}
              {log.monthlyTotal !== undefined && log.monthlyTotal !== null && (
                <EnhancedCumulativeCounter
                  label="الشهر"
                  value={log.monthlyTotal}
                  variant="monthlyTotal"
                />
              )}
            </div>
          </div>
        ) : null}

        {/* Action Footer Enhanced */}
        <div className="flex items-center justify-between pt-3 border-t border-border/30">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`
                h-7 text-xs px-3 py-1 rounded-full transition-all duration-300
                hover:scale-105 hover:shadow-md
                ${isExpanded ? 'bg-primary/10 text-primary' : ''}
              `}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
              {isExpanded ? 'إخفاء' : 'تفاصيل'}
            </Button>

            {onSearch && log.userId && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs px-3 py-1 rounded-full hover:scale-105 transition-all duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSearch({ userId: log.userId! });
                }}
              >
                <Search className="h-3 w-3 mr-1" />
                بحث متقدم
              </Button>
            )}

            {log.requestId && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs px-3 py-1 rounded-full hover:scale-105 transition-all duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(log.requestId!, 'معرف الطلب');
                }}
              >
                <Copy className="h-3 w-3 mr-1" />
                نسخ ID
              </Button>
            )}
          </div>

          {/* Status Indicators Enhanced */}
          <div className="flex items-center space-x-1.5 space-x-reverse">
            {log.result && (
              <div className={`
                p-1.5 rounded-full transition-all duration-300 group-hover:scale-110
                ${log.result === 'success' 
                  ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                  : 'bg-red-500/20 text-red-600 dark:text-red-400'
                }
              `}>
                {log.result === 'success' ? 
                  <CheckCircle className="h-3.5 w-3.5" /> : 
                  <XCircle className="h-3.5 w-3.5" />
                }
              </div>
            )}
            <div className={`
              p-1.5 rounded-full transition-all duration-300 group-hover:scale-110
              bg-primary/20 text-primary
            `}>
              {getAdvancedActionIcon(log.action)}
            </div>
          </div>
        </div>

        {/* Expanded Details Enhanced */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-border/50 space-y-4 animate-in slide-in-from-top-3 duration-500">
            {/* Technical Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {log.meta && (
                <div className="p-3 bg-muted/50 rounded-lg border border-border/50 backdrop-blur-sm">
                  <div className="flex items-center space-x-2 space-x-reverse mb-2">
                    <Database className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">البيانات التقنية</span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground max-h-32 overflow-y-auto">
                    {typeof log.meta === 'string' ? log.meta : JSON.stringify(log.meta, null, 2)}
                  </pre>
                </div>
              )}

              {log.details && (
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-sm">
                  <div className="flex items-center space-x-2 space-x-reverse mb-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-sm text-blue-700 dark:text-blue-300">تفاصيل الحدث</span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-xs text-blue-600 dark:text-blue-400 max-h-32 overflow-y-auto">
                    {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* System Identifiers */}
            <div className="flex items-center space-x-2 space-x-reverse flex-wrap gap-2">
              {log.requestId && (
                <AdvancedMetricBadge
                  icon={<Hash className="h-3 w-3" />}
                  label="طلب"
                  value={log.requestId.slice(0, 8)}
                  color="violet"
                />
              )}
              {log.sessionId && (
                <AdvancedMetricBadge
                  icon={<Fingerprint className="h-3 w-3" />}
                  label="جلسة"
                  value={log.sessionId.slice(0, 8)}
                  color="rose"
                />
              )}
              {log.combinedTrackingId && (
                <AdvancedMetricBadge
                  icon={<Layers className="h-3 w-3" />}
                  label="تتبع"
                  value={log.combinedTrackingId.slice(0, 8)}
                  color="amber"
                />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
