import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Settings, LineChart, BarChart, DollarSign, MessageCircle, TrendingUp, TrendingDown, ChevronsUp, ChevronsDown, Activity, RefreshCw, Users, Bot } from 'lucide-react';
import { useTimezone } from '@/hooks/use-timezone';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { apiRequest } from '@/lib/queryClient';
import { t } from '@/lib/i18n';
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/hooks/use-auth';

interface Indicator {
  id: string;
  name: string;
  type: 'trend' | 'oscillator' | 'volatility' | 'volume' | 'momentum';
  value: number;
  signal: 'buy' | 'sell' | 'neutral';
  timeframe: string;
  lastUpdate: string;
  icon: React.ReactNode;
  description: string;
  chartData?: {
    time: string;
    value: number;
  }[];
  strengthValue?: number; // قوة الإشارة من 0 إلى 100
}

interface MarketStatusData {
  isOpen: boolean;
  message?: string;
  nextOpenTime?: string;
  nextCloseTime?: string;
}

export default function IndicatorsPage() {
  const { timezone } = useTimezone();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  
  // استخدام حالة افتراضية للسوق لتجنب الانتظار أثناء التحميل
  const [localMarketStatus, setLocalMarketStatus] = useState<MarketStatusData>({
    isOpen: true,
    message: t('market_open')
  });
  
  // دالة توليد بيانات رسم بياني عشوائية للعرض
  const generateChartData = (signal: 'buy' | 'sell' | 'neutral', length = 12) => {
    const data = [];
    let baseValue = signal === 'buy' ? 50 : (signal === 'sell' ? 70 : 60);
    
    for (let i = 0; i < length; i++) {
      // تغيير الاتجاه بناءً على نوع الإشارة
      const randomFactor = signal === 'buy' 
        ? Math.random() * 10 - 3  // اتجاه تصاعدي مع تذبذبات
        : (signal === 'sell' 
          ? Math.random() * 10 - 7  // اتجاه تنازلي مع تذبذبات
          : Math.random() * 6 - 3); // تذبذب محايد
          
      baseValue += randomFactor;
      
      // التأكد من أن القيم ضمن نطاق معقول
      baseValue = Math.max(0, Math.min(100, baseValue));
      
      const time = new Date();
      time.setHours(time.getHours() - (length - i));
      
      data.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: parseFloat(baseValue.toFixed(2))
      });
    }
    
    return data;
  };
  
  // دالة لتحميل المؤشرات
  const loadIndicators = () => {
    // نماذج تجريبية للمؤشرات مع رموز مرئية محسنة وبيانات رسم بياني
    const demoIndicators: Indicator[] = [
      {
        id: '1',
        name: t('moving_average'),
        type: 'trend',
        value: 1.35,
        signal: 'buy',
        timeframe: '1H',
        lastUpdate: new Date().toISOString(),
        icon: <TrendingUp className="h-6 w-6 text-green-500" />,
        description: t('ma_description') || 'Simple Moving Average indicator shows upward trend in short term',
        chartData: generateChartData('buy'),
        strengthValue: 85
      },
      {
        id: '2',
        name: t('indicator_full_rsi'),
        type: 'oscillator',
        value: 70.5,
        signal: 'sell',
        timeframe: '4H',
        lastUpdate: new Date().toISOString(),
        icon: <Activity className="h-6 w-6 text-red-500" />,
        description: t('rsi_description') || 'Relative Strength Index above 70, indicating overbought conditions',
        chartData: generateChartData('sell'),
        strengthValue: 78
      },
      {
        id: '3',
        name: t('indicator_full_macd'),
        type: 'momentum',
        value: 0.0021,
        signal: 'buy',
        timeframe: '1D',
        lastUpdate: new Date().toISOString(),
        icon: <ChevronsUp className="h-6 w-6 text-green-500" />,
        description: t('macd_description') || 'MACD positive crossover indicates bullish momentum',
        chartData: generateChartData('buy'),
        strengthValue: 92
      },
      {
        id: '4',
        name: t('bollinger_bands'),
        type: 'volatility',
        value: 1.2245,
        signal: 'neutral',
        timeframe: '1H',
        lastUpdate: new Date().toISOString(),
        icon: <Activity className="h-6 w-6 text-yellow-500" />,
        description: t('bb_description') || 'Price moving within middle Bollinger Bands range',
        chartData: generateChartData('neutral'),
        strengthValue: 55
      },
      {
        id: '5',
        name: t('money_flow'),
        type: 'volume',
        value: 0.85,
        signal: 'buy',
        timeframe: '1D',
        lastUpdate: new Date().toISOString(),
        icon: <TrendingUp className="h-6 w-6 text-green-500" />,
        description: t('mfi_description') || 'Positive money flow indicating increasing buying pressure',
        chartData: generateChartData('buy'),
        strengthValue: 75
      },
      {
        id: '6',
        name: t('stochastic'),
        type: 'oscillator',
        value: 25.3,
        signal: 'buy',
        timeframe: '4H',
        lastUpdate: new Date().toISOString(),
        icon: <ChevronsUp className="h-6 w-6 text-green-500" />,
        description: t('stoch_description') || 'Stochastic below 30 level, indicating oversold conditions',
        chartData: generateChartData('buy'),
        strengthValue: 82
      },
      {
        id: '7',
        name: t('momentum_indicator'),
        type: 'momentum',
        value: -0.15,
        signal: 'sell',
        timeframe: '1H',
        lastUpdate: new Date().toISOString(),
        icon: <ChevronsDown className="h-6 w-6 text-red-500" />,
        description: t('momentum_description') || 'Negative momentum indicates weakening uptrend strength',
        chartData: generateChartData('sell'),
        strengthValue: 65
      },
      {
        id: '8',
        name: t('volatility_indicator'),
        type: 'volatility',
        value: 1.85,
        signal: 'neutral',
        timeframe: '1D',
        lastUpdate: new Date().toISOString(),
        icon: <Activity className="h-6 w-6 text-yellow-500" />,
        description: t('volatility_description') || 'Average increase in price volatility',
        chartData: generateChartData('neutral'),
        strengthValue: 50
      }
    ];
    
    setIndicators(demoIndicators);
  };
  
  // التحميل الأولي للمؤشرات
  useEffect(() => {
    loadIndicators();
  }, []);
  
  // استخدام تأثير جانبي لتحديث حالة السوق بشكل منفصل عن التحديث العام للصفحة
  useEffect(() => {
    // نستخدم المنطقة الزمنية للمستخدم أو UTC كافتراضي
    const tz = timezone === 'auto' ? 'UTC' : timezone;
    
    // استدعاء حالة السوق
    fetch(`/api/market-status?market=forex&timezone=${encodeURIComponent(tz)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('فشل في جلب حالة السوق');
        }
        return response.json();
      })
      .then(data => {
        setLocalMarketStatus(data);
      })
      .catch(error => {
        console.error('خطأ في جلب حالة السوق:', error);
        // استخدام حالة افتراضية
        setLocalMarketStatus({
          isOpen: true,
          message: t('market_open')
        });
      });
      
    // تحديث كل 5 دقائق
    const intervalId = setInterval(() => {
      fetch(`/api/market-status?market=forex&timezone=${encodeURIComponent(tz)}`)
        .then(response => response.json())
        .then(data => setLocalMarketStatus(data))
        .catch(error => console.error('خطأ في تحديث حالة السوق:', error));
    }, 300000);
    
    // تنظيف عند إزالة المكون
    return () => clearInterval(intervalId);
  }, [timezone]);

  // حدث تغيير اللغة
  useEffect(() => {
    const handleLanguageChange = () => {
      // إعادة تحميل المؤشرات لتطبيق الترجمات الجديدة
      loadIndicators();
    };
    
    // إضافة مستمع لحدث تغيير اللغة
    window.addEventListener('languageChanged', handleLanguageChange);
    
    // تنظيف عند إزالة المكون
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  const filteredIndicators = activeTab === 'all' 
    ? indicators 
    : indicators.filter(indicator => indicator.type === activeTab);

  const getSignalColor = (signal: string) => {
    switch(signal) {
      case 'buy': return 'text-green-500';
      case 'sell': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getSignalText = (signal: string) => {
    switch(signal) {
      case 'buy': return t('buy');
      case 'sell': return t('sell');
      default: return t('neutral');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <header className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border/50 z-40 p-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="p-1.5 rounded-full bg-card/80 border border-border/60 text-foreground hover:bg-card transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <h1 className="font-bold text-xl text-primary">{t('indicators')}</h1>
        </div>

        {localMarketStatus.isOpen && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-sm text-green-400">{t('market_open')}</span>
          </div>
        )}

        {!localMarketStatus.isOpen && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            <span className="text-sm text-red-400">{t('market_closed')}</span>
          </div>
        )}
      </header>

      <main className="container mx-auto px-3 py-4">
        <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
            <TabsTrigger value="all">{t('all_indicators')}</TabsTrigger>
            <TabsTrigger value="trend">{t('trend')}</TabsTrigger>
            <TabsTrigger value="oscillator">{t('oscillator')}</TabsTrigger>
            <TabsTrigger value="momentum">{t('momentum')}</TabsTrigger>
            <TabsTrigger value="volatility">{t('volatility')}</TabsTrigger>
            <TabsTrigger value="volume">{t('volume')}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIndicators.map((indicator) => (
            <Card key={indicator.id} className="border-border bg-card/50 backdrop-blur-lg">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    {indicator.icon}
                    {indicator.name}
                  </CardTitle>
                  <Badge variant={indicator.signal === 'buy' ? 'default' : (indicator.signal === 'sell' ? 'destructive' : 'secondary')} className="font-semibold">
                    {getSignalText(indicator.signal)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">{indicator.description}</p>

                  {indicator.chartData && (
                    <div className="h-28 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={indicator.chartData}>
                          <defs>
                            <linearGradient id={`chart-gradient-${indicator.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop 
                                offset="5%" 
                                stopColor={indicator.signal === 'buy' ? '#22c55e' : (indicator.signal === 'sell' ? '#ef4444' : '#eab308')} 
                                stopOpacity={0.8}
                              />
                              <stop 
                                offset="95%" 
                                stopColor={indicator.signal === 'buy' ? '#22c55e' : (indicator.signal === 'sell' ? '#ef4444' : '#eab308')} 
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '6px',
                              color: 'hsl(var(--card-foreground))'
                            }} 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke={indicator.signal === 'buy' ? '#22c55e' : (indicator.signal === 'sell' ? '#ef4444' : '#eab308')} 
                            fillOpacity={1} 
                            fill={`url(#chart-gradient-${indicator.id})`} 
                          />
                          <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {indicator.strengthValue !== undefined && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t('signal_strength') || 'قوة الإشارة'}</span>
                        <span className="font-medium">{indicator.strengthValue}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            indicator.signal === 'buy' 
                              ? 'bg-gradient-to-r from-green-500 to-green-400' 
                              : indicator.signal === 'sell' 
                                ? 'bg-gradient-to-r from-red-500 to-red-400' 
                                : 'bg-gradient-to-r from-yellow-400 to-yellow-300'
                          }`}
                          style={{ width: `${indicator.strengthValue}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <span>{t('indicator_value') || 'قيمة المؤشر'}: </span>
                      <span className="font-semibold">{indicator.value}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{t('timeframe') || 'الإطار الزمني'}: </span>
                      <span className="font-semibold">{indicator.timeframe}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="py-2 px-6">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs w-full text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  onClick={() => {
                    toast({
                      title: t('updated') || 'تم التحديث',
                      description: t('indicator_updated') || 'تم تحديث بيانات المؤشر بنجاح',
                    });
                  }}
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> {t('refresh') || 'تحديث'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/90 backdrop-blur-md z-50 pt-1.5 pb-2 mobile-navbar">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {user?.isAdmin ? (
            <Link href="/admin" className="flex flex-col items-center text-muted-foreground hover:text-primary mobile-nav-item">
              <Users className="h-5 w-5" />
              <span className="text-[10px] mt-1 font-medium">{t('users')}</span>
            </Link>
          ) : (
            <Link href="/bot-info" className="flex flex-col items-center text-muted-foreground hover:text-primary mobile-nav-item">
              <Bot className="h-5 w-5" />
              <span className="text-[10px] mt-1 font-medium">{t('bot_info')}</span>
            </Link>
          )}

          <Link href="/indicators" className="flex flex-col items-center text-primary mobile-nav-item active">
            <BarChart className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('indicators')}</span>
          </Link>

          <Link href="/" className="flex flex-col items-center text-muted-foreground hover:text-primary mobile-nav-item">
            <div className="relative p-3 bg-primary text-primary-foreground rounded-full -mt-5 shadow-lg border-4 border-background/90">
              <DollarSign className="h-6 w-6" />
            </div>
            <span className="text-[10px] mt-1 font-medium">{t('signal')}</span>
          </Link>

          <Link href="/group-chat" className="flex flex-col items-center text-muted-foreground hover:text-primary mobile-nav-item">
            <MessageCircle className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('group_chats')}</span>
          </Link>

          <Link href="/settings" className="flex flex-col items-center text-muted-foreground hover:text-primary mobile-nav-item">
            <Settings className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('settings')}</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}