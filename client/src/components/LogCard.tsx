import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal, Clock, User, Monitor, AlertTriangle, Info } from "lucide-react";
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
  meta?: any;
  userId?: number;
  username?: string;
  userDisplayName?: string;
  userAvatar?: string;
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

  const userColor = log.username ? generateColor(log.username) : generateColor(log.source);
  const displayName = log.userDisplayName || log.username || log.source;
  const isUserAction = log.userId && log.username;

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

            {/* مستوى السجل والمصدر */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 xl:space-x-1.5 space-x-reverse mb-1.5 sm:mb-2 xl:mb-1.5">
              <Badge 
                variant={log.level === 'error' ? 'destructive' : 'secondary'}
                className="text-xs flex items-center space-x-0.5 sm:space-x-1 xl:space-x-0.5 space-x-reverse px-1.5 sm:px-2 xl:px-1.5 py-0.5"
              >
                {getLevelIcon(log.level)}
                <span className="hidden sm:inline xl:hidden">{log.level.toUpperCase()}</span>
                <span className="sm:hidden xl:inline">{log.level.slice(0, 3).toUpperCase()}</span>
              </Badge>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground truncate flex-1">{log.source}</span>
            </div>

            {/* الرسالة */}
            <div className="text-sm text-foreground">
              <p className={isExpanded ? '' : 'line-clamp-2'} data-testid="log-message">
                {log.message}
              </p>
            </div>

            {/* البيانات الإضافية عند التوسع */}
            {isExpanded && log.meta && (
              <div className="mt-2 sm:mt-3 xl:mt-2 p-2 sm:p-3 xl:p-2 bg-muted/30 rounded-lg">
                <h4 className="text-xs font-semibold mb-1.5 sm:mb-2 xl:mb-1.5 text-muted-foreground">{t('additional_data')}</h4>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                  {typeof log.meta === 'string' ? log.meta : JSON.stringify(log.meta, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}