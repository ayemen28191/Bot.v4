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
  AlertCircle
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
  stats: {
    errors: number;
    warnings: number;
    info: number;
    debug: number;
    users: number;
    sources: number;
  };
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
  stats,
  onRefresh,
  onDownload,
  onClearLogs
}: LogsHeaderProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      {/* الرأس الرئيسي */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground" data-testid="logs-title">
              مراقب السجلات
            </h1>
            <p className="text-xs text-muted-foreground">
              عرض {filteredLogs.toLocaleString()} من {totalLogs.toLocaleString()} سجل
            </p>
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              data-testid="button-toggle-search"
            >
              <Search className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="button-actions-menu">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onRefresh}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  تحديث السجلات
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  تنزيل JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onClearLogs} className="text-destructive">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  مسح جميع السجلات
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* شريط البحث القابل للتوسع */}
      {isSearchExpanded && (
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في الرسائل والبيانات الإضافية..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
              data-testid="input-search-logs"
            />
          </div>
        </div>
      )}

      {/* الإحصائيات السريعة */}
      <Card className="mx-4 mb-3">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="text-center">
              <div className="flex items-center justify-center text-red-500 mb-1">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="text-xs font-medium">أخطاء</span>
              </div>
              <div className="text-lg font-bold" data-testid="stat-errors">{stats.errors}</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center text-yellow-500 mb-1">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="text-xs font-medium">تحذيرات</span>
              </div>
              <div className="text-lg font-bold" data-testid="stat-warnings">{stats.warnings}</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center text-blue-500 mb-1">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-xs font-medium">معلومات</span>
              </div>
              <div className="text-lg font-bold" data-testid="stat-info">{stats.info}</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center text-green-500 mb-1">
                <Users className="h-4 w-4 mr-1" />
                <span className="text-xs font-medium">مستخدمين</span>
              </div>
              <div className="text-lg font-bold" data-testid="stat-users">{stats.users}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* تبويبات الفلترة */}
      <div className="px-4 pb-3">
        <Tabs value={selectedTab} onValueChange={onTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="text-xs" data-testid="tab-all">
              الكل
              <Badge variant="secondary" className="ml-1 text-xs">{totalLogs}</Badge>
            </TabsTrigger>
            <TabsTrigger value="user" className="text-xs" data-testid="tab-user">
              المستخدمين
              <Badge variant="secondary" className="ml-1 text-xs">{stats.users}</Badge>
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs" data-testid="tab-system">
              النظام
              <Badge variant="secondary" className="ml-1 text-xs">{stats.sources}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* مرشحات المستوى */}
      <div className="px-4 pb-3">
        <div className="flex space-x-2 space-x-reverse overflow-x-auto">
          <Button
            variant={selectedLevel === null ? "default" : "outline"}
            size="sm"
            onClick={() => onLevelChange(null)}
            className="flex-shrink-0"
            data-testid="filter-level-all"
          >
            الكل
          </Button>
          
          {['error', 'warn', 'info', 'debug'].map((level) => (
            <Button
              key={level}
              variant={selectedLevel === level ? "default" : "outline"}
              size="sm"
              onClick={() => onLevelChange(level)}
              className="flex-shrink-0"
              data-testid={`filter-level-${level}`}
            >
              {level === 'error' && '🔴'}
              {level === 'warn' && '🟡'}
              {level === 'info' && '🔵'}
              {level === 'debug' && '⚪'}
              <span className="ml-1">{level.toUpperCase()}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}