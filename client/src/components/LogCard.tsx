import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal, Clock, User, Monitor, AlertTriangle, Info } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'warn':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'info':
      return <Info className="h-4 w-4 text-blue-500" />;
    case 'debug':
      return <Monitor className="h-4 w-4 text-gray-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-400" />;
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
      title: "تم النسخ",
      description: "تم نسخ النص إلى الحافظة",
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
      className={`mb-3 transition-all duration-200 hover:shadow-md border-l-4 ${getLevelBorderColor(log.level)} ${
        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
      } ${getLevelBgColor(log.level)} cursor-pointer`}
      onClick={onClick}
      data-testid={`log-card-${log.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3 space-x-reverse">
          {/* صورة المستخدم أو أيقونة المصدر */}
          <div className="flex-shrink-0">
            {isUserAction ? (
              <Avatar className="h-10 w-10 border-2" style={{ borderColor: userColor }}>
                <AvatarFallback 
                  style={{ backgroundColor: userColor, color: 'white' }}
                  className="text-sm font-bold"
                >
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div 
                className="h-10 w-10 rounded-full flex items-center justify-center border-2"
                style={{ backgroundColor: userColor + '20', borderColor: userColor }}
              >
                <Monitor className="h-5 w-5" style={{ color: userColor }} />
              </div>
            )}
          </div>

          {/* محتوى السجل */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2 space-x-reverse">
                <h3 className="text-sm font-semibold text-foreground truncate" data-testid="log-display-name">
                  {displayName}
                </h3>
                {isUserAction && (
                  <Badge variant="secondary" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    مستخدم
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-1 space-x-reverse">
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTime(log.timestamp)}
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(log.message);
                    }}>
                      نسخ الرسالة
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(JSON.stringify(log, null, 2));
                    }}>
                      نسخ التفاصيل الكاملة
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}>
                      {isExpanded ? 'إخفاء التفاصيل' : 'إظهار التفاصيل'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* مستوى السجل والمصدر */}
            <div className="flex items-center space-x-2 space-x-reverse mb-2">
              <Badge 
                variant={log.level === 'error' ? 'destructive' : 'secondary'}
                className="text-xs flex items-center space-x-1 space-x-reverse"
              >
                {getLevelIcon(log.level)}
                <span>{log.level.toUpperCase()}</span>
              </Badge>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{log.source}</span>
            </div>

            {/* الرسالة */}
            <div className="text-sm text-foreground">
              <p className={isExpanded ? '' : 'line-clamp-2'} data-testid="log-message">
                {log.message}
              </p>
            </div>

            {/* البيانات الإضافية عند التوسع */}
            {isExpanded && log.meta && (
              <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground">البيانات الإضافية:</h4>
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