import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
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
  Target,
  Clock,
  BarChart3,
  CheckCircle,
  XCircle,
  TrendingDown,
  Calendar,
  Timer,
  Shield,
  Loader2
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
  logs?: LogEntry[];
  onFilterChange?: (filters: { level?: string; source?: string; userId?: number }) => void;
  loadingOverride?: boolean;
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

// Static gradient variants to avoid dynamic Tailwind class issues
const GRADIENT_VARIANTS = {
  'from-blue-500 to-blue-600': {
    bgLight: 'from-white/90 via-blue-50/70 to-blue-100/90',
    bgDark: 'dark:from-slate-800/40 dark:via-slate-700/30 dark:to-slate-900/40',
    before: 'before:bg-gradient-to-r before:from-blue-500/10 before:to-blue-600/10',
    shadow: 'group-hover:shadow-blue-500/50',
    border: 'border-blue-500/20',
    iconBg: 'bg-gradient-to-br from-blue-500/30 to-blue-600/30 dark:from-blue-400/30 dark:to-blue-500/30'
  },
  'from-red-500 to-red-600': {
    bgLight: 'from-white/90 via-red-50/70 to-red-100/90',
    bgDark: 'dark:from-slate-800/40 dark:via-slate-700/30 dark:to-slate-900/40',
    before: 'before:bg-gradient-to-r before:from-red-500/10 before:to-red-600/10',
    shadow: 'group-hover:shadow-red-500/50',
    border: 'border-red-500/20',
    iconBg: 'bg-gradient-to-br from-red-500/30 to-red-600/30 dark:from-red-400/30 dark:to-red-500/30'
  },
  'from-green-500 to-green-600': {
    bgLight: 'from-white/90 via-green-50/70 to-green-100/90',
    bgDark: 'dark:from-slate-800/40 dark:via-slate-700/30 dark:to-slate-900/40',
    before: 'before:bg-gradient-to-r before:from-green-500/10 before:to-green-600/10',
    shadow: 'group-hover:shadow-green-500/50',
    border: 'border-green-500/20',
    iconBg: 'bg-gradient-to-br from-green-500/30 to-green-600/30 dark:from-green-400/30 dark:to-green-500/30'
  },
  'from-purple-500 to-purple-600': {
    bgLight: 'from-white/90 via-purple-50/70 to-purple-100/90',
    bgDark: 'dark:from-slate-800/40 dark:via-slate-700/30 dark:to-slate-900/40',
    before: 'before:bg-gradient-to-r before:from-purple-500/10 before:to-purple-600/10',
    shadow: 'group-hover:shadow-purple-500/50',
    border: 'border-purple-500/20',
    iconBg: 'bg-gradient-to-br from-purple-500/30 to-purple-600/30 dark:from-purple-400/30 dark:to-purple-500/30'
  },
  'from-cyan-500 to-cyan-600': {
    bgLight: 'from-white/90 via-cyan-50/70 to-cyan-100/90',
    bgDark: 'dark:from-slate-800/40 dark:via-slate-700/30 dark:to-slate-900/40',
    before: 'before:bg-gradient-to-r before:from-cyan-500/10 before:to-cyan-600/10',
    shadow: 'group-hover:shadow-cyan-500/50',
    border: 'border-cyan-500/20',
    iconBg: 'bg-gradient-to-br from-cyan-500/30 to-cyan-600/30 dark:from-cyan-400/30 dark:to-cyan-500/30'
  },
  'from-orange-500 to-orange-600': {
    bgLight: 'from-white/90 via-orange-50/70 to-orange-100/90',
    bgDark: 'dark:from-slate-800/40 dark:via-slate-700/30 dark:to-slate-900/40',
    before: 'before:bg-gradient-to-r before:from-orange-500/10 before:to-orange-600/10',
    shadow: 'group-hover:shadow-orange-500/50',
    border: 'border-orange-500/20',
    iconBg: 'bg-gradient-to-br from-orange-500/30 to-orange-600/30 dark:from-orange-400/30 dark:to-orange-500/30'
  }
};

export function LogsStatsDashboard({ 
  logs = [], 
  onFilterChange, 
  loadingOverride = false 
}: LogsStatsDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // جلب البيانات المحسنة من API الجديدة
  const { data: enhancedStats, isLoading: isLoadingEnhanced } = useQuery({
    queryKey: ['/api/logs/enhanced-stats'],
    staleTime: 30000, // 30 ثانية
    refetchInterval: 60000, // إعادة تحديث كل دقيقة
  });

  // جلب العدادات التراكمية للمستخدمين
  const { data: userCounters, isLoading: isLoadingCounters } = useQuery({
    queryKey: ['/api/logs/user-counters'],
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const isLoading = loadingOverride || isLoadingEnhanced || isLoadingCounters;

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

  // إنشاء المقاييس المحسنة باستخدام البيانات المحسنة أو البيانات التقليدية
  const enhancedMetrics = useMemo(() => {
    if (enhancedStats && userCounters) {
      // استخدام البيانات المحسنة من API
      return {
        // إحصائيات أساسية محسنة
        totalLogs: enhancedStats.total || 0,
        errors: enhancedStats.levels?.error || 0,
        warnings: enhancedStats.levels?.warn || 0,
        info: enhancedStats.levels?.info || 0,
        debug: enhancedStats.levels?.debug || 0,
        
        // معدلات النمو والتحسينات
        growthRates: enhancedStats.growthRates || { daily: 0, weekly: 0, monthly: 0 },
        
        // معلومات المستخدمين المحسنة
        activeUsers: enhancedStats.userMetrics?.totalUniqueUsers || 0,
        activeUsersToday: enhancedStats.userMetrics?.activeUsersToday || 0,
        topUsers: enhancedStats.userMetrics?.topUsers || [],
        
        // معلومات المصادر المحسنة
        activeSources: enhancedStats.sourceMetrics?.totalSources || 0,
        sourceDetails: enhancedStats.sourceMetrics?.sourceDetails || [],
        
        // مؤشرات الأداء
        performanceMetrics: enhancedStats.performanceMetrics || {
          avgLogsPerDay: 0,
          avgLogsPerHour: 0,
          errorRate: 0,
          warningRate: 0
        },
        
        // البيانات الزمنية المحسنة
        timeSeries: enhancedStats.timeSeries || {
          today: 0,
          yesterday: 0,
          lastWeek: 0,
          lastMonth: 0
        },
        
        // العدادات التراكمية
        cumulativeCounters: userCounters?.summaries?.global || {
          daily: {},
          monthly: {},
          totalActions: 0,
          mostActiveDay: null,
          mostActiveAction: null
        }
      };
    }
    
    // fallback للبيانات التقليدية
    const totalLogs = logs.length;
    const errors = logs.filter(l => l.level === 'error').length;
    const warnings = logs.filter(l => l.level === 'warn').length;
    const info = logs.filter(l => l.level === 'info').length;
    const debug = logs.filter(l => l.level === 'debug').length;
    
    return {
      totalLogs,
      errors,
      warnings,
      info,
      debug,
      growthRates: { daily: 0, weekly: 0, monthly: 0 },
      activeUsers: new Set(logs.filter(l => l.userId).map(l => l.userId)).size,
      activeUsersToday: 0,
      topUsers: [],
      activeSources: new Set(logs.map(l => l.source)).size,
      sourceDetails: [],
      performanceMetrics: {
        avgLogsPerDay: Math.round(totalLogs / 30),
        avgLogsPerHour: Math.round(totalLogs / 24),
        errorRate: totalLogs > 0 ? (errors / totalLogs * 100) : 0,
        warningRate: totalLogs > 0 ? (warnings / totalLogs * 100) : 0
      },
      timeSeries: { today: 0, yesterday: 0, lastWeek: 0, lastMonth: 0 },
      cumulativeCounters: {
        daily: {},
        monthly: {},
        totalActions: 0,
        mostActiveDay: null,
        mostActiveAction: null
      }
    };
  }, [enhancedStats, userCounters, logs]);

  // التوافق مع النظام القديم
  const stats = useMemo(() => {
    const errorRate = enhancedMetrics.totalLogs > 0 ? 
      ((enhancedMetrics.errors / enhancedMetrics.totalLogs) * 100).toFixed(1) : '0';
    const warningRate = enhancedMetrics.totalLogs > 0 ? 
      ((enhancedMetrics.warnings / enhancedMetrics.totalLogs) * 100).toFixed(1) : '0';
    
    return {
      ...enhancedMetrics,
      errorRate,
      warningRate,
      levelDistribution: [
        { name: t('log_level_error'), value: enhancedMetrics.errors, color: LEVEL_COLORS.error, level: 'error' },
        { name: t('log_level_warn'), value: enhancedMetrics.warnings, color: LEVEL_COLORS.warn, level: 'warn' },
        { name: t('log_level_info'), value: enhancedMetrics.info, color: LEVEL_COLORS.info, level: 'info' },
        { name: t('log_level_debug'), value: enhancedMetrics.debug, color: LEVEL_COLORS.debug, level: 'debug' }
      ].filter(item => item.value > 0),
      timeDistribution,
      sourceActivity,
      userActivity
    };
  }, [enhancedMetrics, timeDistribution, sourceActivity, userActivity]);

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

  // تحديد metrics باستخدام نهج AdminDashboardStats
  const metricsData = useMemo(() => {
    if (isLoading) {
      return [];
    }

    return [
      {
        title: t('log_overview'),
        gradient: 'from-blue-500 to-blue-600',
        icon: Database,
        metrics: [
          {
            label: t('total_logs'),
            value: stats.totalLogs?.toLocaleString() || '0',
            subLabel: t('all_time'),
            icon: Database,
            trend: stats.growthRates?.daily ? 
              `${stats.growthRates.daily > 0 ? '+' : ''}${stats.growthRates.daily.toFixed(1)}% ${t('today')}` : null,
            trendUp: stats.growthRates?.daily > 0,
          },
          {
            label: t('logs_today'),
            value: stats.timeSeries?.today?.toLocaleString() || '0',
            subLabel: t('since_midnight'),
            icon: Calendar,
            trend: stats.timeSeries?.yesterday ? 
              `${((stats.timeSeries.today - stats.timeSeries.yesterday) / Math.max(stats.timeSeries.yesterday, 1) * 100).toFixed(1)}% ${t('vs_yesterday')}` : null,
            trendUp: (stats.timeSeries?.today || 0) > (stats.timeSeries?.yesterday || 0),
          },
          {
            label: t('hourly_average'),
            value: stats.performanceMetrics?.avgLogsPerHour?.toLocaleString() || '0',
            subLabel: t('logs_per_hour'),
            icon: Clock,
          }
        ]
      },
      {
        title: t('error_monitoring'),
        gradient: 'from-red-500 to-red-600',
        icon: AlertTriangle,
        metrics: [
          {
            label: t('total_errors'),
            value: stats.errors?.toLocaleString() || '0',
            subLabel: `${stats.errorRate || '0'}% ${t('of_total')}`,
            icon: XCircle,
            trend: stats.performanceMetrics?.errorRate ? 
              `${stats.performanceMetrics.errorRate < 5 ? 'جيد' : stats.performanceMetrics.errorRate < 15 ? 'متوسط' : 'يحتاج تحسين'}` : null,
            trendUp: (stats.performanceMetrics?.errorRate || 0) < 5,
            filterKey: { type: 'level', value: 'error' }
          },
          {
            label: t('warnings'),
            value: stats.warnings?.toLocaleString() || '0',
            subLabel: `${stats.warningRate || '0'}% ${t('of_total')}`,
            icon: AlertTriangle,
            filterKey: { type: 'level', value: 'warn' }
          },
          {
            label: t('error_rate'),
            value: `${stats.performanceMetrics?.errorRate?.toFixed(1) || '0'}%`,
            subLabel: t('system_reliability'),
            icon: Shield,
          }
        ]
      },
      {
        title: t('user_activity'),
        gradient: 'from-green-500 to-green-600',
        icon: Users,
        metrics: [
          {
            label: t('active_users'),
            value: stats.activeUsers?.toLocaleString() || '0',
            subLabel: t('unique_users'),
            icon: Users,
          },
          {
            label: t('users_today'),
            value: stats.activeUsersToday?.toLocaleString() || '0',
            subLabel: t('active_today'),
            icon: CheckCircle,
          },
          {
            label: t('cumulative_actions'),
            value: stats.cumulativeCounters?.totalActions?.toLocaleString() || '0',
            subLabel: t('all_actions'),
            icon: BarChart3,
          }
        ]
      },
      {
        title: t('system_performance'),
        gradient: 'from-purple-500 to-purple-600',
        icon: Zap,
        metrics: [
          {
            label: t('active_sources'),
            value: stats.activeSources?.toLocaleString() || '0',
            subLabel: t('log_sources'),
            icon: Target,
          },
          {
            label: t('daily_average'),
            value: stats.performanceMetrics?.avgLogsPerDay?.toLocaleString() || '0',
            subLabel: t('logs_per_day'),
            icon: TrendingUp,
            trend: stats.timeSeries?.lastWeek ? 
              `${((stats.performanceMetrics?.avgLogsPerDay || 0) > (stats.timeSeries.lastWeek / 7) ? '+' : '')}${(((stats.performanceMetrics?.avgLogsPerDay || 0) - (stats.timeSeries.lastWeek / 7)) / Math.max(stats.timeSeries.lastWeek / 7, 1) * 100).toFixed(1)}% ${t('vs_last_week')}` : null,
            trendUp: (stats.performanceMetrics?.avgLogsPerDay || 0) > (stats.timeSeries?.lastWeek || 0) / 7,
          },
          {
            label: t('system_uptime'),
            value: `${(100 - (stats.performanceMetrics?.errorRate || 0)).toFixed(1)}%`,
            subLabel: t('availability'),
            icon: Timer,
            trend: (100 - (stats.performanceMetrics?.errorRate || 0)) >= 99 ? 'ممتاز' : 
                   (100 - (stats.performanceMetrics?.errorRate || 0)) >= 95 ? 'جيد' : 'يحتاج تحسين',
            trendUp: (100 - (stats.performanceMetrics?.errorRate || 0)) >= 95,
          }
        ]
      },
      // بطاقة جديدة للمقاييس المتقدمة والعدادات التراكمية
      {
        title: t('advanced_analytics'),
        gradient: 'from-cyan-500 to-cyan-600',
        icon: BarChart3,
        metrics: [
          {
            label: t('weekly_growth'),
            value: stats.growthRates?.weekly ? `${stats.growthRates.weekly > 0 ? '+' : ''}${stats.growthRates.weekly.toFixed(1)}%` : '0%',
            subLabel: t('logs_vs_last_week'),
            icon: TrendingUp,
            trend: stats.growthRates?.weekly ? (stats.growthRates.weekly > 0 ? 'نمو إيجابي' : 'تراجع') : null,
            trendUp: (stats.growthRates?.weekly || 0) > 0,
          },
          {
            label: t('monthly_trend'),
            value: stats.growthRates?.monthly ? `${stats.growthRates.monthly > 0 ? '+' : ''}${stats.growthRates.monthly.toFixed(1)}%` : '0%',
            subLabel: t('logs_vs_last_month'),
            icon: Calendar,
            trend: stats.growthRates?.monthly ? (stats.growthRates.monthly > 5 ? 'نمو قوي' : stats.growthRates.monthly > 0 ? 'نمو منتظم' : 'مستقر') : null,
            trendUp: (stats.growthRates?.monthly || 0) > 0,
          },
          {
            label: t('peak_activity'),
            value: stats.cumulativeCounters?.mostActiveDay || t('no_data'),
            subLabel: t('busiest_day'),
            icon: Activity,
          }
        ]
      },
      // بطاقة للتوزيع المتقدم للبيانات
      {
        title: t('data_distribution'),
        gradient: 'from-orange-500 to-orange-600',
        icon: BarChart3,
        metrics: [
          {
            label: t('info_logs'),
            value: stats.info?.toLocaleString() || '0',
            subLabel: `${((stats.info || 0) / Math.max(stats.totalLogs, 1) * 100).toFixed(1)}% ${t('of_total')}`,
            icon: Info,
            filterKey: { type: 'level', value: 'info' }
          },
          {
            label: t('debug_logs'),
            value: stats.debug?.toLocaleString() || '0',
            subLabel: `${((stats.debug || 0) / Math.max(stats.totalLogs, 1) * 100).toFixed(1)}% ${t('of_total')}`,
            icon: Target,
            filterKey: { type: 'level', value: 'debug' }
          },
          {
            label: t('top_source'),
            value: stats.sourceDetails?.[0]?.source || t('no_data'),
            subLabel: `${stats.sourceDetails?.[0]?.total || 0} ${t('logs')}`,
            icon: Database,
            trend: stats.sourceDetails?.[0]?.errorRate != null ? `${stats.sourceDetails[0].errorRate.toFixed(1)}% ${t('error_rate')}` : null,
            trendUp: (stats.sourceDetails?.[0]?.errorRate || 0) < 5,
          }
        ]
      }
    ];
  }, [stats, isLoading]);

  if (!isExpanded) {
    return (
      <div className="mb-6">
        <Card className="border-2 border-dashed border-primary/20 bg-white/50 dark:bg-slate-800/50 hover:border-primary/40 hover:bg-white/70 dark:hover:bg-slate-800/70 transition-all cursor-pointer" 
              onClick={() => setIsExpanded(true)}
              data-testid="stats-dashboard-collapsed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 space-x-reverse">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <Activity className="h-5 w-5 text-primary" />
                )}
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100" data-testid="dashboard-title">{t('stats_dashboard_title')}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400" data-testid="dashboard-description">{t('dashboard_description')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Badge variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100" data-testid="total-logs-badge">
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    `${stats.totalLogs.toLocaleString()} ${t('logs_count_plural')}`
                  )}
                </Badge>
                <Button variant="ghost" size="sm" className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" data-testid="button-expand-dashboard">
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
    <div className="mb-4 space-y-4 xl:space-y-6" data-testid="stats-dashboard-expanded">
      {/* الرأس المضغوط */}
      <Card className="border-primary/20 bg-white/70 dark:bg-slate-800/70">
        <CardHeader className="pb-2 pt-3 xl:pb-3 xl:pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="p-1.5 bg-primary/10 dark:bg-primary/20 rounded-md">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center space-x-1.5 space-x-reverse text-slate-900 dark:text-slate-100" data-testid="dashboard-title">
                  <span>{t('stats_dashboard_title')}</span>
                  <TrendingUp className="h-3 w-3 text-primary animate-pulse" />
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 dark:text-slate-400" data-testid="dashboard-description">{t('dashboard_description')}</CardDescription>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(false)}
              className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              data-testid="button-collapse-dashboard"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* البطاقات المحسّنة باستخدام نهج AdminDashboardStats */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div 
              key={i}
              className="relative border border-slate-300/60 dark:border-slate-600/50 rounded-xl p-4 bg-gradient-to-br from-slate-100/80 via-white/70 to-slate-50/80 dark:from-slate-800/40 dark:via-slate-700/30 dark:to-slate-900/40 backdrop-blur-md shadow-lg shadow-slate-400/10 dark:shadow-slate-900/30 motion-safe:animate-pulse"
              data-testid={`loading-stats-card-${i}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 w-20 bg-slate-300/60 dark:bg-slate-600/50 rounded"></div>
                <div className="h-4 w-4 bg-slate-300/60 dark:bg-slate-600/50 rounded"></div>
              </div>
              <div className="h-8 w-16 bg-slate-300/60 dark:bg-slate-600/50 rounded mb-2"></div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-slate-200/60 dark:bg-slate-600/30 rounded"></div>
                <div className="h-3 w-3/4 bg-slate-200/60 dark:bg-slate-600/30 rounded"></div>
                <div className="h-3 w-1/2 bg-slate-200/60 dark:bg-slate-600/30 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6" data-testid="enhanced-metrics-grid">
          {metricsData.map((section, sectionIndex) => {
            const IconComponent = section.icon;
            return (
              <div
                key={sectionIndex}
                className={`group relative border border-slate-300/60 dark:border-slate-600/50 rounded-xl p-4 
                  bg-gradient-to-br ${GRADIENT_VARIANTS[section.gradient as keyof typeof GRADIENT_VARIANTS]?.bgLight || 'from-white/90 via-slate-50/70 to-slate-100/90'} ${GRADIENT_VARIANTS[section.gradient as keyof typeof GRADIENT_VARIANTS]?.bgDark || 'dark:from-slate-800/40 dark:via-slate-700/30 dark:to-slate-900/40'} 
                  backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 
                  hover:scale-[1.02] hover:border-slate-400/70 dark:hover:border-slate-500/60
                  before:absolute before:inset-0 before:rounded-xl ${GRADIENT_VARIANTS[section.gradient as keyof typeof GRADIENT_VARIANTS]?.before || 'before:bg-gradient-to-r before:from-slate-500/10 before:to-slate-500/10'} before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 ${GRADIENT_VARIANTS[section.gradient as keyof typeof GRADIENT_VARIANTS]?.shadow || ''}`}
                data-testid={`stats-card-${sectionIndex}`}
              >
                {/* العنوان الرئيسي */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {section.title}
                  </h3>
                  <div className={`p-1.5 rounded-lg ${GRADIENT_VARIANTS[section.gradient as keyof typeof GRADIENT_VARIANTS]?.iconBg || 'bg-gradient-to-br from-slate-500/30 to-slate-600/30'} border border-slate-400/40 dark:border-slate-400/20 shadow-lg transition-shadow duration-300`}>
                    <IconComponent className="h-4 w-4 text-slate-800 dark:text-slate-100 group-hover:scale-110 transition-transform duration-200" />
                  </div>
                </div>

                {/* المقاييس الفرعية */}
                <div className="space-y-2">
                  {section.metrics.map((metric, metricIndex) => {
                    const MetricIcon = metric.icon;
                    return (
                      <div
                        key={metricIndex}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-100/70 dark:bg-slate-800/40 hover:bg-slate-200/80 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (metric.filterKey && onFilterChange) {
                            switch (metric.filterKey.type) {
                              case 'level':
                                onFilterChange({ level: metric.filterKey.value });
                                break;
                              case 'source':
                                onFilterChange({ source: metric.filterKey.value });
                                break;
                              case 'user':
                                onFilterChange({ userId: metric.filterKey.value });
                                break;
                            }
                          }
                        }}
                        data-testid={`metric-${sectionIndex}-${metricIndex}`}
                      >
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <MetricIcon className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                          <div>
                            <div className="text-xs text-slate-900 dark:text-slate-200 font-medium">
                              {metric.label}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              {metric.subLabel}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {metric.value}
                          </div>
                          {metric.trend && (
                            <div className={`text-xs flex items-center space-x-1 space-x-reverse ${
                              metric.trendUp ? 'text-green-300 dark:text-green-400' : 'text-red-300 dark:text-red-400'
                            }`}>
                              {metric.trendUp ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              <span>{metric.trend}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* الرسوم البيانية المتجاوبة محسّنة للسطح المكتبي */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 xl:gap-6" data-testid="charts-grid">
        {/* السجلات عبر الزمن */}
        <Card className="col-span-1 md:col-span-2 xl:col-span-3 2xl:col-span-4" data-testid="chart-logs-over-time">
          <CardHeader className="pb-2 xl:pb-3">
            <CardTitle className="text-sm xl:text-base flex items-center space-x-1.5 space-x-reverse">
              <TrendingUp className="h-3 w-3 xl:h-4 xl:w-4" />
              <span>{t('logs_over_time')} - {t('last_24_hours')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 xl:pt-1">
            <div className="h-48 sm:h-40 xl:h-56 2xl:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.timeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10 }}
                    stroke="currentColor"
                    opacity={0.7}
                    interval="preserveStartEnd"
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
                    strokeWidth={2}
                    dot={false}
                    name={t('total_logs')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="errors" 
                    stroke={CHART_COLORS.error} 
                    strokeWidth={2}
                    dot={false}
                    name={t('total_errors')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="warnings" 
                    stroke={CHART_COLORS.warn} 
                    strokeWidth={2}
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
          <CardHeader className="pb-2 xl:pb-3">
            <CardTitle className="text-sm xl:text-base">{t('logs_distribution')}</CardTitle>
            <CardDescription className="text-xs xl:text-sm">{t('click_to_filter')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 xl:pt-1">
            <div className="h-48 sm:h-40 xl:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.levelDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={30}
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
          <CardHeader className="pb-2 xl:pb-3">
            <CardTitle className="text-sm xl:text-base">{t('top_sources')}</CardTitle>
            <CardDescription className="text-xs xl:text-sm">{t('click_to_filter')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 xl:pt-1">
            <div className="h-48 sm:h-40 xl:h-56">
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
                    tick={{ fontSize: 9 }}
                    stroke="currentColor"
                    opacity={0.7}
                    width={70}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill={CHART_COLORS.secondary}
                    onClick={(data) => handleChartClick(data, 'source')}
                    className="cursor-pointer"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* المستخدمين النشطين */}
        {stats.userActivity.length > 0 && (
          <Card data-testid="chart-active-users">
            <CardHeader className="pb-2 xl:pb-3">
              <CardTitle className="text-sm xl:text-base">{t('active_users_chart')}</CardTitle>
              <CardDescription className="text-xs xl:text-sm">{t('click_to_filter')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 xl:pt-1">
              <div className="h-48 sm:h-40 xl:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.userActivity.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                    <XAxis 
                      dataKey="username" 
                      tick={{ fontSize: 9 }}
                      stroke="currentColor"
                      opacity={0.7}
                      angle={-45}
                      textAnchor="end"
                      height={50}
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
                      radius={[4, 4, 0, 0]}
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
              لا توجد سجلات متاحة. إما أنه لم يتم إنشاء سجلات بعد أو تم حذف جميع السجلات.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}