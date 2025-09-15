import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal, Clock, User, Monitor, AlertTriangle, Info, CheckCircle, XCircle, Activity, Settings, LogIn, LogOut, Signal, Edit, MessageCircle, Power, PowerOff } from "lucide-react";
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
      return <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 xl:h-3 xl:w-3 text-red-500" />;
    case 'warn':
      return <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 xl:h-3 xl:w-3 text-yellow-500" />;
    case 'info':
      return <Info className="h-3 w-3 sm:h-4 sm:w-4 xl:h-3 xl:w-3 text-blue-500" />;
    case 'debug':
      return <Monitor className="h-3 w-3 sm:h-4 sm:w-4 xl:h-3 xl:w-3 text-gray-500" />;
    default:
      return <Info className="h-3 w-3 sm:h-4 sm:w-4 xl:h-3 xl:w-3 text-gray-400" />;
  }
};

// دالة للحصول على أيقونة الإجراء
const getActionIcon = (action?: string) => {
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
const getActionDisplayName = (action?: string): string => {
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

// دالة للحصول على لون الخلفية حسب المستوى
const getLevelBgColor = (level: string): string => {
  switch (level.toLowerCase()) {
    case 'error':
      return 'bg-red-50 dark:bg-red-950/20';
    case 'warn':
      return 'bg-yellow-50 dark:bg-yellow-950/20';
    case 'info':
      return 'bg-blue-50 dark:bg-blue-950/20';
    case 'debug':
      return 'bg-gray-50 dark:bg-gray-950/20';
    default:
      return 'bg-white dark:bg-slate-950/50';
  }
};

export function LogCard({ log, onClick, isSelected }: LogCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('copy_success_title'),
      description: t('copy_success_description'),
      duration: 2000
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Enhanced logic to determine actor information
  const actorType = log.actorType || (log.userId && log.username ? 'user' : 'system');
  const actorDisplayName = log.actorDisplayName || log.userDisplayName || log.username || log.source;
  const actorId = log.actorId || (log.userId ? log.userId.toString() : log.source);
  
  const userColor = generateColor(actorId);
  const displayName = actorDisplayName;
  const isUserAction = actorType === 'user';

  return (
    <Card 
      className={`mb-2 sm:mb-3 xl:mb-2 transition-all duration-200 hover:shadow-md border-l-4 ${getLevelBorderColor(log.level)} ${
        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
      } ${getLevelBgColor(log.level)} cursor-pointer`}
      onClick={onClick}
      data-testid={`log-card-${log.id}`}
    >
      <CardContent className="p-3 sm:p-4 xl:p-3">
        <div className="flex items-start space-x-2 sm:space-x-3 xl:space-x-2 space-x-reverse">
          {/* صورة المستخدم أو أيقونة المصدر */}
          <div className="flex-shrink-0">
            {isUserAction ? (
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 xl:h-8 xl:w-8 border-2" style={{ borderColor: userColor }}>
                <AvatarFallback 
                  style={{ backgroundColor: userColor, color: 'white' }}
                  className="text-xs sm:text-sm xl:text-xs font-bold"
                >
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div 
                className="h-8 w-8 sm:h-10 sm:w-10 xl:h-8 xl:w-8 rounded-full flex items-center justify-center border-2"
                style={{ backgroundColor: userColor + '20', borderColor: userColor }}
              >
                <Monitor className="h-4 w-4 sm:h-5 sm:w-5 xl:h-4 xl:w-4" style={{ color: userColor }} />
              </div>
            )}
          </div>

          {/* محتوى السجل */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1 xl:mb-0.5">
              <div className="flex items-center space-x-1.5 sm:space-x-2 xl:space-x-1.5 space-x-reverse">
                <h3 className="text-sm xl:text-sm font-semibold text-foreground truncate" data-testid="log-display-name">
                  {displayName}
                </h3>
                {isUserAction && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    <User className="h-3 w-3 xl:h-2.5 xl:w-2.5 mr-0.5 sm:mr-1 xl:mr-0.5" />
                    <span className="hidden sm:inline xl:hidden">{t('user_badge')}</span>
                    <span className="sm:hidden xl:inline">U</span>
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-1 space-x-reverse">
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 xl:h-2.5 xl:w-2.5 mr-0.5 sm:mr-1 xl:mr-0.5" />
                  <span className="hidden sm:inline xl:hidden">{formatTime(log.timestamp)}</span>
                  <span className="sm:hidden xl:inline">{formatTime(log.timestamp).slice(0, 5)}</span>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-10 w-10 sm:h-6 sm:w-6 xl:h-6 xl:w-6 p-0">
                      <MoreHorizontal className="h-4 w-4 sm:h-4 sm:w-4 xl:h-3 xl:w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(log.message);
                    }}>
                      {t('copy_message')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(JSON.stringify(log, null, 2));
                    }}>
                      {t('copy_full_details')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}>
                      {isExpanded ? t('hide_details') : t('show_details_card')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* نوع الحدث والنتيجة */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 xl:space-x-1.5 space-x-reverse mb-1.5 sm:mb-2 xl:mb-1.5">
              {/* نوع الحدث */}
              <Badge 
                variant="outline"
                className="text-xs flex items-center space-x-0.5 sm:space-x-1 xl:space-x-0.5 space-x-reverse px-1.5 sm:px-2 xl:px-1.5 py-0.5"
              >
                {getActionIcon(log.action)}
                <span className="hidden sm:inline xl:hidden">{getActionDisplayName(log.action)}</span>
                <span className="sm:hidden xl:inline">{getActionDisplayName(log.action).slice(0, 8)}</span>
              </Badge>
              
              {/* النتيجة إذا كانت متوفرة */}
              {log.result && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <Badge 
                    variant={log.result === 'success' ? 'default' : 'destructive'}
                    className="text-xs flex items-center space-x-0.5 space-x-reverse px-1.5 py-0.5"
                  >
                    {getResultIcon(log.result)}
                    <span className="hidden sm:inline">{getResultDisplayName(log.result)}</span>
                  </Badge>
                </>
              )}
              
              {/* مستوى السجل */}
              <span className="text-xs text-muted-foreground">•</span>
              <Badge 
                variant={log.level === 'error' ? 'destructive' : 'secondary'}
                className="text-xs flex items-center space-x-0.5 space-x-reverse px-1.5 py-0.5"
              >
                {getLevelIcon(log.level)}
                <span className="hidden sm:inline xl:hidden">{log.level.toUpperCase()}</span>
                <span className="sm:hidden xl:inline">{log.level.slice(0, 3)}</span>
              </Badge>
            </div>
            
            {/* المصدر ومعلومات إضافية */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span className="truncate flex-1">{log.source}</span>
              {actorType && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 ml-2">
                  {actorType === 'user' ? 'مستخدم' : 'نظام'}
                </Badge>
              )}
            </div>

            {/* الرسالة */}
            <div className="text-sm text-foreground">
              <p className={isExpanded ? '' : 'line-clamp-2'} data-testid="log-message">
                {log.message}
              </p>
            </div>

            {/* البيانات الإضافية عند التوسع */}
            {isExpanded && (
              <div className="mt-2 sm:mt-3 xl:mt-2 space-y-2">
                {/* تفاصيل محسنة */}
                {log.details && (
                  <div className="p-2 sm:p-3 xl:p-2 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                    <h4 className="text-xs font-semibold mb-1.5 text-blue-700 dark:text-blue-300">تفاصيل الحدث</h4>
                    <pre className="text-xs text-blue-600 dark:text-blue-400 whitespace-pre-wrap overflow-x-auto">
                      {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
                
                {/* معلومات إضافية */}
                {log.meta && (
                  <div className="p-2 sm:p-3 xl:p-2 bg-muted/30 rounded-lg">
                    <h4 className="text-xs font-semibold mb-1.5 text-muted-foreground">معلومات إضافية</h4>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                      {log.meta}
                    </pre>
                  </div>
                )}
                
                {/* معلومات المستخدم المحسنة */}
                {(log.actorId || log.userId) && (
                  <div className="p-2 sm:p-3 xl:p-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
                    <h4 className="text-xs font-semibold mb-1.5 text-emerald-700 dark:text-emerald-300">معلومات المستخدم</h4>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 space-y-1">
                      <div>النوع: {actorType === 'user' ? 'مستخدم' : 'نظام'}</div>
                      {log.actorId && <div>المعرف: {log.actorId}</div>}
                      {log.actorDisplayName && <div>الاسم: {log.actorDisplayName}</div>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}