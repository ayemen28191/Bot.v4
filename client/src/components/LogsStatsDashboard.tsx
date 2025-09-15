import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { 
  Activity, 
  Users, 
  AlertTriangle, 
  Info, 
  Zap, 
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Database,
  Target
} from "lucide-react";
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

interface LogsStatsDashboardProps {
  logs: LogEntry[];
  onFilterChange?: (filters: { level?: string; source?: string; userId?: number }) => void;
}

// الألوان للرسوم البيانية مع دعم الوضع الداكن
const CHART_COLORS = {
  error: '#ef4444',
  warn: '#f59e0b', 
  info: '#3b82f6',
  debug: '#10b981',
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#06b6d4'
};

const LEVEL_COLORS = {
  error: CHART_COLORS.error,
  warn: CHART_COLORS.warn,
  info: CHART_COLORS.info,
  debug: CHART_COLORS.debug
};

export function LogsStatsDashboard({ logs, onFilterChange }: LogsStatsDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // السجلات عبر الزمن (آخر 24 ساعة) - منفصل عن الـ stats الرئيسي
  const timeDistribution = useMemo(() => {
    const now = new Date();
    const hours = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const hourLogs = logs.filter(log => {
        const logTime = new Date(log.timestamp);
        return logTime >= hourStart && logTime < hourEnd;
      });
      
      hours.push({
        hour: hourStart.getHours(),
        time: hourStart.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        total: hourLogs.length,
        errors: hourLogs.filter(l => l.level === 'error').length,
        warnings: hourLogs.filter(l => l.level === 'warn').length,
        info: hourLogs.filter(l => l.level === 'info').length,
        debug: hourLogs.filter(l => l.level === 'debug').length
      });
    }
    return hours;
  }, [logs]);
  
  // أكثر المصادر نشاطاً - منفصل عن الـ stats الرئيسي
  const sourceActivity = useMemo(() => {
    const sourceCounts: { [key: string]: number } = {};
    logs.forEach(log => {
      sourceCounts[log.source] = (sourceCounts[log.source] || 0) + 1;
    });
    
    return Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [logs]);
  
  // المستخدمين النشطين - منفصل عن الـ stats الرئيسي
  const userActivity = useMemo(() => {
    const userCounts: { [key: string]: { count: number; username: string; displayName?: string } } = {};
    logs.filter(log => log.userId && log.username).forEach(log => {
      const key = log.userId!.toString();
      if (!userCounts[key]) {
        userCounts[key] = {
          count: 0,
          username: log.username!,
          displayName: log.userDisplayName
        };
      }
      userCounts[key].count++;
    });
    
    return Object.entries(userCounts)
      .map(([userId, data]) => ({
        userId: parseInt(userId),
        username: data.username,
        displayName: data.displayName,
        count: data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [logs]);

  // تجميع البيانات وتحليلها - بدون nested useMemo
  const stats = useMemo(() => {
    // الإحصائيات الأساسية
    const totalLogs = logs.length;
    const errors = logs.filter(l => l.level === 'error').length;
    const warnings = logs.filter(l => l.level === 'warn').length;
    const info = logs.filter(l => l.level === 'info').length;
    const debug = logs.filter(l => l.level === 'debug').length;
    
    const errorRate = totalLogs > 0 ? ((errors / totalLogs) * 100).toFixed(1) : '0';
    const warningRate = totalLogs > 0 ? ((warnings / totalLogs) * 100).toFixed(1) : '0';
    
    // المستخدمين والمصادر النشطة
    const activeUsers = new Set(logs.filter(l => l.userId).map(l => l.userId)).size;
    const activeSources = new Set(logs.map(l => l.source)).size;
    
    // توزيع السجلات حسب النوع
    const levelDistribution = [
      { name: t('log_level_error'), value: errors, color: LEVEL_COLORS.error, level: 'error' },
      { name: t('log_level_warn'), value: warnings, color: LEVEL_COLORS.warn, level: 'warn' },
      { name: t('log_level_info'), value: info, color: LEVEL_COLORS.info, level: 'info' },
      { name: t('log_level_debug'), value: debug, color: LEVEL_COLORS.debug, level: 'debug' }
    ].filter(item => item.value > 0);
    
    return {
      totalLogs,
      errors,
      warnings,
      info,
      debug,
      errorRate,
      warningRate,
      activeUsers,
      activeSources,
      levelDistribution,
      timeDistribution,
      sourceActivity,
      userActivity
    };
  }, [logs, timeDistribution, sourceActivity, userActivity]);

  // Custom tooltip للرسوم البيانية
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // معالج النقر على الرسوم البيانية للفلترة
  const handleChartClick = (data: any, type: 'level' | 'source' | 'user') => {
    if (!onFilterChange) return;
    
    switch (type) {
      case 'level':
        onFilterChange({ level: data.level });
        break;
      case 'source':
        onFilterChange({ source: data.source });
        break;
      case 'user':
        onFilterChange({ userId: data.userId });
        break;
    }
  };

  if (!isExpanded) {
    return (
      <div className="mb-6">
        <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors cursor-pointer" 
              onClick={() => setIsExpanded(true)}
              data-testid="stats-dashboard-collapsed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 space-x-reverse">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm" data-testid="dashboard-title">{t('stats_dashboard_title')}</h3>
                  <p className="text-xs text-muted-foreground" data-testid="dashboard-description">{t('dashboard_description')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Badge variant="secondary" className="text-xs" data-testid="total-logs-badge">
                  {stats.totalLogs.toLocaleString()} {t('logs_count_plural')}
                </Badge>
                <Button variant="ghost" size="sm" data-testid="button-expand-dashboard">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-4" data-testid="stats-dashboard-expanded">
      {/* الرأس المضغوط */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="p-1.5 bg-primary/10 rounded-md">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center space-x-1.5 space-x-reverse" data-testid="dashboard-title">
                  <span>{t('stats_dashboard_title')}</span>
                  <TrendingUp className="h-3 w-3 text-primary animate-pulse" />
                </CardTitle>
                <CardDescription className="text-xs" data-testid="dashboard-description">{t('dashboard_description')}</CardDescription>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(false)}
              data-testid="button-collapse-dashboard"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* المقاييس السريعة المضغوطة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="quick-metrics-grid">
        {/* إجمالي السجلات */}
        <Card className="hover:shadow-md transition-shadow" data-testid="metric-total-logs">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t('total_logs')}</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {stats.totalLogs.toLocaleString()}
                </div>
              </div>
              <Database className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* الأخطاء */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" 
              onClick={() => handleChartClick({ level: 'error' }, 'level')}
              data-testid="metric-errors">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t('total_errors')}</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {stats.errors.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stats.errorRate}% {t('percentage_of_total')}
                </div>
              </div>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>

        {/* التحذيرات */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" 
              onClick={() => handleChartClick({ level: 'warn' }, 'level')}
              data-testid="metric-warnings">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t('total_warnings')}</div>
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.warnings.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stats.warningRate}% {t('percentage_of_total')}
                </div>
              </div>
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        {/* المعلومات */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" 
              onClick={() => handleChartClick({ level: 'info' }, 'level')}
              data-testid="metric-info">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t('total_info')}</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {stats.info.toLocaleString()}
                </div>
              </div>
              <Info className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* مقاييس إضافية مضغوطة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="additional-metrics-grid">
        {/* المستخدمين النشطين */}
        <Card className="hover:shadow-md transition-shadow" data-testid="metric-active-users">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t('active_users')}</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {stats.activeUsers}
                </div>
              </div>
              <Users className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* المصادر النشطة */}
        <Card className="hover:shadow-md transition-shadow" data-testid="metric-active-sources">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t('active_sources')}</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {stats.activeSources}
                </div>
              </div>
              <Zap className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        {/* معدل الأخطاء */}
        <Card className="hover:shadow-md transition-shadow" data-testid="metric-error-rate">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t('error_rate')}</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {stats.errorRate}%
                </div>
              </div>
              <Target className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>

        {/* معدل التحذيرات */}
        <Card className="hover:shadow-md transition-shadow" data-testid="metric-warning-rate">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t('warning_rate')}</div>
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.warningRate}%
                </div>
              </div>
              <Target className="h-5 w-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الرسوم البيانية المضغوطة */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" data-testid="charts-grid">
        {/* السجلات عبر الزمن */}
        <Card className="col-span-1 lg:col-span-3" data-testid="chart-logs-over-time">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center space-x-1.5 space-x-reverse">
              <TrendingUp className="h-3 w-3" />
              <span>{t('logs_over_time')} - {t('last_24_hours')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.timeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10 }}
                    stroke="currentColor"
                    opacity={0.7}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    stroke="currentColor"
                    opacity={0.7}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke={CHART_COLORS.primary} 
                    strokeWidth={1.5}
                    dot={false}
                    name={t('total_logs')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="errors" 
                    stroke={CHART_COLORS.error} 
                    strokeWidth={1.5}
                    dot={false}
                    name={t('total_errors')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="warnings" 
                    stroke={CHART_COLORS.warn} 
                    strokeWidth={1.5}
                    dot={false}
                    name={t('total_warnings')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* توزيع السجلات حسب النوع */}
        <Card data-testid="chart-logs-distribution">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('logs_distribution')}</CardTitle>
            <CardDescription className="text-xs">{t('click_to_filter')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.levelDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    dataKey="value"
                    onClick={(data) => handleChartClick(data, 'level')}
                    className="cursor-pointer"
                  >
                    {stats.levelDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* أكثر المصادر نشاطاً */}
        <Card data-testid="chart-top-sources">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('top_sources')}</CardTitle>
            <CardDescription className="text-xs">{t('click_to_filter')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.sourceActivity.slice(0, 5)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis 
                    type="number"
                    tick={{ fontSize: 10 }}
                    stroke="currentColor"
                    opacity={0.7}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="source" 
                    tick={{ fontSize: 10 }}
                    stroke="currentColor"
                    opacity={0.7}
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill={CHART_COLORS.secondary}
                    onClick={(data) => handleChartClick(data, 'source')}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* المستخدمين النشطين */}
        {stats.userActivity.length > 0 && (
          <Card data-testid="chart-active-users">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('active_users_chart')}</CardTitle>
              <CardDescription className="text-xs">{t('click_to_filter')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.userActivity.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                    <XAxis 
                      dataKey="username" 
                      tick={{ fontSize: 10 }}
                      stroke="currentColor"
                      opacity={0.7}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      stroke="currentColor"
                      opacity={0.7}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="count" 
                      fill={CHART_COLORS.accent}
                      onClick={(data) => handleChartClick(data, 'user')}
                      className="cursor-pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>


      {/* رسالة عدم وجود بيانات */}
      {stats.totalLogs === 0 && (
        <Card className="border-dashed" data-testid="no-data-message">
          <CardContent className="p-8 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              {t('no_data_available')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('stats_loading')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}