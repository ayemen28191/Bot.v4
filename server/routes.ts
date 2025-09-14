import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
import { apiKeysRouter } from "./routes/api-keys";
import { apiKeysDebugRouter } from "./routes/api-keys-debug";
import { testRouter } from "./routes/test";
import priceRouter from "./routes/price";
import { updateRouter } from "./routes/update";
import { deploymentRouter } from "./routes/deployment";
import { heatmapRouter } from "./routes/heatmap";
import { proxyRouter } from "./routes/proxy";
import marketStatusRoutes from './routes/market-status';
import testCountdownRoutes from './routes/test-countdown';


// التأكد من أن المستخدم مُسجل الدخول
function isAuthenticated(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  return res.status(401).json({ error: 'يجب تسجيل الدخول للوصول إلى هذا المسار.' });
}

// التأكد من أن المستخدم هو مشرف
function isAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  return res.status(403).json({ error: 'غير مصرح بالوصول. المسار مخصص للمشرفين فقط.' });
}

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('Creating HTTP server...');
  const httpServer = createServer(app);

  // مسارات مفاتيح API
  app.use("/api/config-keys", apiKeysRouter);
  app.use("/api/config-keys-debug", apiKeysDebugRouter);

  // تسجيل مسارات الاختبار
  app.use("/api/test", testRouter);

  // تسجيل مسارات السعر
  app.use(priceRouter);

  // تسجيل مسارات التحديث
  app.use("/api/update", updateRouter);

  // تسجيل مسارات النشر
  app.use("/api/deployment", deploymentRouter);

  // تسجيل مسارات الخريطة الحرارية
  app.use('/api/heatmap', heatmapRouter);

  // تسجيل مسارات الوكيل
  app.use("/api/proxy", proxyRouter);

  // ===== مسارات إعدادات المستخدم =====

  // جلب إعدادات المستخدم الحالي
  app.get('/api/user/settings', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // إرجاع إعدادات المستخدم (بدون معلومات حساسة)
      res.json({
        preferredLanguage: user.preferredLanguage || 'en',
        preferredTheme: user.preferredTheme || 'system'
      });
    } catch (error) {
      console.error('Error fetching user settings:', error);
      res.status(500).json({ error: 'فشل في جلب إعدادات المستخدم' });
    }
  });

  // حفظ إعدادات المستخدم الحالي
  app.put('/api/user/settings', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { preferredLanguage, preferredTheme } = req.body;

      // إعداد كائن التحديث
      const updateData: any = {};

      // التحقق من صحة اللغة المطلوبة
      if (preferredLanguage) {
        if (typeof preferredLanguage !== 'string') {
          return res.status(400).json({ error: 'اللغة المفضلة يجب أن تكون نص' });
        }

        // قائمة باللغات المدعومة (متطابقة مع الواجهة الأمامية)
        const supportedLanguages = ['ar', 'en', 'hi'];
        if (!supportedLanguages.includes(preferredLanguage)) {
          return res.status(400).json({
            error: 'اللغة غير مدعومة',
            supportedLanguages
          });
        }

        updateData.preferredLanguage = preferredLanguage.trim().toLowerCase();
      }

      // التحقق من صحة السمة المطلوبة
      if (preferredTheme) {
        if (typeof preferredTheme !== 'string') {
          return res.status(400).json({ error: 'السمة المفضلة يجب أن تكون نص' });
        }

        // قائمة بالسمات المدعومة
        const supportedThemes = ['light', 'dark', 'system'];
        if (!supportedThemes.includes(preferredTheme)) {
          return res.status(400).json({
            error: 'السمة غير مدعومة',
            supportedThemes
          });
        }

        updateData.preferredTheme = preferredTheme.trim().toLowerCase();
      }

      // التحقق من وجود بيانات للتحديث
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'لا توجد إعدادات للتحديث' });
      }

      // تحديث إعدادات المستخدم
      const updatedUser = await storage.updateUser(userId, updateData);

      // إرجاع الإعدادات المحدثة
      res.json({
        preferredLanguage: updatedUser.preferredLanguage,
        preferredTheme: updatedUser.preferredTheme,
        message: 'تم حفظ إعدادات المستخدم بنجاح'
      });
    } catch (error: any) {
      console.error('Error saving user settings:', error);
      res.status(500).json({
        error: error.message || 'فشل في حفظ إعدادات المستخدم'
      });
    }
  });

  // المسارات الأساسية للمستخدمين
  app.get('/api/users', isAdmin, async (req, res) => {
    try {
      console.log('Fetching all users...');
      const users = await storage.getAllUsers();
      // إزالة كلمات المرور من الاستجابة لأسباب أمنية وإضافة preferredLanguage وpreferredTheme
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        isAdmin: user.isAdmin,
        preferredLanguage: user.preferredLanguage || 'en',
        preferredTheme: user.preferredTheme || 'system',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'فشل في جلب قائمة المستخدمين' });
    }
  });

  // إضافة مستخدم جديد - للمشرفين فقط
  app.post('/api/users', isAdmin, async (req, res) => {
    try {
      // إضافة whitelist validation للغة المفضلة
      const supportedLanguages = ['en', 'ar', 'hi'];
      const preferredLanguage = req.body.preferredLanguage && supportedLanguages.includes(req.body.preferredLanguage)
        ? req.body.preferredLanguage : 'en';

      const validatedUser = insertUserSchema.parse({
        ...req.body,
        preferredLanguage
      });

      const newUser = await storage.createUser({
        ...validatedUser,
        // التأكد من صحة البيانات
        username: validatedUser.username.trim(),
        email: validatedUser.email.trim().toLowerCase(),
        preferredLanguage
      });

      // إزالة كلمة المرور من الاستجابة لأسباب أمنية
      const { password, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error: any) {
      console.error('Error creating user:', error);

      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل' });
      }

      res.status(400).json({ error: error.message || 'فشل في إنشاء المستخدم' });
    }
  });

  // تحديث معلومات مستخدم - للمشرفين فقط
  app.put('/api/users/:id', isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'معرف المستخدم غير صالح' });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      const result = await storage.updateUser(userId, req.body);
      // إزالة كلمة المرور من الاستجابة لأسباب أمنية
      const { password, ...safeResult } = result;
      res.json(safeResult);
    } catch (error: any) {
      console.error('Error updating user:', error);
      res.status(400).json({ error: error.message || 'فشل في تحديث المستخدم' });
    }
  });

  // تحديث معلومات مستخدم - طريقة PATCH (للدعم مع معظم متصفحات الإنترنت)
  app.patch('/api/users/:id', isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'معرف المستخدم غير صالح' });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // إذا كان هناك كلمة مرور في الطلب، قم بتشفيرها قبل التحديث
      const requestData = {...req.body};

      if (requestData.password) {
        try {
          // استيراد وظيفة تشفير كلمة المرور
          // استخدام وظيفة تشفير كلمة المرور من ملف auth.ts
          const { hashPassword: hashPasswordInline } = await import('./auth');

          // تشفير كلمة المرور
          requestData.password = await hashPasswordInline(requestData.password);
          console.log('Password hashed successfully for update');
        } catch (err) {
          console.error('Error hashing password:', err);
          return res.status(500).json({ error: 'حدث خطأ أثناء تشفير كلمة المرور' });
        }
      }

      // استخدام SQL مباشر لتحديث كلمة المرور إذا كانت موجودة
      if (requestData.password) {
        return new Promise((resolve, reject) => {
          const sqliteDb = storage.getDatabase();
          const now = new Date().toISOString();
          sqliteDb.run(
            'UPDATE users SET password = ?, updated_at = ? WHERE id = ?',
            [requestData.password, now, userId],
            (err: Error | null, result: any) => {
              if (err) {
                console.error('Error updating password:', err);
                res.status(500).json({ error: 'حدث خطأ أثناء تحديث كلمة المرور' });
              } else {
                // يجب الحصول على عدد الصفوف المتأثرة
                const db = storage.getDatabase();
                db.get('SELECT changes() as changes', [], (err: Error | null, row: { changes?: number }) => {
                  if (err) {
                    console.error('Error getting changes count:', err);
                    res.status(500).json({ error: 'حدث خطأ أثناء تحديث كلمة المرور' });
                  } else if (row && row.changes && row.changes > 0) {
                    console.log(`Password updated directly for user ID ${userId}`);
                    res.json({
                      success: true,
                      message: 'تم تحديث المستخدم بنجاح',
                      id: userId
                    });
                  } else {
                    res.status(500).json({ error: 'لم يتم تحديث كلمة المرور' });
                  }
                });
              }
            }
          );
        });
      } else {
        // تحديث باقي بيانات المستخدم إذا لم تكن هناك كلمة مرور
        const result = await storage.updateUser(userId, requestData);
        // إزالة كلمة المرور من الاستجابة لأسباب أمنية
        const { password, ...safeResult } = result;
        res.json(safeResult);
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      res.status(400).json({ error: error.message || 'فشل في تحديث المستخدم' });
    }
  });

  // إعادة تعيين كلمة مرور المسؤول
  app.post('/api/admin/reset-password', isAdmin, async (req, res) => {
    try {
      const { password } = req.body;

      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'كلمة المرور يجب أن تكون أطول من 6 أحرف' });
      }

      // استيراد وظيفة تشفير كلمة المرور
      const auth = await import('./auth');

      // تشفير كلمة المرور
      const hashedPassword = await auth.hashPassword(password);

      // تحديث كلمة المرور مباشرة في قاعدة البيانات
      const sqliteDb = storage.getDatabase();
      const now = new Date().toISOString();

      return new Promise((resolve, reject) => {
        sqliteDb.run(
          'UPDATE users SET password = ?, updated_at = ? WHERE username = ?',
          [hashedPassword, now, 'admin'],
          (err: Error | null, result: any) => {
            if (err) {
              console.error('Error resetting admin password:', err);
              res.status(500).json({ error: 'حدث خطأ أثناء إعادة تعيين كلمة المرور' });
            } else {
              // يجب الحصول على عدد الصفوف المتأثرة
              const db = storage.getDatabase();
              db.get('SELECT changes() as changes', [], (err: Error | null, row: { changes?: number }) => {
                if (err) {
                  console.error('Error getting changes count:', err);
                  res.status(500).json({ error: 'حدث خطأ أثناء تحديث كلمة المرور' });
                } else if (row && row.changes && row.changes > 0) {
                  console.log('Admin password has been reset');
                  res.json({
                    success: true,
                    message: 'تم إعادة تعيين كلمة مرور المسؤول بنجاح'
                  });
                } else {
                  res.status(500).json({ error: 'لم يتم إعادة تعيين كلمة المرور' });
                }
              });
            }
          }
        );
      });
    } catch (error: any) {
      console.error('Error in admin password reset:', error);
      res.status(500).json({ error: error.message || 'حدث خطأ غير متوقع' });
    }
  });

  // حذف مستخدم - للمشرفين فقط
  app.delete('/api/users/:id', isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'معرف المستخدم غير صالح' });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // لا يمكن حذف المشرف الرئيسي (المستخدم رقم 1)
      if (userId === 1) {
        return res.status(403).json({ error: 'لا يمكن حذف المشرف الرئيسي' });
      }

      await storage.deleteUser(userId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: error.message || 'فشل في حذف المستخدم' });
    }
  });

  // مسار للتحقق من حالة الخادم
  app.get('/api/status', (_, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  // مسار حالة السوق - يعطي معلومات عن ساعات التداول
  app.get('/api/market-status', (req, res) => {
    const { market, timezone } = req.query;

    try {
      const currentTime = new Date();
      const currentHour = currentTime.getHours();

      // منطق بسيط لتحديد حالة السوق (يمكن تطويره لاحقاً)
      let isOpen = false;
      let nextOpenTime = null;
      let nextCloseTime = null;

      if (market === 'forex') {
        // سوق الفوركس مفتوح 24/5 (من الاثنين إلى الجمعة)
        const dayOfWeek = currentTime.getDay();
        isOpen = dayOfWeek >= 1 && dayOfWeek <= 5; // الاثنين = 1, الجمعة = 5
      } else if (market === 'crypto') {
        // العملات المشفرة مفتوحة 24/7
        isOpen = true;
      } else {
        // الأسهم عادة مفتوحة من 9 صباحاً إلى 4 مساءً
        isOpen = currentHour >= 9 && currentHour < 16;
      }

      res.json({
        market: market || 'unknown',
        isOpen,
        currentTime: currentTime.toISOString(),
        timezone: timezone || 'UTC',
        nextOpenTime,
        nextCloseTime
      });
    } catch (error) {
      console.error('Error in market status:', error);
      res.status(500).json({ error: 'Failed to get market status' });
    }
  });

  // مسار تقارير الأخطاء
  app.post('/api/errors', (req, res) => {
    try {
      const { type, message, filename, line, column, stack, userAgent, timestamp } = req.body;

      // طباعة الخطأ في السجلات (يمكن حفظه في قاعدة البيانات لاحقاً)
      console.error('Frontend Error Report:', {
        type,
        message,
        filename,
        line,
        column,
        stack,
        userAgent,
        timestamp,
        ip: req.ip,
        url: req.get('Referer')
      });

      res.json({ success: true, message: 'Error reported successfully' });
    } catch (error) {
      console.error('Error processing error report:', error);
      res.status(500).json({ error: 'Failed to process error report' });
    }
  });

  app.use('/api', marketStatusRoutes);
  app.use('/api/deployment', deploymentRouter);
  app.use('/api/heatmap', heatmapRouter);
  app.use('/api', priceRouter);
  app.use('/api/test', testRouter);
  app.use('/api', testCountdownRoutes);
  app.use('/api/proxy', proxyRouter);
  app.use('/api/update', updateRouter);
  app.use('/api/config-keys', apiKeysRouter);

  return httpServer;
}