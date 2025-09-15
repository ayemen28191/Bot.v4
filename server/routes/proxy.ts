
import express from 'express';
import axios, { AxiosError } from 'axios';
import { logsService } from '../services/logs-service';
// إنشاء دالة محلية للتحقق من المصادقة
function isAuthenticated(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

const proxyRouter = express.Router();

// واجهة للطلبات الخارجية مع تجاوز CORS
proxyRouter.post('/fetch', isAuthenticated, async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, data } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'العنوان مطلوب'
      });
    }

    // التحقق من صحة العنوان
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'عنوان غير صالح'
      });
    }

    await logsService.logInfo('proxy', `Proxy request initiated: ${method} ${url}`, {
      action: 'proxy_request',
      method: method.toUpperCase(),
      targetUrl: url,
      userId: req.user?.id,
      username: req.user?.username,
      clientIP: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });

    // إعداد الطلب
    const config = {
      url,
      method: method.toUpperCase(),
      headers: {
        'User-Agent': 'Binar-Join-Analytic-Bot/1.0',
        'Accept': 'application/json',
        'Connection': 'close',
        ...headers
      },
      timeout: 8000, // تقليل timeout إلى 8 ثواني
      maxRedirects: 3, // تقليل عدد redirects
      data: data || undefined,
      validateStatus: (status: number) => status < 500 // قبول جميع حالات الحالة أقل من 500
    };

    const response = await axios(config);

    await logsService.logInfo('proxy', `Proxy request successful: ${method} ${url}`, {
      action: 'proxy_success',
      method: method.toUpperCase(),
      targetUrl: url,
      responseStatus: response.status,
      userId: req.user?.id,
      username: req.user?.username
    });

    res.json({
      success: true,
      data: response.data,
      status: response.status,
      headers: response.headers
    });

  } catch (error) {
    await logsService.logError('proxy', `Proxy request failed: ${req.body.method || 'GET'} ${req.body.url}`, {
      action: 'proxy_error',
      method: req.body.method || 'GET',
      targetUrl: req.body.url,
      error: error instanceof Error ? error.message : String(error),
      userId: req.user?.id,
      username: req.user?.username,
      clientIP: req.ip || 'unknown'
    });

    if (error instanceof AxiosError) {
      res.status(error.response?.status || 500).json({
        success: false,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'خطأ في الخادم الوكيل'
      });
    }
  }
});

// وكيل خاص لواجهات التداول
proxyRouter.get('/market-data/:provider/:symbol', isAuthenticated, async (req, res) => {
  try {
    const { provider, symbol } = req.params;
    const { apiKey } = req.query;

    let apiUrl = '';
    let headers = {};

    switch (provider.toLowerCase()) {
      case 'alphavantage':
        apiUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
        break;
      case 'twelvedata':
        apiUrl = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${apiKey}`;
        break;
      case 'binance':
        apiUrl = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
        if (apiKey) {
          headers = { 'X-MBX-APIKEY': apiKey };
        }
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'مقدم الخدمة غير مدعوم'
        });
    }

    await logsService.logInfo('proxy', `Market data request: ${provider} - ${symbol}`, {
      action: 'market_data_request',
      provider,
      symbol,
      userId: req.user?.id,
      username: req.user?.username,
      clientIP: req.ip || 'unknown'
    });

    const response = await axios.get(apiUrl, {
      headers,
      timeout: 8000
    });

    await logsService.logInfo('proxy', `Market data request successful: ${provider} - ${symbol}`, {
      action: 'market_data_success',
      provider,
      symbol,
      responseStatus: response.status,
      userId: req.user?.id,
      username: req.user?.username
    });

    res.json({
      success: true,
      provider,
      symbol,
      data: response.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await logsService.logError('proxy', `Market data request failed: ${req.params.provider} - ${req.params.symbol}`, {
      action: 'market_data_error',
      provider: req.params.provider,
      symbol: req.params.symbol,
      error: error instanceof Error ? error.message : String(error),
      userId: req.user?.id,
      username: req.user?.username,
      clientIP: req.ip || 'unknown'
    });

    if (error instanceof AxiosError) {
      res.status(error.response?.status || 500).json({
        success: false,
        message: `خطأ من ${req.params.provider}: ${error.message}`,
        provider: req.params.provider,
        symbol: req.params.symbol
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'خطأ في خادم بيانات السوق'
      });
    }
  }
});

export { proxyRouter };
