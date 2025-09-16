import { useState, useEffect, useCallback } from 'react';
import { HeatmapData, HeatmapCell } from '@/features/trading/ProbabilityHeatmap';
import { getQueryFn } from '@/lib/queryClient';
import { t } from '@/lib/i18n';
import { safeGetLocalStorage, safeSetLocalStorage, safeGetLocalStorageString } from '@/lib/storage-utils';

// استدعاء بيانات الخريطة الحرارية من API
const fetchHeatmapData = async (): Promise<HeatmapData> => {
  try {
    const response = await fetch('/api/heatmap');

    if (!response.ok) {
      throw new Error(`خطأ في الاتصال: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(t('heatmap_data_fetch_error'), error);
    // إرجاع بيانات فارغة في حالة الخطأ
    return {
      forex: [],
      crypto: [],
      stocks: [],
      lastUpdate: Date.now()
    };
  }
};

// معاملات Hook
interface UseHeatmapOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // بالميلي ثانية
  offlineMode?: boolean;
}

// مخرجات Hook
interface UseHeatmapReturn {
  data: HeatmapData | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  filterData: (marketType?: 'forex' | 'crypto' | 'stocks', timeframe?: string, symbol?: string) => HeatmapCell[];
  lastUpdated: number | null;
}

// Hook خريطة الاحتمالية الحرارية
export function useHeatmap({
  autoRefresh = false,
  refreshInterval = 300000, // 5 دقائق افتراضيًا
  offlineMode = false
}: UseHeatmapOptions = {}): UseHeatmapReturn {
  // حالة البيانات
  const [data, setData] = useState<HeatmapData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // مدى صلاحية الذاكرة المؤقتة - زيادة المدة في وضع عدم الاتصال
  const CACHE_DURATION = offlineMode ? 24 * 60 * 60 * 1000 : 10 * 60 * 1000; // 24 ساعة في وضع عدم الاتصال، 10 دقائق في الحالة العادية

  // دالة لجلب البيانات
  const fetchData = useCallback(async () => {
    // تجنب جلب البيانات في وضع عدم الاتصال
    if (offlineMode) {
      // محاولة استرجاع البيانات من التخزين المحلي
      const cachedData = getCachedData();

      if (cachedData) {
        setData(cachedData);
        setLastUpdated(cachedData.lastUpdate);
      }

      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const heatmapData = await fetchHeatmapData();
      setData(heatmapData);
      setLastUpdated(Date.now());

      // تخزين البيانات محليًا للاستخدام في وضع عدم الاتصال
      const currentTime = Date.now();

      // تخزين البيانات الرئيسية
      safeSetLocalStorage('heatmap_data', {
        data: heatmapData,
        timestamp: currentTime
      });

      // تخزين نسخة احتياطية - تحديث كل 24 ساعة فقط لتوفير مساحة التخزين
      const backupData = safeGetLocalStorageString('heatmap_backup_data');
      const shouldUpdateBackup = !backupData || 
                               (backupData && JSON.parse(backupData).timestamp < (currentTime - 24 * 60 * 60 * 1000));

      if (shouldUpdateBackup) {
        safeSetLocalStorage('heatmap_backup_data', {
          data: heatmapData,
          timestamp: currentTime
        });
        console.log(t('backup_data_updated_log'));
      }

      // تخزين بيانات لأزواج محددة للاستخدام في حالات الطوارئ
      if (heatmapData.forex && heatmapData.forex.length > 0) {
        const forexPairs = ['EUR/USD', 'USD/JPY', 'GBP/USD'];
        forexPairs.forEach(pair => {
          const pairData = heatmapData.forex.filter(cell => cell.symbol === pair);
          if (pairData.length > 0) {
            safeSetLocalStorage(`heatmap_${pair.replace('/', '_')}`, {
              data: {
                forex: pairData,
                crypto: [],
                stocks: [],
                lastUpdate: currentTime
              },
              timestamp: currentTime
            });
          }
        });
      }

      if (heatmapData.crypto && heatmapData.crypto.length > 0) {
        const cryptoPairs = ['BTC/USD', 'ETH/USD'];
        cryptoPairs.forEach(pair => {
          const pairData = heatmapData.crypto.filter(cell => cell.symbol === pair);
          if (pairData.length > 0) {
            safeSetLocalStorage(`heatmap_${pair.replace('/', '_')}`, {
              data: {
                forex: [],
                crypto: pairData,
                stocks: [],
                lastUpdate: currentTime
              },
              timestamp: currentTime
            });
          }
        });
      }
    } catch (err) {
      console.error(t('heatmap_data_fetch_error'), err);
      setError(err instanceof Error ? err : new Error(String(err)));

      // محاولة استرجاع البيانات المخزنة محليًا في حالة الخطأ
      const cachedData = getCachedData();

      if (cachedData) {
        setData(cachedData);
        setLastUpdated(cachedData.lastUpdate);
      }
    } finally {
      setIsLoading(false);
    }
  }, [offlineMode]);

  // الحصول على البيانات المخزنة محليًا
  const getCachedData = useCallback((): HeatmapData | null => {
    try {
      // أولاً نحاول الحصول على البيانات من مفتاح التخزين الرئيسي
      const cachedItem = safeGetLocalStorageString('heatmap_data');

      if (cachedItem) {
        const { data, timestamp } = JSON.parse(cachedItem);

        // التحقق من صلاحية البيانات المخزنة
        if (Date.now() - timestamp < CACHE_DURATION || offlineMode) {
          console.log(t('using_cached_heatmap_data'), 
                     Math.floor((Date.now() - timestamp) / 60000), 'دقائق');
          return data;
        }
      }

      // البحث في مفاتيح العملات الأكثر استخداماً
      const commonPairs = ['EUR/USD', 'BTC/USD', 'ETH/USD', 'USD/JPY'];
      for (const pair of commonPairs) {
        const pairKey = `heatmap_${pair.replace('/', '_')}`;
        const pairData = safeGetLocalStorageString(pairKey);

        if (pairData) {
          try {
            const { data, timestamp } = JSON.parse(pairData);

            if (Date.now() - timestamp < CACHE_DURATION * 2 || offlineMode) {
              console.log(`${t('using_cached_pair_data')} ${pair}, ${t('data_age')}:`, 
                         Math.floor((Date.now() - timestamp) / 60000), 'دقائق');
              return data;
            }
          } catch (pairErr) {
            console.warn(`${t('pair_data_fetch_error')} ${pairKey}:`, pairErr);
          }
        }
      }

      // محاولة استرداد البيانات الاحتياطية للحالات الطارئة
      const backupData = safeGetLocalStorageString('heatmap_backup_data');
      if (backupData && offlineMode) {
        try {
          const { data } = JSON.parse(backupData);
          console.log(t('using_backup_data_offline'));
          return data;
        } catch (backupErr) {
          console.warn(t('backup_data_fetch_error'), backupErr);
        }
      }
    } catch (err) {
      console.warn(t('local_heatmap_data_error'), err);
    }

    return null;
  }, [offlineMode, CACHE_DURATION]);

  // دالة لتصفية البيانات
  const filterData = useCallback(
    (marketType?: 'forex' | 'crypto' | 'stocks', timeframe?: string, symbol?: string): HeatmapCell[] => {
      if (!data) return [];

      let filteredData: HeatmapCell[] = [];

      // تحديد نوع السوق المطلوب تصفيته
      if (marketType) {
        filteredData = data[marketType];
      } else {
        filteredData = [...data.forex, ...data.crypto, ...data.stocks];
      }

      // تصفية حسب الإطار الزمني
      if (timeframe) {
        filteredData = filteredData.filter(cell => cell.timeframe === timeframe);
      }

      // تصفية حسب الرمز
      if (symbol) {
        filteredData = filteredData.filter(cell => cell.symbol === symbol);
      }

      return filteredData;
    },
    [data]
  );

  // جلب البيانات عند التحميل
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // تحديث دوري للبيانات إذا كان التحديث التلقائي مفعلًا
  useEffect(() => {
    if (!autoRefresh || offlineMode) return;

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchData, refreshInterval, offlineMode]);

  // دالة التحديث العامة
  const refresh = async () => {
    await fetchData();
  };

  return {
    data,
    isLoading,
    error,
    refresh,
    filterData,
    lastUpdated
  };
}