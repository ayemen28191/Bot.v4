import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Settings, DollarSign, Bitcoin, LineChart, Clock, AlertTriangle, Globe, BarChart, MessageCircle, ChevronDown, AlertCircle, Bell, BarChart2, Timer, History, Lock, Loader2, X, Users, Bot, WifiOff, RefreshCw, Grid, BarChart3, LayoutDashboard } from 'lucide-react';
import { Link } from 'wouter';
import { SignalIndicator } from '@/features/trading';
import { SignalType } from '@/features/trading/SignalIndicator';
import { TimeframeButtons } from '@/features/trading';
import { TimeFrame } from '@/features/trading/TimeframeButtons';
import { ProbabilityHeatmap } from '@/features/trading';
import { t, getCurrentLanguage } from '@/lib/i18n';
import { MarketStatus } from '@/features/trading';
import { MarketClosedAlert } from '@/features/trading';
import OfflineModeNotice from '@/components/OfflineModeNotice';
import { useTimezone } from '@/hooks/use-timezone';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Progress } from '@/components/ui/progress';
import { AnimatePresence, motion } from 'framer-motion';
import React, { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import ConnectionError from '@/components/ConnectionError';
import useConnection from '@/hooks/use-connection';
import { useHeatmap } from '@/hooks/use-heatmap';
import { BottomNavigation } from '@/components';
import { safeGetLocalStorage, safeSetLocalStorage, safeGetLocalStorageString, safeSetLocalStorageString, safeRemoveLocalStorage } from '@/lib/storage-utils';

// أنواع الأسواق والأزواج التداولية
type MarketType = 'forex' | 'crypto' | 'stocks';

// المنصات التداولية
interface TradingPlatform {
  id: string;
  name: string;
  arabicName: string;
  icon: ReactNode;
  supportedMarkets: MarketType[];
  expiryTimes?: {
    [key in TimeFrame]?: number;
  };
  minAmount?: number;
  orderTypes?: string[];
  features?: string[];
}

interface TradingPair {
  symbol: string;
  name: string;
  type: MarketType;
}

// تعريف واجهة تحليل السوق
interface MarketAnalysis {
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  volatility: number; // 0-100
  support: number; // السعر
  resistance: number; // السعر
}

// إضافة معامِلات التقلب الحقيقية لكل نوع من الأزواج (قيم أقرب للتقلبات الحقيقية اليومية)
const VOLATILITY_FACTORS = {
  forex: {
    major: 0.0045, // 0.45% للأزواج الرئيسية
    cross: 0.0060, // 0.60% للأزواج المتقاطعة
    exotic: 0.0085 // 0.85% للأزواج الغريبة
  },
  crypto: {
    major: 0.025, // 2.5% للعملات الرئيسية
    alt: 0.045 // 4.5% للعملات البديلة
  },
  stocks: {
    tech: 0.018, // 1.8% لأسهم التكنولوجيا
    other: 0.012 // 1.2% للأسهم الأخرى
  }
};

// سجل التقلبات التاريخية (ATR النسبي) للأدوات المالية الرئيسية - قيم تقريبية
const HISTORICAL_VOLATILITY = {
  'EUR/USD': 0.0040, // 0.40%
  'GBP/USD': 0.0055, // 0.55%
  'USD/JPY': 0.0050, // 0.50%
  'EUR/GBP': 0.0035, // 0.35%
  'AUD/USD': 0.0060, // 0.60%
  'USD/CAD': 0.0050, // 0.50%
  'USD/CHF': 0.0045, // 0.45%
  'BTC/USDT': 0.030, // 3.0%
  'ETH/USDT': 0.035, // 3.5%
  'XRP/USDT': 0.055, // 5.5%
  'LTC/USDT': 0.040, // 4.0%
  'AAPL': 0.017, // 1.7%
  'MSFT': 0.016, // 1.6%
  'GOOGL': 0.018, // 1.8%
  'AMZN': 0.020, // 2.0%
  'TSLA': 0.035  // 3.5%
};

// عرض الاحتمالية
interface ProbabilityBarProps {
  signal: SignalType;
  probability: number;
  marketAnalysis?: MarketAnalysis | null;
}

const ProbabilityBar: React.FC<ProbabilityBarProps> = ({ signal, probability, marketAnalysis }) => {
  if (signal === 'WAIT' || !probability) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t('probability')}</span>
        <span className="font-medium">{Math.round(Number(probability))}%</span>
      </div>
      <Progress
        value={probability}
        className={`h-2 ${
          signal === 'UP' ? 'bg-success/20' : 'bg-destructive/20'
        }`}
        indicatorClassName={`${
          signal === 'UP' ? 'bg-success' : 'bg-destructive'
        }`}
      />
      {marketAnalysis && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{signal === 'UP' ? t('bullish_trend') : t('bearish_trend')}</span>
          <span>{t('signal_strength')}: {marketAnalysis.strength}%</span>
        </div>
      )}
    </div>
  );
};

export default function TradingSignalPage() {
  // استدعاء مكون الctoast والمصادقة
  const { toast } = useToast();
  const { user } = useAuth();

  // استخدام مكون التحقق من الاتصال - تكرار الفحص كل دقيقتين لتقليل الطلبات المُلغاة
  const { 
    isOnline, 
    isChecking, 
    checkConnection,
    resetState: resetConnectionState,
    lastCheckTime
  } = useConnection('/api/test/health', 120000);

  // حالة وضع عدم الاتصال للتطبيق
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    // تفضيل استخدام التخزين المحلي لتذكر تفضيلات المستخدم
    return safeGetLocalStorageString('offline_mode', '') === 'enabled';
  });

  // حالة عرض خطأ الاتصال
  const [showConnectionError, setShowConnectionError] = useState(false);

  // حالة عرض تنبيه للمستخدم
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // دالة لتفعيل وضع عدم الاتصال
  const enableOfflineMode = useCallback(() => {
    console.log(t('offline_mode_enabled_trading_page'));
    setIsOfflineMode(true);
    safeSetLocalStorageString('offline_mode', 'enabled');

    // إخفاء خطأ الاتصال
    setShowConnectionError(false);

    // إظهار إشعار للمستخدم
    toast({
      title: t('offline_mode_enabled_title'),
      description: t('offline_mode_enabled_desc'),
      variant: "default",
      duration: 5000
    });
  }, [toast]);

  // إضافة متابعة لخطأ WebSocket في بيئة HTTPS
  useEffect(() => {
    const wsSecurityError = 'SecurityError: Failed to construct \'WebSocket\': An insecure WebSocket connection may not be initiated from a page loaded over HTTPS';

    // مراقبة أخطاء WebSocket في وحدة التحكم
    const originalError = console.error;
    console.error = function(...args) {
      const errorMessage = args.join(' ');
      if (errorMessage.includes(wsSecurityError) || errorMessage.includes('failed to connect to websocket')) {
        // تشغيل وضع عدم الاتصال تلقائيًا عند اكتشاف خطأ WebSocket في بيئة HTTPS
        if (!isOfflineMode) {
          console.log(t('websocket_security_error_detected'));
          enableOfflineMode();
        }
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, [isOfflineMode, enableOfflineMode]);

  // تتبع حالة الاتصال ووضع عدم الاتصال
  useEffect(() => {
    // لا نعرض خطأ الاتصال في وضع عدم الاتصال
    if (isOfflineMode) {
      setShowConnectionError(false);
      return;
    }

    // إذا كانت نتيجة الفحص تشير إلى عدم وجود اتصال ومرت 5 ثوانٍ على الفحص
    if (!isOnline && !isChecking && lastCheckTime && Date.now() - lastCheckTime > 5000) {
      setShowConnectionError(true);
    } else if (isOnline) {
      setShowConnectionError(false);
    }
  }, [isOnline, isChecking, isOfflineMode, lastCheckTime]);

  // دالة لتعطيل وضع عدم الاتصال
  const disableOfflineMode = useCallback(() => {
    console.log(t('offline_mode_disabled_trading_page'));
    setIsOfflineMode(false);
    safeRemoveLocalStorage('offline_mode');

    // إعادة تهيئة حالة الاتصال
    resetConnectionState();

    // إعادة فحص الاتصال مباشرة
    checkConnection().then(isConnected => {
      if (isConnected) {
        toast({
          title: t('connection_restored_title'),
          description: t('connection_restored_desc'),
          variant: "default",
          duration: 3000
        });
      } else {
        toast({
          title: t('signal_analysis_pending_title'),
          description: t('signal_analysis_pending_desc'),
          variant: "destructive",
          duration: 5000
        });
      }
    });
  }, [toast, checkConnection, resetConnectionState]);

  // إضافة دالة للتحقق من الاتصال واستدعاء التحقق
  const handleRetryConnection = useCallback(async () => {
    return await checkConnection();
  }, [checkConnection]);

  // دالة مساعدة لاسترجاع السعر المخزن محليًا
  const getCachedPrice = (symbol: string): number | null => {
    const cachedPriceData = safeGetLocalStorage(`price_${symbol}`, null);
    if (cachedPriceData) {
      const { price, expires } = cachedPriceData;
      if (expires > Date.now() || isOfflineMode) {
        console.log(t('using_locally_stored_price'), price);
        return Number(price);
      }
    }
    return null;
  };

  // دالة لإنشاء أسعار افتراضية معقولة للأزواج المختلفة في حالة عدم وجود سعر مخزن
  const getDefaultPriceForSymbol = (symbol: string): number => {
    // قيم افتراضية محدثة للأزواج الشائعة (تم تحديثها في مارس 2025)
    const defaultPrices: Record<string, number> = {
      'EUR/USD': 1.0865,
      'GBP/USD': 1.3120,
      'USD/JPY': 151.55,
      'USD/CHF': 0.8980,
      'EUR/JPY': 164.60,
      'GBP/JPY': 198.85,
      'BTC/USDT': 86500,
      'ETH/USDT': 3450,
      'XRP/USDT': 0.57,
      'AAPL': 172.50,
      'MSFT': 425.30,
      'GOOGL': 175.80,
      'AMZN': 182.90
    };

    // إذا كان الزوج معروفًا، أعد السعر الافتراضي المقابل له
    if (symbol in defaultPrices) {
      return defaultPrices[symbol];
    }

    // للأزواج غير المعروفة، إرجاع قيمة معقولة بناءً على نوع الزوج
    if (symbol.includes('/USDT') || symbol.includes('-USD')) {
      return 2.50; // ازواج العملات المشفرة الأخرى
    } else if (selectedPair.type === 'stocks') {
      return 85.75; // للأسهم
    } else {
      return 1.1050; // لأزواج الفوركس الأخرى
    }
  };

  // إضافة دالة لتحديث المكون عند تغيير اللغة
  const [, setForceUpdateFlag] = useState(0);
  const forceUpdate = () => setForceUpdateFlag(prev => prev + 1);

  // نسمح باستخدام أي لغة من اللغات المدعومة
  useEffect(() => {
    // تهيئة اللغة الافتراضية إذا لم تكن موجودة
    if (!localStorage.getItem('language')) {
      const browserLang = navigator.language.split('-')[0];
      const supportedLangs = ['ar', 'en', 'hi'];
      localStorage.setItem('language', supportedLangs.includes(browserLang) ? browserLang : 'ar');
    }

    // إضافة مستمع لتغييرات اللغة
    const handleLanguageChange = () => {
      // إعادة تحميل الصفحة لتحديث جميع الترجمات
      // هذا سيؤدي إلى استخدام الترجمات الجديدة
      forceUpdate();
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  // حالة الواجهة
  const [selectedPair, setSelectedPair] = useState<TradingPair>({
    symbol: 'EUR/USD',
    name: 'يورو / دولار أمريكي',
    type: 'forex'
  });
  const [signal, setSignal] = useState<SignalType>('WAIT');
  const [probability, setProbability] = useState(0);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('1M');
  const [isMarketOpen, setIsMarketOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // استخدام خطاف الخريطة الحرارية
  const { 
    data: heatmapData, 
    isLoading: heatmapLoading, 
    refresh: refreshHeatmap,
    filterData: filterHeatmapData,
    lastUpdated: heatmapLastUpdated
  } = useHeatmap({
    autoRefresh: true,
    refreshInterval: 300000, // تحديث كل 5 دقائق
    offlineMode: isOfflineMode
  });

  // حالة الخريطة الحرارية
  const [showHeatmap, setShowHeatmap] = useState(false);

  // متغيرات لتتبع سعر الزوج
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [targetPrice, setTargetPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<TradingPlatform>({
    id: 'metatrader5',
    name: 'MetaTrader 5',
    arabicName: 'ميتاتريدر 5',
    icon: <Globe className="text-warning h-5 w-5" />,
    supportedMarkets: ['forex', 'stocks', 'crypto'] as MarketType[]
  });

  // حالة القائمة المنسدلة للمنصات
  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);

  // تصفية الأزواج التداولية حسب النوع
  const [activePairType, setActivePairType] = useState<MarketType>('forex');

  // تغيير نوع الزوج النشط وتحديث الزوج المحدد إذا لزم الأمر
  const handleChangePairType = (type: MarketType) => {
    setActivePairType(type);
    // إذا كان نوع الزوج المحدد الحالي مختلفًا عن النوع الجديد، فقم بتحديد أول زوج من هذا النوع
    if (selectedPair.type !== type) {
      const firstPairOfType = tradingPairs.find(pair => pair.type === type);
      if (firstPairOfType) {
        setSelectedPair(firstPairOfType);
        setSignal('WAIT');
        setProbability(0);
        // تنظيف الأسعار عند تغيير الزوج
        setCurrentPrice(null);
        setTargetPrice(null);
      }
    }
  };

  // إضافة معالج لتغيير الزوج المحدد
  const handlePairChange = (pair: TradingPair) => {
    setSelectedPair(pair);
    setSignal('WAIT');
    setProbability(0);
    // تنظيف الأسعار عند تغيير الزوج
    setCurrentPrice(null);
    setTargetPrice(null);
  };

  // قائمة المنصات التداولية مع تفاصيل محددة لكل منصة
  const tradingPlatforms = useMemo(() => [
    {
      id: 'metatrader5',
      name: 'MetaTrader 5',
      arabicName: 'ميتاتريدر 5',
      icon: <Globe className="text-warning h-5 w-5" />,
      supportedMarkets: ['forex', 'stocks', 'crypto'] as MarketType[],
      expiryTimes: {
        '1M': 60,
        '5M': 300,
        '15M': 900,
        '1H': 3600,
        '4H': 14400,
        '1D': 86400
      },
      minAmount: 0.01,
      orderTypes: ['market_order', 'limit_order', 'stop_order'],
      features: ['technical_analysis_feature', 'advanced_indicators']
    },
    {
      id: 'metatrader4',
      name: 'MetaTrader 4',
      arabicName: 'ميتاتريدر 4',
      icon: <Globe className="text-primary h-5 w-5" />,
      supportedMarkets: ['forex', 'stocks'] as MarketType[],
      expiryTimes: {
        '1M': 60,
        '5M': 300,
        '15M': 900,
        '1H': 3600,
        '4H': 14400,
        '1D': 86400
      },
      minAmount: 0.01,
      orderTypes: ['market_order', 'limit_order', 'stop_order'],
      features: ['stability', 'ease_of_use']
    },
    {
      id: 'eobroker',
      name: 'EO Broker',
      arabicName: 'إكسبرت أوبشن',
      icon: <svg className="text-primary h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L4 6.5v11L12 22l8-4.5v-11L12 2zm1 15h-2v-2h2v2zm-2-4V7h2v6h-2z" />
      </svg>,
      supportedMarkets: ['forex', 'crypto'] as MarketType[],
      expiryTimes: {
        '1M': 60,
        '5M': 300,
        '15M': 900,
      },
      minAmount: 10,
      orderTypes: ['binary_options', 'turbo'],
      features: ['modern_platform', 'high_payouts']
    },
    {
      id: 'binomo',
      name: 'Binomo',
      arabicName: 'بينومو',
      icon: <BarChart className="text-accent-foreground h-5 w-5" />,
      supportedMarkets: ['forex', 'crypto'] as MarketType[],
      expiryTimes: {
        '1M': 60,
        '5M': 300,
      },
      minAmount: 10,
      orderTypes: ['binary_options'],
      features: ['simple_interface', 'arabic_support']
    },
    {
      id: 'iqoption',
      name: 'IQ Option',
      arabicName: 'آي كيو أوبشن',
      icon: <BarChart className="text-primary h-5 w-5" />,
      supportedMarkets: ['forex', 'crypto', 'stocks'] as MarketType[],
      expiryTimes: {
        '1M': 60,
        '5M': 300,
        '15M': 900,
      },
      minAmount: 1,
      orderTypes: ['binary_options', 'forex_trading', 'crypto_trading'],
      features: ['comprehensive_platform', 'advanced_charts']
    },
    {
      id: 'binance',
      name: 'Binance',
      arabicName: 'بينانس',
      icon: <Bitcoin className="text-warning h-5 w-5" />,
      supportedMarkets: ['crypto'] as MarketType[],
      expiryTimes: {
        '1M': 60,
        '5M': 300,
        '15M': 900,
        '1H': 3600,
        '4H': 14400,
        '1D': 86400
      },
      minAmount: 5,
      orderTypes: ['limit_order', 'market_order', 'stop_limit'],
      features: ['cryptocurrencies', 'low_fees']
    },
    {
      id: 'pocketoption',
      name: 'Pocket Option',
      arabicName: 'بوكيت أوبشن',
      icon: <LineChart className="text-warning h-5 w-5" />,
      supportedMarkets: ['forex', 'stocks'] as MarketType[],
      expiryTimes: {
        '1M': 60,
        '5M': 300,
      },
      minAmount: 5,
      orderTypes: ['binary_options', 'turbo'],
      features: ['fast_deposits', 'bonuses']
    },
    {
      id: 'olymptrade',
      name: 'Olymp Trade',
      arabicName: 'أوليمب تريد',
      icon: <LineChart className="text-destructive h-5 w-5" />,
      supportedMarkets: ['forex', 'stocks', 'crypto'] as MarketType[],
      expiryTimes: {
        '1M': 60,
        '5M': 300,
        '15M': 900,
      },
      minAmount: 10,
      orderTypes: ['binary_options', 'forex_trading'],
      features: ['reliable_platform', 'fast_trading']
    },
    {
      id: 'etoro',
      name: 'eToro',
      arabicName: 'إيتورو',
      icon: <LineChart className="text-success h-5 w-5" />,
      supportedMarkets: ['forex', 'stocks', 'crypto'] as MarketType[],
      expiryTimes: {
        '1D': 86400
      },
      minAmount: 50,
      orderTypes: ['copy_trading', 'market_order'],
      features: ['social_trading', 'copy_trading']
    },
    {
      id: 'kucoin',
      name: 'KuCoin',
      arabicName: 'كوكوين',
      icon: <Bitcoin className="text-success h-5 w-5" />,
      supportedMarkets: ['crypto'] as MarketType[],
      expiryTimes: {
        '1M': 60,
        '5M': 300,
        '15M': 900,
        '1H': 3600,
        '4H': 14400,
        '1D': 86400
      },
      minAmount: 5,
      orderTypes: ['limit_order', 'market_order', 'stop_order'],
      features: ['low_fees', 'wide_crypto_selection']
    },
    {
      id: 'deriv',
      name: 'Deriv',
      arabicName: 'ديريف',
      icon: <BarChart className="text-primary h-5 w-5" />,
      supportedMarkets: ['forex', 'crypto', 'stocks'] as MarketType[],
      expiryTimes: {
        '1M': 60,
        '5M': 300,
        '15M': 900,
      },
      minAmount: 5,
      orderTypes: ['binary_options', 'digital_options', 'forex_trading'],
      features: ['multiple_platforms', 'diverse_trading_options']
    }
  ], []);

  // قائمة الأزواج التداولية
  const currentLanguage = getCurrentLanguage();
  const tradingPairs = useMemo(() => [
    { symbol: 'EUR/USD', name: t('EUR/USD'), type: 'forex' as MarketType },
    { symbol: 'GBP/USD', name: t('GBP/USD'), type: 'forex' as MarketType },
    { symbol: 'USD/JPY', name: t('USD/JPY'), type: 'forex' as MarketType },
    { symbol: 'USD/CHF', name: t('USD/CHF'), type: 'forex' as MarketType },
    { symbol: 'EUR/JPY', name: t('EUR/JPY'), type: 'forex' as MarketType },
    { symbol: 'GBP/JPY', name: t('GBP/JPY'), type: 'forex' as MarketType },
    { symbol: 'BTC/USDT', name: t('BTC/USDT'), type: 'crypto' as MarketType },
    { symbol: 'ETH/USDT', name: t('ETH/USDT'), type: 'crypto' as MarketType },
    { symbol: 'XRP/USDT', name: t('XRP/USDT'), type: 'crypto' as MarketType },
    { symbol: 'AAPL', name: t('AAPL'), type: 'stocks' as MarketType },
    { symbol: 'MSFT', name: t('MSFT'), type: 'stocks' as MarketType },
    { symbol: 'GOOGL', name: t('GOOGL'), type: 'stocks' as MarketType },
    { symbol: 'AMZN', name: t('AMZN'), type: 'stocks' as MarketType },
  ], [currentLanguage]);

  // متغيرات لتتبع الإشارات السابقة
  const [previousSignals, setPreviousSignals] = useState<Array<{
    timestamp: number;
    symbol: string;
    timeframe: TimeFrame;
    signal: SignalType;
    probability: number;
    analysis?: MarketAnalysis;
  }>>(() => {
    return safeGetLocalStorage('previousSignals', []);
  });

  // متغير لتفعيل/تعطيل عرض الإشارات السابقة
  const [showPreviousSignals, setShowPreviousSignals] = useState(false);

  // عدد الإشارات السابقة التي يتم عرضها كحد أقصى
  const maxPreviousSignals = 5;

  // دالة مساعدة لتحديد عدد المنازل العشرية المناسبة لكل زوج تداول
  const getPricePrecision = (symbol: string): number => {
    // أزواج الين الياباني JPY تستخدم 3 منازل عشرية عادة
    if (symbol.includes('JPY')) {
      return 3;
    }
    // العملات المشفرة تستخدم غالباً منزلتين عشريتين
    if (selectedPair.type === 'crypto') {
      return 2;
    }
    // الأسهم تستخدم منزلتين عشريتين
    if (selectedPair.type === 'stocks') {
      return 2;
    }
    // معظم أزواج الفوركس الأخرى تستخدم 5 منازل عشرية
    return 5;
  };

  // تحسين دالة تحليل السوق لاتخاذ قرار دقيق بالإشارة مع مراعاة أنماط السوق
  const analyzeMarket = async (pair: string, timeframe: string): Promise<{
    signal: SignalType;
    probability: number;
    analysis: MarketAnalysis;
    indicators: Record<string, { value: number; signal: 'buy' | 'sell' | 'neutral' }>;
  }> => {
    console.log(t('market_analysis_for'), pair, timeframe, selectedPair.type);

    try {
      // استخدام نقطة نهاية API الخاصة بالتحليل الفني الحقيقي
      const url = `/api/market-analysis?symbol=${encodeURIComponent(pair)}&timeframe=${timeframe}&marketType=${selectedPair.type}`;
      const response = await retryFetch(url, 3, 1500);
      const analysisData = await response.json();

      console.log(t('market_analysis_response'), analysisData);

      if (!analysisData || analysisData.error) {
        throw new Error(analysisData?.error || 'فشل في الحصول على تحليل السوق');
      }

      // نحول إشارة الخدمة الخلفية (buy/sell/wait) إلى تنسيق الواجهة الأمامية (UP/DOWN/WAIT)
      const signalMapping: Record<string, SignalType> = {
        'buy': 'UP',
        'sell': 'DOWN',
        'wait': 'WAIT'
      };

      // طباعة الإشارة المستلمة للتصحيح
      console.log(t('signal_received_from_server'), analysisData.signal);
      console.log(t('signal_type_received'), typeof analysisData.signal);

      // معالجة محسنة للإشارة - تحويل الإشارة إلى نص سفلي والتحقق من القيمة
      const serverSignal = String(analysisData.signal).toLowerCase().trim();
      console.log(t('signal_after_processing'), serverSignal);

      let finalSignal: SignalType = 'WAIT';

      if (serverSignal === 'buy') {
        finalSignal = 'UP';
        console.log(t('signal_converted_to_up'));
      } else if (serverSignal === 'sell') {
        finalSignal = 'DOWN';
        console.log(t('signal_converted_to_down'));
      } else {
        console.log(t('signal_no_match_using_wait'));
      }

      // تحويل بيانات التحليل إلى تنسيق MarketAnalysis المطلوب
      const analysis: MarketAnalysis = {
        trend: analysisData.trend || 'neutral',
        strength: analysisData.strength || 50,
        volatility: analysisData.volatility || 30,
        support: analysisData.support || (currentPrice ? parseFloat((currentPrice * 0.99).toFixed(getPricePrecision(pair))) : 0),
        resistance: analysisData.resistance || (currentPrice ? parseFloat((currentPrice * 1.01).toFixed(getPricePrecision(pair))) : 0)
      };

      // تحويل المؤشرات إلى التنسيق المطلوب للواجهة
      const indicators: Record<string, { value: number; signal: 'buy' | 'sell' | 'neutral' }> = {};

      if (analysisData.indicators) {
        Object.entries(analysisData.indicators).forEach(([key, indicator]: [string, any]) => {
          indicators[key] = {
            value: indicator.value,
            signal: indicator.signal || 'neutral'
          };
        });
      }

      // تخزين السعر الحالي للاستخدام في التحليل المستقبلي إذا كان متاحًا
      if (currentPrice) {
        safeSetLocalStorageString(`lastPrice_${pair}`, currentPrice.toString());
      }

      console.log('نتائج التحليل من البيانات الحقيقية:', {
        signal: finalSignal,
        probability: analysisData.probability || 50,
        indicators: indicators,
        analysis: analysis
      });

      return {
        signal: finalSignal,
        probability: analysisData.probability || 50,
        analysis: analysis,
        indicators: indicators
      };
    } catch (error) {
      console.error('خطأ في تحليل السوق:', error);

      // في حالة الخطأ، نعيد الإشارة المحايدة مع رسالة الخطأ
      setAlertMessage(`خطأ في تحليل السوق: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
      setShowAlert(true);

      // نعيد إشارة محايدة في حالة الخطأ
      const defaultAnalysis: MarketAnalysis = {
        trend: 'neutral',
        strength: 50,
        volatility: 30,
        support: currentPrice ? parseFloat((currentPrice * 0.99).toFixed(getPricePrecision(pair))) : 0,
        resistance: currentPrice ? parseFloat((currentPrice * 1.01).toFixed(getPricePrecision(pair))) : 0
      };

      const defaultIndicators: Record<string, { value: number; signal: 'buy' | 'sell' | 'neutral' }> = {
        rsi: { value: 50, signal: 'neutral' },
        macd: { value: 0, signal: 'neutral' },
        ema: { value: 0, signal: 'neutral' },
        bb: { value: 50, signal: 'neutral' },
        adx: { value: 15, signal: 'neutral' }
      };

      return {
        signal: 'WAIT',
        probability: 50,
        analysis: defaultAnalysis,
        indicators: defaultIndicators
      };
    }
  };

  // إضافة متغيرات لتتبع نتائج التحليل
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null);
  const [indicatorResults, setIndicatorResults] = useState<Record<string, { value: number; signal: 'buy' | 'sell' | 'neutral' }> | null>(null);

  // دالة مساعدة لإعادة المحاولة
  const retryFetch = async (url: string, maxRetries = 3, delay = 1000, options?: RequestInit): Promise<Response> => {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        // إذا كانت الاستجابة ناجحة، أرجع النتيجة
        if (response.ok) return response;
        // إذا كان هناك خطأ في الخادم، حاول مرة أخرى
        lastError = await response.json();
      } catch (error) {
        lastError = error;
        // إذا كان الخطأ بسبب AbortSignal (مهلة انتهاء الاتصال)، ارميه مباشرة
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }
      }
      // انتظر قبل المحاولة التالية إذا لم تكن هذه المحاولة الأخيرة
      if (attempt < maxRetries - 1) {
        console.log(`محاولة جلب السعر فشلت، جاري إعادة المحاولة ${attempt + 1}/${maxRetries}...`);
        // تحقق مما إذا كانت الإشارة قد تم إلغاؤها
        if (options?.signal && options.signal.aborted) {
          throw new DOMException('مهلة الاتصال انتهت', 'AbortError');
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  };

  const fetchCurrentPrice = async (symbol: string): Promise<number | null> => {
    try {
      setPriceLoading(true);

      // إذا كان الجهاز في وضع عدم الاتصال، استرجع السعر من التخزين المحلي
      if (isOfflineMode) {
        console.log(t('fetching_price_offline_mode'));
        const cachedPrice = getCachedPrice(symbol);
        if (cachedPrice !== null) {
          return cachedPrice;
        } else {
          // إذا لم يتوفر سعر مخزن محليًا، استخدم قيمة افتراضية
          console.log(t('using_default_price_offline'));
          return getDefaultPriceForSymbol(symbol);
        }
      }

      // إضافة معلمة timestamp لتجنب التخزين المؤقت
      const url = `/api/current-price?symbol=${encodeURIComponent(symbol)}&t=${Date.now()}`;

      // استخدام آلية إعادة المحاولة مع حد زمني
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000); // حد زمني 7 ثواني

      try {
        // استخدام آلية إعادة المحاولة
        const response = await retryFetch(url, 3, 1500, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();

        // تحسين التحقق من صحة السعر
        if (!data || typeof data.price !== 'number' || isNaN(data.price) || data.price <= 0) {
          console.error('تم استلام سعر غير صالح:', data);

          // محاولة استخدام السعر المخزن في حالة فشل استرداد سعر جديد
          const cachedPrice = getCachedPrice(symbol);
          if (cachedPrice !== null) {
            toast({
              title: t('cached_data_used_title'),
              description: t('cached_data_used_desc'),
              variant: "default",
            });
            return cachedPrice;
          }

          toast({
            title: t('data_analysis_error_title'),
            description: t('data_analysis_error_desc'),
            variant: "destructive",
          });
          return null;
        }

        // تخزين السعر في التخزين المؤقت مع وقت انتهاء الصلاحية
        safeSetLocalStorage(`price_${symbol}`, {
          price: data.price,
          timestamp: Date.now(),
          expires: Date.now() + 10 * 60 * 1000, // 10 دقائق من الصلاحية
          source: data.source || 'server'
        });

        return data.price;

      } catch (innerError) {
        clearTimeout(timeoutId);
        throw innerError; // رمي الخطأ ليتم التقاطه في كتلة الخطأ الخارجية
      }

    } catch (error) {
      console.error('خطأ في جلب سعر الزوج:', error);

      // في حالة الخطأ، تحقق من وجود بيانات مخزنة محليًا
      const cachedPrice = getCachedPrice(symbol);
      if (cachedPrice !== null) {
        console.log('استخدام السعر المخزن محليًا بسبب فشل الطلب:', cachedPrice);
        toast({
          title: t('cached_data_used_title'),
          description: t('cached_data_loaded_desc'),
          variant: "default",
        });

        // هذا قد يكون مؤشرًا على مشكلة في الاتصال
        if (!showConnectionError && !isOfflineMode) {
          setShowConnectionError(true);
        }

        return cachedPrice;
      }

      toast({
        title: t('local_mode_switch_title'),
        description: t('updating_price_data_desc'),
        variant: "destructive",
        action: !isOfflineMode ? (
          <button 
            onClick={enableOfflineMode} 
            className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded-lg text-xs"
          >
            {t('enable_offline_mode_button')}
          </button>
        ) : undefined
      });
      return null;
    } finally {
      setPriceLoading(false);
    }
  };

  // تحسين دالة calculateTargetPrice لتعمل بشكل أكثر دقة مع إشارات البيع والشراء
  const calculateTargetPrice = (currentPrice: number, signal: SignalType, timeframe: TimeFrame): number => {
    console.log(t('calculating_enhanced_target_price'), { currentPrice, signal, timeframe });

    // تاريخ ووقت التحليل
    const analysisTime = new Date();
    const hourOfDay = analysisTime.getHours();
    const dayOfWeek = analysisTime.getDay();

    // معاملات خاصة تعتمد على الوقت لزيادة واقعية التوقعات
    // تقلبات السوق أعلى بشكل عام في بداية أو نهاية اليوم التداولي
    const timeFactors = {
      // عامل الوقت يتراوح بين 0.8 و 1.2 اعتمادًا على وقت اليوم
      // تقلبات أعلى في بداية ونهاية يوم التداول
      timeFactor: (() => {
        if (hourOfDay < 4) return 1.15; // بداية التداول الآسيوي
        if (hourOfDay < 8) return 0.85; // منتصف التداول الآسيوي
        if (hourOfDay < 12) return 1.1; // بداية التداول الأوروبي
        if (hourOfDay < 16) return 0.95; // التداول الأوروبي الأمريكي 
        if (hourOfDay < 20) return 1.2; // إغلاق السوق الأمريكي
        return 0.9; // وقت هادئ نسبيًا
      })(),

      // عامل اليوم يتراوح بين 0.9 و 1.1 اعتمادًا على يوم الأسبوع
      // تقلبات أعلى يوم الاثنين (بداية الأسبوع) والجمعة (نهاية الأسبوع)
      dayFactor: (() => {
        if (dayOfWeek === 1) return 1.1; // الاثنين - بداية الأسبوع
        if (dayOfWeek === 5) return 1.15; // الجمعة - نهاية الأسبوع
        return 1.0; // أيام عادية
      })()
    };

    // استخدام التقلبات التاريخية الحقيقية
    let baseVolatility: number = 0.01; // قيمة افتراضية أولية

    // التحقق إذا كان الزوج موجودًا في بيانات التقلب التاريخية
    const historicalVolatility = HISTORICAL_VOLATILITY as Record<string, number>;
    if (Object.prototype.hasOwnProperty.call(historicalVolatility, selectedPair.symbol)) {
      // استخدام القيمة الحقيقية المخزنة مسبقًا
      baseVolatility = historicalVolatility[selectedPair.symbol];
      console.log(`استخدام التقلب التاريخي المعروف لـ ${selectedPair.symbol}: ${baseVolatility * 100}%`);
    } 
    // إذا لم تكن متوفرة، استخدم الإصدار المحسن من معاملات التقلب
    else {
      // استخدام التصنيف المحسن حسب نوع الزوج
      if (selectedPair.type === 'forex') {
        if (selectedPair.symbol.includes('JPY')) {
          baseVolatility = VOLATILITY_FACTORS.forex.exotic;
        } else if (selectedPair.symbol.includes('USD')) {
          baseVolatility = VOLATILITY_FACTORS.forex.major;
        } else {
          baseVolatility = VOLATILITY_FACTORS.forex.cross;
        }

      } else if (selectedPair.type === 'crypto') {
        // تصنيف العملات المشفرة بشكل أكثر دقة
        if (selectedPair.symbol.includes('BTC')) {
          baseVolatility = VOLATILITY_FACTORS.crypto.major;
        } else if (selectedPair.symbol.includes('ETH')) {
          baseVolatility = VOLATILITY_FACTORS.crypto.major * 1.1;
        } else {
          baseVolatility = VOLATILITY_FACTORS.crypto.alt;
        }

      } else if (selectedPair.type === 'stocks') {
        // تصنيف الأسهم بشكل أكثر دقة
        if (['AAPL', 'MSFT', 'GOOGL', 'AMZN'].includes(selectedPair.symbol)) {
          baseVolatility = VOLATILITY_FACTORS.stocks.tech;
        } else {
          baseVolatility = VOLATILITY_FACTORS.stocks.other;
        }
      } else {
        // قيمة افتراضية للأنواع الأخرى
        baseVolatility = 0.01; // 1% تقلب افتراضي
      }

      console.log(`استخدام تقلب تقديري لـ ${selectedPair.symbol}: ${baseVolatility * 100}%`);
    }

    console.log('معامل التقلب الأساسي المحسّن:', baseVolatility);

    // تحسين ضبط التقلب حسب الإطار الزمني مع عوامل أكثر دقة
    // الأطر الزمنية الأطول لها تقلبات أكبر
    const timeframeMultipliers: Record<TimeFrame, { multiplier: number, targetRange: number }> = {
      '1M': { multiplier: 1.0, targetRange: 0.2 }, // حركة قصيرة المدى
      '5M': { multiplier: 1.8, targetRange: 0.4 }, // حركة أكبر قليلاً
      '15M': { multiplier: 2.5, targetRange: 0.6 }, // حركة متوسطة المدى
      '1H': { multiplier: 3.5, targetRange: 0.8 }, // حركة أكبر
      '4H': { multiplier: 5.0, targetRange: 1.0 }, // حركة كبيرة
      '1D': { multiplier: 7.0, targetRange: 1.5 }  // حركة كبيرة جدًا
    };

    // الحصول على المضاعفات المناسبة للإطار الزمني
    const { multiplier: timeframeMultiplier, targetRange } = 
      timeframeMultipliers[timeframe] || timeframeMultipliers['15M'];

    // حساب التقلب النهائي مع دمج جميع العوامل
    const volatility = baseVolatility * timeframeMultiplier * timeFactors.timeFactor * timeFactors.dayFactor;

    // حساب نطاق التغير المتوقع بناءً على السعر الحالي والتقلب المحسوب
    let expectedChange = currentPrice * volatility;

    console.log('التغير المتوقع بعد تحسين العوامل:', expectedChange);

    // تحسين: إضافة التناسق بدلاً من العشوائية
    // استخدام عامل متناسق يعتمد على السعر والإطار الزمني والوقت
    const priceSeed = parseInt(currentPrice.toString().replace('.', '').substring(0, 4));
    const timeframeSeed = timeframe.charCodeAt(0) + (timeframe.length > 1 ? timeframe.charCodeAt(1) : 0);
    const timeSeed = (hourOfDay * 60 + analysisTime.getMinutes()) / 1440;

    // إنشاء عامل متناسق بدلاً من العامل العشوائي
    const consistencyFactor = (priceSeed % 20) / 100 + 0.9 + // عامل ثابت من السعر (0.9-1.1)
                             Math.sin(timeframeSeed * timeSeed * Math.PI) * 0.1; // عامل متغير (±0.1)

    // حساب السعر المستهدف مع مراعاة الاتجاه والمتغيرات
    let targetPrice: number;
    if (signal === 'UP') {
      targetPrice = currentPrice + (expectedChange * consistencyFactor);

      // تحسين إضافي: إضافة عوامل دعم ومقاومة لتتناسب مع واقع السوق
      // إذا كان لدينا معلومات عن مستويات الدعم والمقاومة
      if (marketAnalysis) {
        const resistance = marketAnalysis.resistance;
        // إذا كان السعر المستهدف أعلى من مستوى المقاومة، اضبطه ليتلامس مع المقاومة
        if (resistance > currentPrice && targetPrice > resistance) {
          targetPrice = resistance - (resistance - currentPrice) * 0.1;
        }
      }

    } else if (signal === 'DOWN') {
      targetPrice = currentPrice - (expectedChange * consistencyFactor);

      // إضافة عوامل الدعم والمقاومة للإشارات الهبوطية
      if (marketAnalysis) {
        const support = marketAnalysis.support;
        // إذا كان السعر المستهدف أقل من مستوى الدعم، اضبطه ليتلامس مع الدعم
        if (support < currentPrice && targetPrice < support) {
          targetPrice = support + (currentPrice - support) * 0.1;
        }
      }

    } else {
      return currentPrice; // إذا كانت الإشارة WAIT
    }

    // تحسين إضافي: التأكد من أن السعر المستهدف معقول بالنسبة للإطار الزمني
    // تجنب التوقعات المبالغ فيها أو المنخفضة جدًا
    const maxChangePercent = targetRange / 100; // الحد الأقصى للتغير بالنسبة المئوية
    const maxChange = currentPrice * maxChangePercent;
    const changeAmount = Math.abs(targetPrice - currentPrice);

    if (changeAmount > maxChange) {
      // إذا كان التغيير كبيرًا جدًا، قم بتحديده بالحد الأقصى المناسب
      targetPrice = signal === 'UP' 
        ? currentPrice + maxChange
        : currentPrice - maxChange;
    }

    // تقريب السعر باستخدام دالة getPricePrecision
    const decimals = getPricePrecision(selectedPair.symbol);
    const finalPrice = parseFloat(targetPrice.toFixed(decimals));

    console.log('السعر المستهدف النهائي (محسّن):', finalPrice);
    return finalPrice;
  };

  // متغيرات لتتبع الإشارة الحالية
  const [cooldownTime, setCooldownTime] = useState<number>(() => {
    const savedEndTime = safeGetLocalStorageString('signalCooldownEndTime', null);
    if (savedEndTime) {
      const remainingTime = Math.ceil((parseInt(savedEndTime) - Date.now()) / 1000);
      return remainingTime > 0 ? remainingTime : 0;
    }
    return 0;
  });

  const [isCooldown, setIsCooldown] = useState<boolean>(() => {
    return cooldownTime > 0;
  });

  // تعريف المؤشرات الفنية وأوزانها لحساب الإشارة
  const technicalIndicators = {
    rsi: { weight: 20 }, // مؤشر القوة النسبية
    macd: { weight: 20 }, // تقارب وتباعد المتوسطات المتحركة
    ema: { weight: 15 }, // المتوسط المتحرك الأسي
    bb: { weight: 15 }, // نطاقات بولينجر
    stoch: { weight: 15 }, // مؤشر ستوكاستيك
    adx: { weight: 15 }, // مؤشر الاتجاه المتوسط
  };

  // وظيفة الحصول على إشارة جديدة
  const getSignal = async () => {
    if (isCooldown) {
      toast({
        title: t('cooldown_period'),
        description: t('wait_time_message').replace('{time}', cooldownTime.toString()),
        variant: "default",
      });
      return;
    }

    if (!isMarketOpen) {
      toast({
        title: t('market_closed_title'),
        description: t('market_closed_message').replace('{time}', marketNextOpenTime || ''),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // إظهار إشعار بدء تحليل الإشارة
      toast({
        title: t('analyzing_signal'),
        description: t('analyzing_message')
          .replace('{pair}', selectedPair.symbol)
          .replace('{timeframe}', selectedTimeFrame),
      });

      // جلب السعر الحالي للزوج
      const price = await fetchCurrentPrice(selectedPair.symbol);

      if (price === null) {
        // بدلاً من رمي خطأ، سنقوم بمعالجة الخطأ مباشرة هنا
        toast({
          title: 'جاري تحديث البيانات',
          description: 'نعمل على جلب أحدث الأسعار. الرجاء الانتظار أو المحاولة مرة أخرى لاحقاً.',
          variant: "destructive",
        });
        setIsLoading(false);
        return; // الخروج من الدالة بدون رمي خطأ
      }

      // تخزين السعر الحالي
      setCurrentPrice(price);
      console.log('تم تحديث السعر الحالي:', price);

      // الحصول على نتائج التحليل
      const analysisResults = await analyzeMarket(selectedPair.symbol, selectedTimeFrame);
      console.log('نتائج التحليل المستلمة:', analysisResults);

      // طباعة الإشارة المستلمة للتصحيح
      console.log('نوع الإشارة المستلمة:', typeof analysisResults.signal);
      console.log('قيمة الإشارة قبل المعالجة:', analysisResults.signal);

      // التأكد من معالجة الإشارة بشكل صحيح قبل تعيينها
      let finalSignal: SignalType = 'WAIT';

      if (analysisResults.signal === 'UP' || analysisResults.signal === 'DOWN') {
          // الإشارة مناسبة، استخدمها كما هي
          finalSignal = analysisResults.signal;
      } else {
          // تحويل الإشارة من تنسيق الخادم إلى تنسيق الواجهة
          const signalMap: Record<string, SignalType> = {
              'buy': 'UP',
              'sell': 'DOWN',
              'wait': 'WAIT'
          };

          const normalizedSignal = String(analysisResults.signal).toLowerCase().trim();
          console.log('الإشارة المعالجة:', normalizedSignal);

          finalSignal = signalMap[normalizedSignal] || 'WAIT';
      }

      console.log('الإشارة النهائية بعد المعالجة:', finalSignal);

      // تحديث الحالة بالقيم المحسوبة
      setProbability(analysisResults.probability);
      setSignal(finalSignal); // استخدام الإشارة المعالجة
      setMarketAnalysis(analysisResults.analysis);
      setIndicatorResults(analysisResults.indicators);

      // حساب وتعيين السعر المستهدف
      if (finalSignal !== 'WAIT') {
        const calculatedTarget = calculateTargetPrice(
          price,
          finalSignal,
          selectedTimeFrame
        );
        console.log('تم حساب السعر المستهدف:', calculatedTarget);
        setTargetPrice(calculatedTarget);
      } else {
        setTargetPrice(null);
      }

      // تحديث واجهة المستخدم وإظهار النتائج
      toast({
        title: t('new_signal_message').replace(
          '{type}',
          finalSignal === 'UP'
            ? t('signal_up')
            : finalSignal === 'DOWN'
              ? t('signal_down')
              : t('signal_wait')
        ),
        description: `${selectedPair.symbol} - ${t('probability')} ${Math.round(Number(analysisResults.probability))}%`,
        variant: finalSignal === 'DOWN' ? "destructive" : "default",
      });

      // تحديد مدة الانتظار وتفعيل العداد التنازلي
      const timeoutDuration = getTimeoutDuration(selectedTimeFrame);
      // تمرير الإشارة المعالجة بدلاً من إشارة التحليل الأصلية
      const analysisWithFinalSignal = {
        ...analysisResults,
        signal: finalSignal // استخدام الإشارة المعالجة
      };
      saveSignalAndStartCooldown(analysisWithFinalSignal, timeoutDuration);

      setCooldownTime(timeoutDuration);
      setIsCooldown(true);

    } catch (error) {
      console.error('خطأ في الحصول على الإشارة:', error);

      // تحديد نوع الخطأ وعرض رسالة مناسبة
      let errorTitle = 'تحليل السوق جاري';
      let errorDescription = 'نقوم بتحديث تحليلات السوق. يمكنك المحاولة مرة أخرى بعد قليل.';

      // إذا كان الخطأ متعلق بالشبكة أو الاتصال
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('اتصال') || error.message.includes('connection')) {
          errorTitle = 'تحديث البيانات';
          errorDescription = 'نحن نعمل على تحديث بيانات الأسعار والتحليلات. يمكنك المحاولة مرة أخرى بعد قليل.';
        }
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // دالة مساعدة لتحديد مدة الانتظار
  const getTimeoutDuration = (timeframe: TimeFrame): number => {
    const durations: Record<TimeFrame, number> = {
      '1M': 60,
      '5M': 120,
      '15M': 180,
      '1H': 300,
      '4H': 600,
      '1D': 900
    };
    return durations[timeframe] || 30;
  };

  // تأثير لإدارة العداد التنازلي
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    if (isCooldown && cooldownTime > 0) {
      // إنشاء مؤقت يقلل الوقت بمقدار 1 ثانية
      timerId = setTimeout(() => {
        setCooldownTime(prevTime => {
          const newTime = prevTime - 1;
          if (newTime <= 0) {
            // إزالة وقت الانتهاء من التخزين المحلي عندما ينتهي العداد
            safeRemoveLocalStorage('signalCooldownEndTime');
          }
          return newTime;
        });
      }, 1000);
    } else if (isCooldown && cooldownTime === 0) {
      // عندما ينتهي الوقت، نعيد تعيين الحالة
      timerId = setTimeout(() => {
        setIsCooldown(false);
        safeRemoveLocalStorage('signalCooldownEndTime');

        // اهتزاز الزر عند الانتهاء
        const signalButton = document.querySelector('.get-signal-button');
        if (signalButton) {
          signalButton.classList.add('animate-bounce');
          setTimeout(() => {
            signalButton.classList.remove('animate-bounce');
          }, 1000);
        }
      }, 800);
    }

    // تنظيف المؤقت عند فك المكون
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [isCooldown, cooldownTime]);

  // تأثير إضافي لتحديث فترة الانتظار عند تغيير الإطار الزمني
  useEffect(() => {
    // إذا كان المستخدم في انتظار بالفعل وتغير الإطار الزمني
    // يمكن هنا تحديث مدة الانتظار المتبقية (اختياري)
    // لكن في الحالة الحالية نترك الفترة الزمنية كما هي لتجنب إرباك المستخدم
  }, [selectedTimeFrame]);

  // استعادة اختيار المنصة من التخزين المحلي
  useEffect(() => {
    try {
      const savedPlatformId = safeGetLocalStorageString('selectedTradingPlatform', null);
      if (savedPlatformId) {
        const platform = tradingPlatforms.find(p => p.id === savedPlatformId);
        if (platform) {
          setSelectedPlatform(platform);
        }
      }
    } catch (e) {
      console.error('Error loading platform selection from localStorage:', e);
    }
  }, []);

  // إغلاق القائمة المنسدلة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('platform-dropdown');
      if (dropdown && !dropdown.contains(event.target as Node) && isPlatformDropdownOpen) {
        setIsPlatformDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPlatformDropdownOpen]);

  // التحقق من حالة السوق باستخدام API
  const [marketNextOpenTime, setMarketNextOpenTime] = useState<string | undefined>();
  const timezone = useTimezone();

  //  // إضافةالتخزين المؤقت لحالةالسوق
  const { data: marketStatus, isLoading: isMarketStatusLoading } = useQuery({
    queryKey: ['marketStatus', selectedPair.type, timezone.getActualTimezone()],
    queryFn: async () => {
      try {
        const userTimezone = timezone.getActualTimezone();
        const response = await fetch(`/api/market-status?market=${selectedPair.type}&timezone=${userTimezone}`);
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error checking market status from API:', error);
        const { isOpen, nextOpenTime } = timezone.getMarketTimes(selectedPair.type);
        return { isOpen, nextOpenTime };
      }
    },
    staleTime: 60000, // تحديث كل دقيقة
    gcTime: 120000 // الاحتفاظ بالبيانات في الذاكرة لمدة دقيقتين
  });

  // مستمع الحدث لتفعيل وضع عدم الاتصال
  useEffect(() => {
    // مستمع حدث تفعيل وضع عدم الاتصال من موفر WebSocket
    const handleEnableOfflineMode = (event: CustomEvent) => {
      console.log('تم استلام حدث تفعيل وضع عدم الاتصال:', event.detail);

      // تفعيل وضع عدم الاتصال
      enableOfflineMode();

      // عرض سبب تفعيل وضع عدم الاتصال إذا كان متاحًا
      if (event.detail?.reason) {
        const reasons: Record<string, string> = {
          'https_websocket_limitation': 'قيود اتصال WebSocket في HTTPS',
          'network_error': 'خطأ في الشبكة',
          'api_limit_exceeded': 'تم تجاوز حد استخدام API',
          'connection_timeout': 'انتهت مهلة الاتصال'
        };

        const reasonText = reasons[event.detail.reason] || 'سبب غير معروف';

        toast({
          title: t('offline_mode_enabled_title'),
          description: `${t('offline_mode_activation_reason')} ${reasonText}. ${t('offline_mode_enabled_desc')}`,
          variant: "default",
          duration: 7000
        });
      }
    };

    // إضافة مستمع الحدث
    window.addEventListener('enableOfflineMode', handleEnableOfflineMode as EventListener);

    // التحقق من حالة وضع عدم الاتصال المخزنة
    const storedOfflineMode = localStorage.getItem('offline_mode');
    if (storedOfflineMode === 'enabled') {
      setIsOfflineMode(true);
    }

    return () => {
      // إزالة مستمع الحدث عند تفريغ المكون
      window.removeEventListener('enableOfflineMode', handleEnableOfflineMode as EventListener);
    };
  }, [enableOfflineMode, toast]);

  // إضافة متغير لتخزين وقت إغلاق السوق التالي
  const [marketNextCloseTime, setMarketNextCloseTime] = useState<string | undefined>();

  // تحديث حالة السوق عند تغير البيانات
  useEffect(() => {
    if (marketStatus) {
      setIsMarketOpen(marketStatus.isOpen);
      setMarketNextOpenTime(marketStatus.nextOpenTime);
      setMarketNextCloseTime(marketStatus.nextCloseTime);
    }
  }, [marketStatus]);


  // إزالة تأثير تحديث السعر التلقائي
  useEffect(() => {
    if (currentPrice === null && isLoading) {
      fetchCurrentPrice(selectedPair.symbol);
    }
  }, [isLoading, selectedPair.symbol]);

  // تحسين عرض الأسعار في واجهة المستخدم
  const renderPrices = () => {
    if (!currentPrice && !isLoading) return null;

    return (
      <div className="flex flex-col gap-2 p-4 bg-card/50 rounded-lg">
        {/* السعر الحالي */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('current_price')}:</span>
          </div>
          <div className="text-lg font-semibold tabular-nums">
            {currentPrice ? currentPrice.toFixed(getPricePrecision(selectedPair.symbol)) : (
              priceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '-'
            )}
          </div>
        </div>

        {/* السعر المتوقع */}
        {signal !== 'WAIT' && targetPrice && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('target_price')}:</span>
            </div>
            <div className={`text-lg font-semibold tabular-nums ${
              signal === 'UP' ? 'text-success' : 'text-destructive'
            }`}>
              {targetPrice.toFixed(getPricePrecision(selectedPair.symbol))}
            </div>
          </div>
        )}

        {/* نسبة التغير المتوقعة */}
        {signal !== 'WAIT' && targetPrice && currentPrice && (
          <div className="mt-1 text-xs text-muted-foreground text-center">
            {t('expected_price_change')}: {' '}
            <span className={signal === 'UP' ? 'text-success' : 'text-destructive'}>
              {Math.round((Math.abs(targetPrice - currentPrice) / currentPrice) * 100)}%
            </span>
          </div>
        )}
      </div>
    );
  };

  // تحسين عرض التحليل والمؤشرات
  const renderAnalysis = () => {
    if (!marketAnalysis || !indicatorResults) return null;

    return (
      <div className="mb-4 bg-card/70 rounded-lg p-4 border border-border/40">
        <div className="grid grid-cols-2 gap-4">
          {/* تحليل السوق */}
          <div className="analysis-box">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('market_analysis')}</h4>
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{t('trend')}</span>
                <span className={`text-xs font-medium ${
                  marketAnalysis.trend === 'bullish' ? 'text-success' : 'text-destructive'
                }`}>
                  {t(marketAnalysis.trend)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{t('strength')}</span>
                <div className="flex items-center gap-2">
                  <Progress value={marketAnalysis.strength} className="w-16 h-2" />
                  <span className="text-xs font-medium">{Math.round(Number(marketAnalysis.strength))}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{t('volatility')}</span>
                <div className="flex items-center gap-2">
                  <Progress value={marketAnalysis.volatility} className="w-16 h-2" />
                  <span className="text-xs font-medium">{Math.round(Number(marketAnalysis.volatility))}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* المؤشرات الفنية */}
          <div className="indicators-box">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('technical_indicators')}</h4>
            <div className="grid gap-2">
              {Object.entries(indicatorResults).map(([key, data]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{key.toUpperCase()}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${
                      data.signal === 'buy' ? 'text-success' :
                        data.signal === 'sell' ? 'text-destructive' :
                          'text-muted-foreground'
                    }`}>
                      {Math.round(data.value)}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      data.signal === 'buy' ? 'bg-success/10 text-success' :
                        data.signal === 'sell' ? 'bg-destructive/10 text-destructive' :
                          'bg-muted text-muted-foreground'
                    }`}>
                      {t(data.signal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // تحسين عرض الإشارات السابقة
  const renderPreviousSignals = () => {
    if (!showPreviousSignals || previousSignals.length === 0) return null;

    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">{t('previous_signals')}</h3>
          <button
            onClick={() => setShowPreviousSignals(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {previousSignals.map((prevSignal, index) => (
            <div
              key={prevSignal.timestamp}
              className="bg-card/50 rounded-lg p-3 border border-border/30"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{prevSignal.symbol}</span>
                  <span className="text-xs text-muted-foreground">{prevSignal.timeframe}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(prevSignal.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SignalIndicator
                    signal={prevSignal.signal}
                    size="sm"
                    probability={prevSignal.probability}
                    variant="outline"
                    animated={false}
                  />
                  <span className="text-sm font-medium">
                    {Math.round(Number(prevSignal.probability))}% {t('probability')}
                  </span>
                </div>
                {prevSignal.analysis && (
                  <div className={`text-xs px-2 py-1 rounded ${
                    prevSignal.analysis.trend === 'bullish' ? 'bg-success/10 text-success' :
                      'bg-destructive/10 text-destructive'
                  }`}>
                    {t(prevSignal.analysis.trend)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // تحديث وقت الانتهاء وحفظ الإشارة الحالية
  const saveSignalAndStartCooldown = (analysisResults: any, timeoutDuration: number) => {
    const endTime = Date.now() + (timeoutDuration * 1000);
    safeSetLocalStorageString('signalCooldownEndTime', endTime.toString());

    // حفظ الإشارة الحالية في قائمة الإشارات السابقة
    if (analysisResults.signal !== 'WAIT') {
      const newSignal = {
        timestamp: Date.now(),
        symbol: selectedPair.symbol,
        timeframe: selectedTimeFrame,
        signal: analysisResults.signal,
        probability: analysisResults.probability,
        analysis: analysisResults.analysis
      };

      const updatedSignals = [newSignal, ...previousSignals].slice(0, maxPreviousSignals);
      setPreviousSignals(updatedSignals);

      safeSetLocalStorage('previousSignals', updatedSignals);
    }
  };

  return (
    <div className="trading-app trading-signal-app flex flex-col">
      {/* عرض مكون خطأ الاتصال عندما يكون الاتصال غير متاح */}
      {!isOnline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <ConnectionError 
            message={t('connection_error_message')}
            onRetry={checkConnection}
            autoRetry={true}
            retryInterval={20}
          />
        </div>
      )}

      {/* شريط التنقل العلوي مع الشعار */}
      <header className="fixed top-0 left-0 right-0 flex justify-between items-center p-3 border-b border-border backdrop-blur-md z-50 shadow-md bg-background/90">
        <div className="logo flex items-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-sm -z-10 scale-150"></div>
            <LineChart className="text-primary h-6 w-6 mr-2" />
          </div>
          <div className="font-bold text-lg flex items-baseline">
            <span className="hidden md:inline">{t('app_name')}</span>
            <span className="md:hidden">{t('app_name_short')}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* زر الخريطة الحرارية */}
          <button 
            onClick={() => setShowHeatmap(!showHeatmap)} 
            className={`p-1.5 rounded-full border ${
              showHeatmap 
              ? 'bg-primary/20 border-primary/60 text-primary' 
              : 'bg-muted/80 border-border text-muted-foreground'
            }`}
            title={t('heatmap_view')}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button className="p-1.5 rounded-full bg-muted/80 border border-border">
            <Globe className="text-muted-foreground h-4 w-4" />
          </button>
          <Link href="/settings">
            <button className="p-1.5 rounded-full bg-muted/80 border border-border">
              <Settings className="text-primary h-4 w-4" />
            </button>
          </Link>
        </div>
      </header>

      {/* إضافة مكون خطأ الاتصال */}
      {showConnectionError && !isOfflineMode && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50 p-4">
          <ConnectionError 
            message={t("analysis_data_updating")} 
            onRetry={handleRetryConnection}
            onEnableOfflineMode={enableOfflineMode}
            showOfflineModeOption={true}
            autoRetry={true}
            retryInterval={15}
            className="max-w-md"
          />
        </div>
      )}

      {/* شريط حالة وضع عدم الاتصال - استخدام مكون OfflineModeNotice */}
      {(isOfflineMode || window.location.protocol === 'https:') && (
        <div className="fixed top-16 inset-x-0 z-40">
          <OfflineModeNotice 
            isOffline={isOfflineMode} 
            onToggle={isOfflineMode ? disableOfflineMode : enableOfflineMode}
            httpsMode={window.location.protocol === 'https:'}
            variant="compact"
            className="mx-auto max-w-4xl"
          />
        </div>
      )}

      <main className="flex-1 p-3 mt-16 flex flex-col items-center">
        {/* قسم الخريطة الحرارية للاحتمالية */}
        {showHeatmap && (
          <div className="w-full max-w-7xl mb-6 animate-in fade-in duration-500">
            <div className="mb-2 flex items-center justify-between bg-card/50 p-2 rounded-lg border border-border/30">
              <div className="flex items-center space-x-2">
                <Grid className="h-5 w-5 ml-2 text-primary" />
                <h3 className="text-base font-medium">{t('probability_heatmap')}</h3>
              </div>
              <div className="flex items-center gap-2">
                {heatmapLastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    {t('last_updated')}: {new Date(heatmapLastUpdated).toLocaleTimeString()}
                  </span>
                )}
                <button 
                  onClick={refreshHeatmap}
                  disabled={heatmapLoading}
                  className="p-1.5 rounded-md bg-muted text-foreground hover:bg-muted/80 flex items-center text-xs"
                >
                  {heatmapLoading ? (
                    <><RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> {t('loading')}</>
                  ) : (
                    <><RefreshCw className="h-3.5 w-3.5 mr-1" /> {t('refresh')}</>
                  )}
                </button>
                <button 
                  onClick={() => setShowHeatmap(false)}
                  className="p-1.5 rounded-md bg-muted/50 text-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <ProbabilityHeatmap 
              data={heatmapData}
              isLoading={heatmapLoading}
              onRefresh={refreshHeatmap}
              onSymbolSelect={(symbol: string, type: MarketType) => {
                const pair = tradingPairs.find(p => p.symbol === symbol && p.type === type);
                if (pair) {
                  handlePairChange(pair);
                  setShowHeatmap(false);
                }
              }}
              className="shadow-lg"
            />
          </div>
        )}
        {/* منطقة حالة السوق وتنبيه الإغلاق */}
        <div className="w-full max-w-md mb-4 flex flex-col items-center">
          <MarketStatus
            isOpen={isMarketOpen}
            marketType={selectedPair.type}
            nextOpenTime={marketNextOpenTime}
            nextCloseTime={marketNextCloseTime}
          />
          {!isMarketOpen && (
            <MarketClosedAlert
              nextOpenTime={marketNextOpenTime || ''}
              marketType={selectedPair.type}
              nextCloseTime={marketNextCloseTime}
            />
          )}
        </div>

        {/* طبقة القرارات التداولية */}
        <div className="w-full max-w-sm mb-4 rounded-2xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden">
          {/* اختيار المنصة التداولية (قائمة منسدلة) */}
          <div className="platform-selector p-3 border-b border-border">
            <label className="block text-[13px] font-medium mb-1.5 text-foreground flex items-center">
              <Globe className="h-3 w-3 ml-1 text-primary" />
              {t('select_trading_platform')}
            </label>

            {/* قائمة منسدلة مخصصة مع أيقونات */}
            <div className="relative">
              <button
                onClick={() => setIsPlatformDropdownOpen(!isPlatformDropdownOpen)}
                className="w-full p-2.5 rounded-lg bg-muted border border-border text-foreground flex items-center justify-between text-left"
              >
                <div className="flex items-center">
                  <div className="mr-3 flex-shrink-0">{selectedPlatform.icon}</div>
                  <span>{t(`platform_${selectedPlatform.id}`)}</span>
                </div>
                <div className="flex items-center">
                  <div className="text-muted-foreground opacity-60 mr-2 flex-shrink-0">{selectedPlatform.icon}</div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isPlatformDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* قائمة الخيارات */}
              {isPlatformDropdownOpen && (
                <div id="platform-dropdown" className="absolute mt-1 w-full z-50 bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {tradingPlatforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => {
                        setSelectedPlatform(platform);
                        setIsPlatformDropdownOpen(false);

                        // حفظ اختيار المستخدم في التخزين المحلي
                        safeSetLocalStorageString('selectedTradingPlatform', platform.id);

                        // تحديث نوع الزوج النشط إذا كان النوع الحالي غير مدعوم في المنصة الجديدة
                        if (!platform.supportedMarkets.includes(activePairType)) {
                          // اختيار أول نوع مدعوم في المنصة الجديدة
                          const newMarketType = platform.supportedMarkets[0];
                          handleChangePairType(newMarketType);
                        }
                      }}
                      className={`w-full p-2 flex items-center justify-between hover:bg-muted transition-colors ${
                        selectedPlatform.id === platform.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 mr-3">{platform.icon}</div>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-medium text-foreground">{t(`platform_${platform.id}`)}</span>
                          <span className="text-xs text-muted-foreground">{platform.name}</span>
                        </div>
                      </div>
                      <div className="text-muted-foreground opacity-60 mr-1 flex-shrink-0">{platform.icon}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* عرض أيقونة المنصة المختارة */}
            <div className="mt-2 flex items-center justify-between bg-muted/40 rounded-lg p-2 border border-border/30">
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-3">{selectedPlatform.icon}</div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-primary">{t(`platform_${selectedPlatform.id}`)}</span>
                  <span className="text-xs text-muted-foreground">{selectedPlatform.name}</span>
                </div>
              </div>
              <div className="text-primary/60 flex-shrink-0">{selectedPlatform.icon}</div>
            </div>

            {/* عرض معلومات إضافية عن المنصة المختارة */}
            <div className="mt-2 text-xs bg-muted/60 border border-border/50 rounded-lg p-2 text-muted-foreground">
              <div className="flex items-center justify-between mb-1">
                <span>{t('min_deposit')}</span>
                <span className="font-medium text-foreground">{selectedPlatform.minAmount || '-'}</span>
              </div>

              {selectedPlatform.orderTypes && selectedPlatform.orderTypes.length > 0 && (
                <div className="flex items-center justify-between mb-1">
                  <span>{t('order_types')}</span>
                  <span className="font-medium text-foreground">
                    {selectedPlatform.orderTypes.map(type => t(type)).join(', ')}
                  </span>
                </div>
              )}

              {selectedPlatform.features && selectedPlatform.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedPlatform.features.map((feature, index) => (
                    <span
                      key={index}
                      className="inline-block px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] border border-primary/20"
                    >
                      {t(feature)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* اختيار الزوج التداولي */}
          <div className="trading-pair-selector p-3 border-b border-border bg-muted/30">
            <label className="block text-[13px] font-medium mb-1.5 text-foreground flex items-center">
              {selectedPair.type === 'forex' && <DollarSign className="h-3 w-3 ml-1 text-primary" />}
              {selectedPair.type === 'crypto' && <Bitcoin className="h-3 w-3 ml-1 text-primary" />}
              {selectedPair.type === 'stocks' && <LineChart className="h-3 w-3 ml-1 text-primary" />}
              {t('select_trading_pair')}
            </label>

            {/* تصفية الأزواج حسب النوع - عرض فقط الأنواع المدعومة من المنصة المختارة */}
            <div className="flex mb-2 gap-1">
              {selectedPlatform.supportedMarkets.includes('forex') && (
                <button
                  onClick={() => handleChangePairType('forex')}
                  className={`flex-1 py-1 rounded-md text-xs border flex items-center justify-center ${
                    activePairType === 'forex'
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-muted border-border text-foreground hover:bg-muted/80'
                  }`}
                >
                  <DollarSign className="h-3 w-3 ml-0.5" />
                  {t('forex')}
                </button>
              )}

              {selectedPlatform.supportedMarkets.includes('crypto') && (
                <button
                  onClick={() => handleChangePairType('crypto')}
                  className={`flex-1 py-1 rounded-md text-xs border flex items-center justify-center ${
                    activePairType === 'crypto'
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-muted border-border text-foreground hover:bg-muted/80'
                  }`}
                >
                  <Bitcoin className="h-3 w-3 ml-0.5" />
                  {t('crypto')}
                </button>
              )}

              {selectedPlatform.supportedMarkets.includes('stocks') && (
                <button
                  onClick={() => handleChangePairType('stocks')}
                  className={`flex-1 py-1 rounded-md text-xs border flex items-center justify-center ${
                    activePairType === 'stocks'
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-muted border-border text-foreground hover:bg-muted/80'
                  }`}
                >
                  <LineChart className="h-3 w-3 ml-0.5" />
                  {t('stocks')}
                </button>
              )}
            </div>

            {/* الأزواج */}
            <div className="grid grid-cols-2 gap-2 w-full">
              {tradingPairs.filter(pair => pair.type === activePairType).map((pair) => (
                <button
                  key={pair.symbol}
                  onClick={() => handlePairChange(pair)}
                  className={`py-2 px-2 text-sm rounded-lg border transition duration-150 flex flex-col items-center justify-center ${
                    selectedPair.symbol === pair.symbol
                      ? 'bg-primary/10 text-primary border-primary/30 font-bold shadow-md'
                      : 'bg-muted border-border hover:bg-muted/80 text-foreground'
                  }`}
                >
                  <span className="text-sm font-medium">{pair.symbol}</span>
                  <span className="text-[10px] text-muted-foreground">{pair.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* اختيار الإطار الزمني - مع إضافة علاقة الإطار الزمني بالسعر المتوقع */}
          <div className="time-frame-selector p-3">
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[13px] font-medium text-foreground flex items-center">
                <Clock className="h-3 w-3 ml-1 text-primary" />
                {t('select_timeframe')}
                {selectedPlatform.expiryTimes && (
                  <span className="mr-2 text-[10px] bg-muted rounded px-1.5 py-0.5 border border-border/50">
                    {t('available_timeframes_only')}
                  </span>
                )}
              </label>

              {/* شرح أهمية الإطار الزمني في التداول */}
              {signal !== 'WAIT' && (
                <div className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  signal === 'UP' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                }`}>
                  {t('prediction_valid_for')} {selectedTimeFrame}
                </div>
              )}
            </div>

            <TimeframeButtons
              selectedTimeframe={selectedTimeFrame}
              onChange={(tf) => {
                setSelectedTimeFrame(tf);
                // إعادة تعيين الإشارة عند تغيير الإطار الزمني
                setSignal('WAIT');
                setProbability(0);
              }}
              availableTimeframes={
                selectedPlatform.expiryTimes
                  ? Object.keys(selectedPlatform.expiryTimes).filter(tf =>
                    selectedPlatform.expiryTimes?.[tf as TimeFrame] !== undefined
                  ) as TimeFrame[]
                  : undefined
              }
              // تمرير متغيرات إضافية لإظهار العلاقة بين الإطار الزمني والإشارة
              currentSignal={signal}
              timeframeAnalysis={marketAnalysis ? {
                [selectedTimeFrame]: {
                  trend: marketAnalysis.trend,
                  strength: marketAnalysis.strength
                }
              } : undefined}
            />

            {/* إضافة توضيح للعلاقة بين الإطار الزمني والسعر المتوقع */}
            {signal !== 'WAIT' && targetPrice && (
              <div className={`mt-1.5 text-[10px] px-2 py-1 rounded-md ${
                signal === 'UP' ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'
              }`}>
                <div className="flex justify-between items-center">
                  <span>
                    {t(signal === 'UP' ? 'expected_price_rise_in' : 'expected_price_drop_in')}
                    <span className="font-bold mx-1">{selectedTimeFrame}</span>
                  </span>
                  <span className={`font-mono font-bold ${signal === 'UP' ? 'text-success' : 'text-destructive'}`}>
                    {targetPrice.toFixed(selectedPair.symbol.includes('JPY') ? 3 : selectedPair.type === 'crypto' ? 2 : 5)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* منطقة عرض الإشارة */}
        <div className="signal-display w-full max-w-sm mb-4 overflow-hidden">
          <div className="relative p-4 bg-card/90 backdrop-blur-sm border border-border rounded-2xl shadow-xl">
            {/* عنوان المربع */}
            <div className="text-center mb-4">
              <h3 className="text-sm font-medium text-primary mb-1">{t('current_signal')}</h3>
              <div className="w-12 h-1 bg-primary/20 mx-auto rounded-full"></div>
            </div>

            {/* عرض السعر الحالي والمتوقع */}
            <div className="w-full max-w-md mb-4">
              {renderPrices()}
            </div>

            {/* حالة الإشارة */}
            <div className="flex justify-center items-center mb-4">
              {signal === 'WAIT' ? (
                <div className="text-muted-foreground text-lg font-bold py-2 flex items-center">
                  <Clock className="mr-1.5 h-4 w-4 animate-pulse text-primary" />
                  <span className="animate-pulse">{t('waiting_for_signal')}</span>
                </div>
              ) : (
                <div className="py-2 scale-125 transition-all duration-300">
                  <SignalIndicator
                    signal={signal}
                    size="lg"
                    probability={probability}
                    variant="gradient"
                    animated={true}
                  />
                </div>
              )}
            </div>

            {/* عرض نتائج التحليل الفني ومؤشرات السوق */}
            {renderAnalysis()}

            {/* عرض الاحتمالية الموحد */}
            <ProbabilityBar 
              signal={signal}
              probability={probability}
              marketAnalysis={marketAnalysis}
            />


            {signal !== 'WAIT' && (
              <>
                {/* معلومات التحديث */}
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground pt-2 border-t border-border/30">
                  <Clock className="h-4 w-4 ml-1.5 opacity-80" />
                  <div className="flex items-center gap-2 rtl">
                    <span className="font-medium text-primary">{selectedPair.symbol}</span>
                    <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
                    <span className="font-medium">{selectedTimeFrame}</span>
                    <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
                    <span className="text-muted-foreground">{new Date().toLocaleTimeString('ar-EG')}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* منطقة عرض الإشارات السابقة */}
        {renderPreviousSignals()}

        {/* زر الحصول على إشارة */}
        <button
          className={`get-signal-button w-full max-w-sm py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 transform hover:translate-y-[-2px] active:translate-y-[1px] ${
            isCooldown
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }`}
          onClick={getSignal}
          disabled={isLoading || !isMarketOpen || isCooldown}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{t('analyzing')}</span>
            </div>
          ) : isCooldown ? (
            <div className="flex items-center justify-center">
              <Timer className="w-5 h-5 mr-2" />
              <span>{t('next_signal_in')} {cooldownTime}s</span>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <LineChart className="w-5 h-5 mr-2" />
              <span>{t('get_signal')}</span>
            </div>
          )}
        </button>
      </main>

      {/* شريط التنقل السفلي */}
      <BottomNavigation activeTab="trading" />

      {/* مساحة في الأسفل لتجنب التداخل مع الشريط المثبت */}
      <div className="h-16"></div>
      <Toaster />
    </div>
  );
}