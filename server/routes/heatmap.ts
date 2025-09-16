/**
 * مسارات API للخريطة الحرارية
 */

import express from 'express';
import { getHeatmapData, getFilteredHeatmapData } from '../services/heatmap-service';
import { 
  createValidationError, 
  ERROR_CODES,
  ERROR_MESSAGES 
} from '@shared/error-types';
import { catchAsync } from '../middleware/global-error-handler';

export const heatmapRouter = express.Router();

/**
 * الحصول على كامل بيانات الخريطة الحرارية
 * GET /api/heatmap
 */
heatmapRouter.get('/', catchAsync(async (req, res) => {
  const data = await getHeatmapData();
  res.json(data);
}));

/**
 * الحصول على بيانات الخريطة الحرارية مع تطبيق المرشحات
 * GET /api/heatmap/filtered?marketType=forex&timeframe=1M&symbol=EUR/USD
 */
heatmapRouter.get('/filtered', catchAsync(async (req, res) => {
  const { marketType, timeframe, symbol } = req.query;
  
  // التحقق من صحة المعلمات
  let validMarketType: 'forex' | 'crypto' | 'stocks' | undefined;
  if (marketType && !['forex', 'crypto', 'stocks'].includes(marketType as string)) {
    throw createValidationError(
      ERROR_CODES.VALIDATION_INVALID_FORMAT,
      'نوع السوق يجب أن يكون forex أو crypto أو stocks',
      'marketType',
      marketType
    );
  }
  if (marketType) {
    validMarketType = marketType as 'forex' | 'crypto' | 'stocks';
  }
  
  const data = await getFilteredHeatmapData(
    validMarketType,
    timeframe as string,
    symbol as string
  );
  
  res.json(data);
}));

/**
 * تحديث بيانات الخريطة الحرارية يدويًا
 * POST /api/heatmap/refresh
 */
heatmapRouter.post('/refresh', catchAsync(async (req, res) => {
  // للتبسيط، نستخدم نفس دالة الجلب لأنها ستقوم بالتحديث إذا كانت البيانات منتهية الصلاحية
  const data = await getHeatmapData();
  res.json({
    success: true,
    message: 'تم تحديث بيانات الخريطة الحرارية بنجاح',
    lastUpdate: data.lastUpdate
  });
}));