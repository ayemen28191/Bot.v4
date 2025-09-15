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
  X
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
  selectedTab: string;
  onTabChange: (value: string) => void;
  selectedLevel: string | null;
  onLevelChange: (value: string | null) => void;
  selectedSource: string | null;
  onSourceChange: (value: string | null) => void;
  totalLogs: number;
  filteredLogs: number;
  onRefresh: () => void;
  onDownload: () => void;
  onClearLogs: () => void;
}

export function LogsHeader({
  searchTerm,
  onSearchChange,
  selectedTab,
  onTabChange,
  selectedLevel,
  onLevelChange,
  selectedSource,
  onSourceChange,
  totalLogs,
  filteredLogs,
  onRefresh,
  onDownload,
  onClearLogs
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
          
          <div className="flex items-center space-x-2 space-x-reverse">
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


      {/* تبويبات الفلترة المحسّنة */}
      <div className="px-3 sm:px-4 pb-3">
        <Tabs value={selectedTab} onValueChange={onTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 backdrop-blur-sm">
            <TabsTrigger value="all" className="text-xs sm:text-sm font-medium transition-all duration-200" data-testid="tab-all">
              <span className="flex items-center space-x-1.5 space-x-reverse">
                <Monitor className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{t('filter_all')}</span>
              </span>
              <Badge variant="secondary" className="ml-1.5 text-xs bg-primary/10 text-primary">
                {totalLogs}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="user" className="text-xs sm:text-sm font-medium transition-all duration-200" data-testid="tab-user">
              <span className="flex items-center space-x-1.5 space-x-reverse">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{t('filter_users')}</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs sm:text-sm font-medium transition-all duration-200" data-testid="tab-system">
              <span className="flex items-center space-x-1.5 space-x-reverse">
                <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{t('filter_system')}</span>
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* مرشحات المستوى المحسّنة */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4">
        <div className="flex space-x-2 space-x-reverse overflow-x-auto scrollbar-hide pb-2">
          <Button
            variant={selectedLevel === null ? "default" : "outline"}
            size="sm"
            onClick={() => onLevelChange(null)}
            className="flex-shrink-0 transition-all duration-200 hover:scale-105"
            data-testid="filter-level-all"
          >
            <Filter className="h-3 w-3 mr-1.5" />
            {t('log_level_all')}
          </Button>
          
          {[
            { level: 'error', icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'hover:bg-red-50 dark:hover:bg-red-950/30' },
            { level: 'warn', icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'hover:bg-amber-50 dark:hover:bg-amber-950/30' },
            { level: 'info', icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400', bg: 'hover:bg-blue-50 dark:hover:bg-blue-950/30' },
            { level: 'debug', icon: Monitor, color: 'text-gray-600 dark:text-gray-400', bg: 'hover:bg-gray-50 dark:hover:bg-gray-950/30' }
          ].map(({ level, icon: Icon, color, bg }) => (
            <Button
              key={level}
              variant={selectedLevel === level ? "default" : "outline"}
              size="sm"
              onClick={() => onLevelChange(level)}
              className={`flex-shrink-0 transition-all duration-200 hover:scale-105 ${bg}`}
              data-testid={`filter-level-${level}`}
            >
              <Icon className={`h-3 w-3 mr-1.5 ${selectedLevel === level ? '' : color}`} />
              <span className="hidden sm:inline">{t(`log_level_${level}`)}</span>
              <span className="sm:hidden">{level.toUpperCase()}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}