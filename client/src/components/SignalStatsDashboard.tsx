import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Activity, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Target
} from "lucide-react";
import { t } from "@/lib/i18n";

interface SignalLog {
  id: number;
  userId?: number;
  username?: string;
  symbol: string;
  marketType: string;
  timeframe: string;
  platform?: string;
  status: string; // success, failed, processing
  signal?: string; // buy, sell, wait/neutral
  probability?: string;
  currentPrice?: string;
  priceSource?: string;
  errorCode?: string;
  errorMessage?: string;
  executionTime?: number;
  requestedAt: string;
  completedAt?: string;
  createdAt: string;
}

export function SignalStatsDashboard() {
  // جلب بيانات الإشارات
  const { data: signals = [], isLoading } = useQuery({
    queryKey: ['/api/signal-logs?limit=1000'],
  });

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const signalArray = Array.isArray(signals) ? signals : [];
    
    const totalSignals = signalArray.length;
    const successfulSignals = signalArray.filter((s: SignalLog) => s.status === 'success').length;
    const failedSignals = signalArray.filter((s: SignalLog) => s.status === 'failed' || s.status === 'error').length;
    
    const successRate = totalSignals > 0 ? ((successfulSignals / totalSignals) * 100).toFixed(1) : '0';
    const failureRate = totalSignals > 0 ? ((failedSignals / totalSignals) * 100).toFixed(1) : '0';

    return {
      totalSignals,
      successfulSignals,
      failedSignals,
      successRate,
      failureRate
    };
  }, [signals]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4" data-testid="signal-stats-loading">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                  <div className="h-2 bg-muted rounded w-full"></div>
                </div>
                <div className="h-8 w-8 bg-muted rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 mb-4" data-testid="signal-stats-dashboard">
      {/* إجمالي الإشارات */}
      <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500" data-testid="stat-total-signals">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">
                إجمالي الإشارات
              </div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalSignals.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground hidden sm:block">
                المجموع الكلي
              </div>
            </div>
            <div className="flex-shrink-0">
              <Target className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الإشارات الناجحة */}
      <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500" data-testid="stat-successful-signals">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">
                الإشارات الناجحة
              </div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.successfulSignals.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground hidden sm:block">
                {stats.successRate}% نسبة النجاح
              </div>
            </div>
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الإشارات الفاشلة */}
      <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-red-500" data-testid="stat-failed-signals">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">
                الإشارات الفاشلة
              </div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.failedSignals.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground hidden sm:block">
                {stats.failureRate}% نسبة الفشل
              </div>
            </div>
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}