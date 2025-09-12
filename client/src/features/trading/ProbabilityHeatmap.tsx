import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Grid, AlertCircle, ChevronRight, ArrowUpCircle, ArrowDownCircle, Clock, HelpCircle } from 'lucide-react';
import { TimeFrame } from './TimeframeButtons';
import SignalIndicator, { SignalType } from './SignalIndicator';
import { t } from '@/lib/i18n';

// تعريف واجهة خلية الخريطة الحرارية
export interface HeatmapCell {
  symbol: string;
  timeframe: string;
  signal: 'UP' | 'DOWN' | 'WAIT';
  probability: number;
  strength?: number;
  timestamp: number;
  price?: number;
  analysis?: {
    trend: string;
    strength: number;
    volatility: number;
    support?: number;
    resistance?: number;
  };
}

// تعريف واجهة بيانات الخريطة الحرارية
export interface HeatmapData {
  forex: HeatmapCell[];
  crypto: HeatmapCell[];
  stocks: HeatmapCell[];
  lastUpdate: number;
}

// واجهة خصائص المكون
interface ProbabilityHeatmapProps {
  data: HeatmapData | null;
  isLoading: boolean;
  onRefresh: () => void;
  onSymbolSelect?: (symbol: string, type: 'forex' | 'crypto' | 'stocks') => void;
  className?: string;
}

export const ProbabilityHeatmap: React.FC<ProbabilityHeatmapProps> = ({
  data,
  isLoading,
  onRefresh,
  onSymbolSelect,
  className = ''
}) => {
  // حالة التبويبات والتصفية
  const [activeTab, setActiveTab] = useState<'forex' | 'crypto' | 'stocks'>('forex');
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>('1M');
  const [sortBy, setSortBy] = useState<'probability' | 'strength' | 'symbol'>('probability');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // تنسيق التاريخ والوقت
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // الحصول على بيانات الخريطة المصفاة
  const getFilteredData = useCallback(() => {
    if (!data) return [];
    
    const marketData = data[activeTab] || [];
    
    // تصفية حسب الإطار الزمني
    const filteredByTimeframe = selectedTimeframe
      ? marketData.filter(cell => cell.timeframe === selectedTimeframe)
      : marketData;
    
    // ترتيب البيانات حسب الحقل المحدد
    return [...filteredByTimeframe].sort((a, b) => {
      let aValue, bValue;
      
      if (sortBy === 'probability') {
        aValue = a.probability;
        bValue = b.probability;
      } else if (sortBy === 'strength') {
        aValue = a.strength || 0;
        bValue = b.strength || 0;
      } else {
        aValue = a.symbol;
        bValue = b.symbol;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [data, activeTab, selectedTimeframe, sortBy, sortDirection]);

  // الحصول على لون الخلية بناءً على الاحتمالية
  const getCellColor = (cell: HeatmapCell): string => {
    const { signal, probability } = cell;
    
    if (signal === 'WAIT' || probability < 50) {
      return 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700';
    }
    
    if (signal === 'UP') {
      if (probability >= 80) return 'bg-green-500/20 hover:bg-green-500/30';
      if (probability >= 70) return 'bg-green-400/20 hover:bg-green-400/30';
      if (probability >= 60) return 'bg-green-300/20 hover:bg-green-300/30';
      return 'bg-green-200/20 hover:bg-green-200/30';
    } else {
      if (probability >= 80) return 'bg-red-500/20 hover:bg-red-500/30';
      if (probability >= 70) return 'bg-red-400/20 hover:bg-red-400/30';
      if (probability >= 60) return 'bg-red-300/20 hover:bg-red-300/30';
      return 'bg-red-200/20 hover:bg-red-200/30';
    }
  };

  // المعالج عند النقر على خلية
  const handleCellClick = (cell: HeatmapCell) => {
    if (onSymbolSelect) {
      onSymbolSelect(cell.symbol, activeTab);
    }
  };

  // عرض المكون
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <h3 className="text-lg font-medium">{t('probability_heatmap')}</h3>
            <Tooltip>
              <HelpCircle className="h-4 w-4 mr-1 ml-1 text-muted-foreground cursor-help" />
              <div className="p-2 max-w-xs text-sm">
                {t('heatmap_tooltip')}
              </div>
            </Tooltip>
          </div>
          <div className="flex gap-2 items-center">
            {data && (
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(data.lastUpdate)}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {t('heatmap_description')}
        </p>
        {!data && !isLoading && (
          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-md text-xs flex items-center">
            <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
            <span>{t('heatmap_data_incomplete_warning')}</span>
          </div>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'forex' | 'crypto' | 'stocks')}>
        <div className="px-4 pt-2 border-b">
          <TabsList className="w-full">
            <TabsTrigger value="forex" className="flex-1">{t('forex')}</TabsTrigger>
            <TabsTrigger value="crypto" className="flex-1">{t('crypto')}</TabsTrigger>
            <TabsTrigger value="stocks" className="flex-1">{t('stocks')}</TabsTrigger>
          </TabsList>
        </div>
        
        <div className="p-2 border-b bg-muted/40 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-2">
            <Select value={selectedTimeframe} onValueChange={(value) => setSelectedTimeframe(value as TimeFrame)}>
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder={t('timeframe')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1M">1 {t('minute')}</SelectItem>
                <SelectItem value="5M">5 {t('minutes')}</SelectItem>
                <SelectItem value="15M">15 {t('minutes')}</SelectItem>
                <SelectItem value="1H">1 {t('hour')}</SelectItem>
                <SelectItem value="4H">4 {t('hours')}</SelectItem>
                <SelectItem value="1D">1 {t('day')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'probability' | 'strength' | 'symbol')}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t('sort_by')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="probability">{t('probability')}</SelectItem>
                <SelectItem value="strength">{t('strength')}</SelectItem>
                <SelectItem value="symbol">{t('symbol')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-2"
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
          
          {data && (
            <div className="text-xs text-muted-foreground">
              {t('last_update')}: {formatTimestamp(data.lastUpdate)}
            </div>
          )}
        </div>
        
        <TabsContent value="forex" className="m-0">
          <RenderHeatmap 
            data={getFilteredData()} 
            isLoading={isLoading} 
            getCellColor={getCellColor} 
            handleCellClick={handleCellClick} 
          />
        </TabsContent>
        
        <TabsContent value="crypto" className="m-0">
          <RenderHeatmap 
            data={getFilteredData()} 
            isLoading={isLoading} 
            getCellColor={getCellColor} 
            handleCellClick={handleCellClick} 
          />
        </TabsContent>
        
        <TabsContent value="stocks" className="m-0">
          <RenderHeatmap 
            data={getFilteredData()} 
            isLoading={isLoading} 
            getCellColor={getCellColor} 
            handleCellClick={handleCellClick} 
          />
        </TabsContent>
      </Tabs>
    </Card>
  );
};

// مكون فرعي لعرض بيانات الخريطة الحرارية
interface RenderHeatmapProps {
  data: HeatmapCell[];
  isLoading: boolean;
  getCellColor: (cell: HeatmapCell) => string;
  handleCellClick: (cell: HeatmapCell) => void;
}

const RenderHeatmap: React.FC<RenderHeatmapProps> = ({ data, isLoading, getCellColor, handleCellClick }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-10 w-10 mb-2 text-amber-500" />
        <p className="text-center text-muted-foreground mb-2">{t('no_data_available')}</p>
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md max-w-md text-xs text-center">
          <p className="mb-2 text-gray-600 dark:text-gray-300">{t('heatmap_data_retry_message')}</p>
          <ol className="list-decimal text-left text-gray-500 dark:text-gray-400 pl-4 space-y-1">
            <li>{t('heatmap_retry_tip_1')}</li>
            <li>{t('heatmap_retry_tip_2')}</li>
            <li>{t('heatmap_retry_tip_3')}</li>
          </ol>
        </div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-3">
      {data.map((cell, index) => (
        <div
          key={`${cell.symbol}-${cell.timeframe}-${index}`}
          className={`
            cursor-pointer rounded-md overflow-hidden shadow-sm transition-all
            hover:shadow-md hover:scale-[1.02] ${getCellColor(cell)}
            p-3 flex flex-col
          `}
          onClick={() => handleCellClick(cell)}
        >
          <div className="flex justify-between items-center">
            <div className="font-medium text-sm">{cell.symbol}</div>
            <SignalIndicator signal={cell.signal} size="sm" />
          </div>
          
          <div className="mt-2 flex flex-col">
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>{t('probability')}:</span>
              <span className={`font-medium ${
                cell.signal === 'UP' ? 'text-green-600 dark:text-green-400' : 
                cell.signal === 'DOWN' ? 'text-red-600 dark:text-red-400' : ''
              }`}>
                {Number(cell.probability).toFixed(2)}%
              </span>
            </div>
            
            {cell.strength !== undefined && (
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>{t('strength')}:</span>
                <span className="font-medium">{Number(cell.strength).toFixed(2)}%</span>
              </div>
            )}
            
            {cell.price !== undefined && (
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>{t('price')}:</span>
                <span className="font-medium">
                  {typeof cell.price === 'number' ? 
                    cell.price.toFixed(cell.price < 1 ? 4 : 2) : 
                    cell.price}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-auto pt-2 flex justify-between items-center text-[10px] text-muted-foreground">
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {cell.timeframe}
            </div>
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProbabilityHeatmap;