import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Download, 
  Settings,
  TrendingUp,
  Users,
  Monitor,
  AlertCircle,
  Activity,
  Zap,
  BarChart3,
  X,
  Wifi,
  WifiOff,
  AlertTriangle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "@/lib/i18n";

interface LogsHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  totalLogs: number;
  filteredLogs: number;
  onRefresh: () => void;
  onDownload: () => void;
  onClearLogs: () => void;
  isConnected: boolean;
}

export function LogsHeader({
  searchTerm,
  onSearchChange,
  totalLogs,
  filteredLogs,
  onRefresh,
  onDownload,
  onClearLogs,
  isConnected
}: LogsHeaderProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-background/95 to-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 border-b shadow-lg">
      {/* الرأس الرئيسي المحسّن */}
      <div className="px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="p-2 bg-primary/10 rounded-lg animate-pulse">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center space-x-2 space-x-reverse" data-testid="logs-title">
                <span>{t('logs_monitor_title')}</span>
                <Activity className="h-4 w-4 text-primary animate-pulse" />
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground" data-testid="logs-count-display">
                {t('logs_count').replace('{filtered}', filteredLogs.toLocaleString()).replace('{total}', totalLogs.toLocaleString())}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 space-x-reverse">
            {/* حالة الاتصال */}
            <div className="flex flex-col items-center space-y-1">
              <div className="relative">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-emerald-600 dark:text-emerald-400" data-testid="wifi-connected" />
                ) : (
                  <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" data-testid="wifi-disconnected" />
                )}
                <div className={`absolute -top-1 -right-1 h-2 w-2 rounded-full animate-pulse ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}></div>
              </div>
              <span className={`text-xs font-medium ${
                isConnected 
                  ? 'text-emerald-700 dark:text-emerald-300' 
                  : 'text-amber-700 dark:text-amber-300'
              }`} data-testid="connection-status-text">
                {isConnected ? 'متصل' : 'غير متصل'}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              data-testid="button-toggle-search"
              className="relative hover:bg-primary/10 transition-all duration-200"
              title={t('search_expand_tooltip')}
            >
              <Search className="h-4 w-4" />
              {searchTerm && (
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse"></div>
              )}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  data-testid="button-actions-menu"
                  className="hover:bg-primary/10 transition-all duration-200"
                  title={t('logs_actions_menu')}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuLabel className="flex items-center space-x-2 space-x-reverse">
                  <Zap className="h-4 w-4" />
                  <span>{t('logs_actions_menu')}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onRefresh} className="cursor-pointer">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t('refresh_logs')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDownload} className="cursor-pointer">
                  <Download className="h-4 w-4 mr-2" />
                  {t('download_logs_json')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onClearLogs} className="text-destructive cursor-pointer hover:bg-destructive/10">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {t('clear_all_logs')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* شريط البحث القابل للتوسع المحسّن */}
      {isSearchExpanded && (
        <div className="px-3 sm:px-4 pb-3 animate-in slide-in-from-top duration-300">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search_logs_placeholder')}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-8 bg-background/80 backdrop-blur-sm border-2 focus:border-primary/50 transition-all duration-200"
              data-testid="input-search-logs"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted/50"
                data-testid="button-clear-search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}


    </div>
  );
}