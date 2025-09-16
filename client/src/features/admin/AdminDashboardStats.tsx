import { Users, KeyRound, Server, Loader2, Shield, CheckCircle, XCircle, TrendingUp, Clock, Activity } from "lucide-react";

interface AdminDashboardStatsProps {
  userCount: number;
  apiKeyCount: number;
  serverCount: number;
  loading?: boolean;
  adminCount?: number;
  activeApiKeys?: number;
  failedApiKeys?: number;
  activeServers?: number;
  recentDeployments?: number;
  apiUsageToday?: number;
  totalApiQuota?: number;
}

export function AdminDashboardStats({ 
  userCount, 
  apiKeyCount, 
  serverCount, 
  loading = false,
  adminCount = 0,
  activeApiKeys = 0,
  failedApiKeys = 0,
  activeServers = 0,
  recentDeployments = 0,
  apiUsageToday = 0,
  totalApiQuota = 1000
}: AdminDashboardStatsProps) {
  
  const usagePercentage = totalApiQuota > 0 ? Math.round((apiUsageToday / totalApiQuota) * 100) : 0;
  
  const stats = [
    {
      title: "المستخدمين",
      value: userCount,
      icon: <Users className="text-amber-400 dark:text-amber-300 h-4 w-4" />,
      bgClass: "bg-gradient-to-br from-amber-500/25 via-yellow-500/20 to-orange-600/25 dark:from-amber-500/30 dark:via-yellow-500/25 dark:to-orange-600/30 border-amber-400/40 dark:border-amber-400/50",
      shadowClass: "shadow-amber-500/20 dark:shadow-amber-500/30",
      glowClass: "group-hover:shadow-amber-500/30 dark:group-hover:shadow-amber-500/40",
      iconBg: "bg-gradient-to-br from-amber-500/30 to-yellow-600/30 dark:from-amber-500/40 dark:to-yellow-600/40 border-amber-400/50 dark:border-amber-400/60",
      metrics: [
        {
          label: "المشرفين",
          value: adminCount,
          icon: <Shield className="h-3 w-3 text-amber-300 dark:text-amber-200" />,
          color: "text-amber-300 dark:text-amber-200"
        },
        {
          label: "المستخدمين العاديين", 
          value: userCount - adminCount,
          icon: <Users className="h-3 w-3 text-amber-400 dark:text-amber-300" />,
          color: "text-amber-400 dark:text-amber-300"
        }
      ]
    },
    {
      title: "مفاتيح API",
      value: apiKeyCount,
      icon: <KeyRound className="text-emerald-400 dark:text-emerald-300 h-4 w-4" />,
      bgClass: "bg-gradient-to-br from-emerald-500/25 via-green-500/20 to-teal-600/25 dark:from-emerald-500/30 dark:via-green-500/25 dark:to-teal-600/30 border-emerald-400/40 dark:border-emerald-400/50",
      shadowClass: "shadow-emerald-500/20 dark:shadow-emerald-500/30",
      glowClass: "group-hover:shadow-emerald-500/30 dark:group-hover:shadow-emerald-500/40",
      iconBg: "bg-gradient-to-br from-emerald-500/30 to-green-600/30 dark:from-emerald-500/40 dark:to-green-600/40 border-emerald-400/50 dark:border-emerald-400/60",
      metrics: [
        {
          label: "نشطة",
          value: activeApiKeys,
          icon: <CheckCircle className="h-3 w-3 text-emerald-400 dark:text-emerald-300" />,
          color: "text-emerald-400 dark:text-emerald-300"
        },
        {
          label: "معطلة",
          value: failedApiKeys,
          icon: <XCircle className="h-3 w-3 text-red-400 dark:text-red-300" />,
          color: "text-red-400 dark:text-red-300"
        },
        {
          label: "استخدام اليوم",
          value: `${usagePercentage}%`,
          icon: <TrendingUp className="h-3 w-3 text-emerald-300 dark:text-emerald-200" />,
          color: "text-emerald-300 dark:text-emerald-200"
        }
      ]
    },
    {
      title: "الخوادم",
      value: serverCount,
      icon: <Server className="text-blue-400 dark:text-blue-300 h-4 w-4" />,
      bgClass: "bg-gradient-to-br from-blue-500/25 via-cyan-500/20 to-indigo-600/25 dark:from-blue-500/30 dark:via-cyan-500/25 dark:to-indigo-600/30 border-blue-400/40 dark:border-blue-400/50",
      shadowClass: "shadow-blue-500/20 dark:shadow-blue-500/30",
      glowClass: "group-hover:shadow-blue-500/30 dark:group-hover:shadow-blue-500/40",
      iconBg: "bg-gradient-to-br from-blue-500/30 to-indigo-600/30 dark:from-blue-500/40 dark:to-indigo-600/40 border-blue-400/50 dark:border-blue-400/60",
      metrics: [
        {
          label: "نشطة",
          value: activeServers,
          icon: <Activity className="h-3 w-3 text-blue-400 dark:text-blue-300" />,
          color: "text-blue-400 dark:text-blue-300"
        },
        {
          label: "معطلة",
          value: serverCount - activeServers,
          icon: <XCircle className="h-3 w-3 text-slate-400 dark:text-slate-300" />,
          color: "text-slate-400 dark:text-slate-300"
        },
        {
          label: "عمليات النشر الأخيرة",
          value: recentDeployments,
          icon: <Clock className="h-3 w-3 text-blue-300 dark:text-blue-200" />,
          color: "text-blue-300 dark:text-blue-200"
        }
      ]
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div 
            key={i}
            className="relative border border-slate-700/60 dark:border-slate-600/50 rounded-xl p-4 bg-gradient-to-br from-slate-800/30 via-slate-800/20 to-slate-900/30 dark:from-slate-800/40 dark:via-slate-700/30 dark:to-slate-900/40 backdrop-blur-md shadow-lg shadow-slate-900/20 dark:shadow-slate-900/30 motion-safe:animate-pulse"
            data-testid={`loading-stats-card-${i}`}
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-slate-600/40 to-slate-700/40 dark:from-slate-500/40 dark:to-slate-600/40 border border-slate-600/50 dark:border-slate-500/50 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-slate-400 dark:text-slate-300 motion-safe:animate-spin" />
                </div>
                <div className="h-7 w-16 bg-slate-700/40 dark:bg-slate-600/40 rounded-md"></div>
              </div>
              <div className="space-y-2.5">
                <div className="h-3 w-20 bg-slate-700/40 dark:bg-slate-600/40 rounded"></div>
                <div className="h-3 w-24 bg-slate-700/40 dark:bg-slate-600/40 rounded"></div>
                <div className="h-3 w-18 bg-slate-700/40 dark:bg-slate-600/40 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div 
          key={index}
          className={`relative border border-slate-700/60 dark:border-slate-600/50 rounded-xl p-4 ${stat.bgClass} backdrop-blur-md shadow-lg ${stat.shadowClass} transition-all duration-300 motion-safe:hover:-translate-y-1 hover:shadow-xl ${stat.glowClass} hover:border-opacity-60 group overflow-hidden`}
          data-testid={`stats-card-${index}`}
        >
          {/* Glass morphism overlay */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 via-white/5 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none"></div>
          
          {/* Animated background particles effect - reduced from 3 to 1 particles and prefers-reduced-motion */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none motion-reduce:hidden">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/30 dark:bg-white/20 rounded-full motion-safe:animate-pulse"></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10">
            {/* Header with icon, title and main value */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <div className={`h-7 w-7 rounded-lg ${stat.iconBg} border flex items-center justify-center motion-safe:group-hover:rotate-6 transition-transform duration-300 shadow-md`}>
                  {stat.icon}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-wide" data-testid={`stats-title-${index}`}>{stat.title}</h3>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 drop-shadow-md transition-transform duration-200" data-testid={`stats-value-${index}`}>{stat.value}</div>
            </div>
            
            {/* Detailed metrics */}
            <div className="space-y-2.5">
              {stat.metrics.map((metric, metricIndex) => (
                <div 
                  key={metricIndex}
                  className="flex items-center justify-between p-2 rounded-lg bg-black/10 dark:bg-white/5 border border-white/10 dark:border-white/10 backdrop-blur-sm group-hover:bg-black/15 dark:group-hover:bg-white/10 transition-all duration-200"
                  data-testid={`stats-metric-${index}-${metricIndex}`}
                >
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <div className="p-1 rounded-md bg-white/10 dark:bg-white/15 border border-white/20 dark:border-white/25">
                      {metric.icon}
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 tracking-wide">{metric.label}</span>
                  </div>
                  <span className={`text-xs font-bold ${metric.color} drop-shadow-sm`}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Usage progress bar for API keys */}
            {index === 1 && usagePercentage > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20 dark:border-white/15">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 tracking-wide">الاستخدام اليومي</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-black/20 dark:bg-white/10 px-2 py-0.5 rounded-md border border-white/10 dark:border-white/15">{apiUsageToday}/{totalApiQuota}</span>
                </div>
                <div className="relative w-full bg-black/30 dark:bg-white/10 rounded-full h-2 border border-white/20 dark:border-white/15 overflow-hidden">
                  {/* Background glow effect - reduced animation */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent motion-safe:animate-pulse pointer-events-none"></div>
                  <div 
                    className={`relative h-2 rounded-full transition-all duration-500 ease-out shadow-md ${
                      usagePercentage > 80 ? 'bg-gradient-to-r from-red-500 to-red-400 shadow-red-500/30' : 
                      usagePercentage > 60 ? 'bg-gradient-to-r from-yellow-500 to-amber-400 shadow-yellow-500/30' : 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-emerald-500/30'
                    }`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    data-testid="api-usage-progress"
                  >
                    {/* Progress bar shine effect - reduced animation */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent motion-safe:animate-pulse pointer-events-none"></div>
                  </div>
                </div>
                <div className={`text-center mt-1 text-xs font-medium ${
                  usagePercentage > 80 ? 'text-red-400 dark:text-red-300' : 
                  usagePercentage > 60 ? 'text-yellow-400 dark:text-yellow-300' : 'text-emerald-400 dark:text-emerald-300'
                }`}>
                  {usagePercentage}% من الحد الأقصى
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AdminDashboardStats;