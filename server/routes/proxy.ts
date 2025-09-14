
import express from 'express';
import axios, { AxiosError } from 'axios';
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

    console.log(`🌐 Proxy request: ${method} ${url}`);

    // إعداد الطلب
    const config = {
      url,
      method: method.toUpperCase(),
      headers: {
        'User-Agent': 'Binar-Join-Analytic-Bot/1.0',
        'Accept': 'application/json',
        ...headers
      },
      timeout: 10000,
      maxRedirects: 5,
      data: data || undefined
    };

    const response = await axios(config);

    res.json({
      success: true,
      data: response.data,
      status: response.status,
      headers: response.headers
    });

  } catch (error) {
    console.error('خطأ في الوكيل:', error);

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

    console.log(`📊 Market data proxy: ${provider} - ${symbol}`);

    const response = await axios.get(apiUrl, {
      headers,
      timeout: 8000
    });

    res.json({
      success: true,
      provider,
      symbol,
      data: response.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`خطأ في جلب بيانات السوق:`, error);

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
