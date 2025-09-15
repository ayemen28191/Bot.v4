import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Filter, 
  TrendingUp,
  Users,
  Monitor,
  AlertCircle,
  Activity
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "@/lib/i18n";

interface StickyFilterTabsProps {
  selectedTab: string;
  onTabChange: (value: string) => void;
  selectedLevel: string | null;
  onLevelChange: (value: string | null) => void;
  selectedSource: string | null;
  onSourceChange: (value: string | null) => void;
  totalLogs: number;
  userLogsCount: number;
  systemLogsCount: number;
}

export function StickyFilterTabs({
  selectedTab,
  onTabChange,
  selectedLevel,
  onLevelChange,
  selectedSource,
  onSourceChange,
  totalLogs,
  userLogsCount,
  systemLogsCount
}: StickyFilterTabsProps) {
  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-background/95 to-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 border-b shadow-sm">
      {/* تبويبات الفلترة المحسّنة */}
      <div className="px-3 sm:px-4 py-3">
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
              <Badge variant="secondary" className="ml-1.5 text-xs bg-emerald/10 text-emerald-600">
                {userLogsCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs sm:text-sm font-medium transition-all duration-200" data-testid="tab-system">
              <span className="flex items-center space-x-1.5 space-x-reverse">
                <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{t('filter_system')}</span>
              </span>
              <Badge variant="secondary" className="ml-1.5 text-xs bg-blue/10 text-blue-600">
                {systemLogsCount}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* مرشحات المستوى المحسّنة */}
      <div className="px-3 sm:px-4 pb-3">
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