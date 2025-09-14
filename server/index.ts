import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from './auth';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import env, { initConfigKeys } from './env'; // استيراد ملف البيئة والدالة الجديدة لتهيئة المفاتيح
import { storage } from './storage'; // استيراد واجهة التخزين للوصول إلى قاعدة البيانات

// إنشاء بديل لـ __dirname في بيئة ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

console.log('Starting server initialization...');
console.log('Environment check:', {
  NODE_ENV: env.NODE_ENV,
  DATABASE_URL: 'Set', // نحن نتأكد دائمًا من وجود DATABASE_URL الآن
  SESSION_SECRET: 'Set' // نحن نتأكد دائمًا من وجود SESSION_SECRET الآن
});

const app = express();

// إعداد الوسائط الأساسية
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// نقطة نهاية للفحص الصحي
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// إعداد نظام المصادقة
console.log('Setting up authentication...');
setupAuth(app);

async function killProcessOnPort(port: number) {
  try {
    console.log(`Checking for processes on port ${port}...`);
    const { stdout } = await execAsync(`lsof -t -i:${port}`);
    if (stdout) {
      const pids = stdout.split('\n').filter(Boolean);
      for (const pid of pids) {
        console.log(`Killing process ${pid} on port ${port}`);
        await execAsync(`kill -9 ${pid}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    if ((error as any).code === 1) {
      console.log(`No process found on port ${port}`);
      return;
    }
    console.error('Error killing process:', error);
  }
}

(async () => {
  try {
    // Kill any existing process on port 5000
    await killProcessOnPort(5000);
    
    // تهيئة مفاتيح API في قاعدة البيانات
    console.log('تهيئة مفاتيح API...');
    await initConfigKeys(storage);

    console.log('Starting routes registration...');
    const server = await registerRoutes(app);

    // معالجة الأخطاء العامة
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error caught by middleware:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // إضافة معالج 404 JSON للـ API routes قبل Vite catch-all
    app.use('/api*', (_req, res) => {
      res.status(404).json({ error: 'API endpoint not found' });
    });

    // تحديد وضع التشغيل حسب البيئة
    if (env.NODE_ENV === 'production') {
      console.log('Setting up production server with static files...');
      serveStatic(app);
    } else {
      console.log('Setting up Vite development server...');
      await setupVite(app, server);
    }

    // معالجة الإغلاق بشكل سلس
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM signal, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    // بدء تشغيل الخادم
    console.log('Attempting to start server...');
    const port = 5000;
    await new Promise((resolve, reject) => {
      server.listen(port, "0.0.0.0", () => {
        console.log(`Server is running on http://0.0.0.0:${port}`);
        resolve(true);
      }).on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`Port ${port} is still in use after cleanup attempt`);
        } else {
          console.error('Server startup error:', error);
        }
        reject(error);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();