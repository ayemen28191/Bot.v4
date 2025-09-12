/**
 * مسارات API للخريطة الحرارية
 */

import express from 'express';
import { getHeatmapData, getFilteredHeatmapData } from '../services/heatmap-service';

export const heatmapRouter = express.Router();

/**
 * الحصول على كامل بيانات الخريطة الحرارية
 * GET /api/heatmap
 */
heatmapRouter.get('/', async (req, res) => {
  try {
    const data = await getHeatmapData();
    res.json(data);
  } catch (error) {
    console.error('خطأ في الحصول على بيانات الخريطة الحرارية:', error);
    res.status(500).json({
      error: 'حدث خطأ أثناء جلب بيانات الخريطة الحرارية',
      details: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});

/**
 * الحصول على بيانات الخريطة الحرارية مع تطبيق المرشحات
 * GET /api/heatmap/filtered?marketType=forex&timeframe=1M&symbol=EUR/USD
 */
heatmapRouter.get('/filtered', async (req, res) => {
  try {
    const { marketType, timeframe, symbol } = req.query;
    
    // التحقق من صحة المعلمات
    let validMarketType: 'forex' | 'crypto' | 'stocks' | undefined;
    if (marketType && ['forex', 'crypto', 'stocks'].includes(marketType as string)) {
      validMarketType = marketType as 'forex' | 'crypto' | 'stocks';
    }
    
    const data = await getFilteredHeatmapData(
      validMarketType,
      timeframe as string,
      symbol as string
    );
    
    res.json(data);
  } catch (error) {
    console.error('خطأ في الحصول على بيانات الخريطة الحرارية المصفاة:', error);
    res.status(500).json({
      error: 'حدث خطأ أثناء جلب بيانات الخريطة الحرارية المصفاة',
      details: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});

/**
 * تحديث بيانات الخريطة الحرارية يدويًا
 * POST /api/heatmap/refresh
 */
heatmapRouter.post('/refresh', async (req, res) => {
  try {
    // للتبسيط، نستخدم نفس دالة الجلب لأنها ستقوم بالتحديث إذا كانت البيانات منتهية الصلاحية
    const data = await getHeatmapData();
    res.json({
      success: true,
      message: 'تم تحديث بيانات الخريطة الحرارية بنجاح',
      lastUpdate: data.lastUpdate
    });
  } catch (error) {
    console.error('خطأ في تحديث بيانات الخريطة الحرارية:', error);
    res.status(500).json({
      error: 'حدث خطأ أثناء تحديث بيانات الخريطة الحرارية',
      details: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});