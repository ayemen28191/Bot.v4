import * as express from "express";
import { storage } from "../storage";
import { insertDeploymentServerSchema } from "@shared/schema";
import { DeploymentService } from "../services/deployment-service";
import { z } from "zod";
import { validateRequest } from "../middleware/validate-request";
import * as SessionData from "express-session";

// إضافة تعريف لجلسة المستخدم
declare module "express-session" {
  interface SessionData {
    user?: {
      id: number;
      username: string;
      isAdmin: boolean;
    };
  }
}

export const deploymentRouter = express.Router();

// التحقق من المصادقة وصلاحيات المشرف
function isAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.session || !req.session.user || !req.session.user.id) {
    return res.status(401).json({ success: false, message: "غير مصرح به" });
  }

  storage.getUser(req.session.user.id).then((user) => {
    if (!user || !user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "غير مسموح: هذه العملية تتطلب صلاحيات المشرف" 
      });
    }
    next();
  }).catch((error: any) => {
    console.error("Error in isAdmin middleware:", error);
    res.status(500).json({ success: false, message: "خطأ في التحقق من الصلاحيات" });
  });
}

// جلب جميع الخوادم
deploymentRouter.get("/servers", isAdmin, async (req, res) => {
  try {
    const servers = await storage.getAllServers();
    // حماية البيانات الحساسة
    const sanitizedServers = servers.map(server => ({
      ...server,
      // استبدال كلمة السر والمفتاح الخاص بقيمة تدل على وجودهما
      password: server.password ? "[محمي]" : null,
      privateKey: server.privateKey ? "[محمي]" : null,
    }));
    res.json(sanitizedServers);
  } catch (error) {
    console.error("Error fetching servers:", error);
    res.status(500).json({ error: "خطأ في جلب بيانات الخوادم" });
  }
});

// إضافة خادم جديد
deploymentRouter.post("/servers", isAdmin, 
  validateRequest({
    body: insertDeploymentServerSchema
  }),
  async (req, res) => {
    try {
      const server = await storage.createServer(req.body);
      // حماية البيانات الحساسة في الاستجابة
      const sanitizedServer = {
        ...server,
        password: server.password ? "[محمي]" : null,
        privateKey: server.privateKey ? "[محمي]" : null,
      };
      
      res.status(201).json({ success: true, server: sanitizedServer });
    } catch (error) {
      console.error("Error creating server:", error);
      res.status(500).json({ success: false, message: "خطأ في إنشاء الخادم" });
    }
  }
);

// تحديث خادم موجود
deploymentRouter.put("/servers/:id", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "معرف الخادم غير صالح" });
    }

    // التحقق من وجود الخادم
    const existingServer = await storage.getServer(id);
    if (!existingServer) {
      return res.status(404).json({ success: false, message: "الخادم غير موجود" });
    }

    // التحقق من صحة البيانات
    const updateSchema = insertDeploymentServerSchema.partial();
    const validationResult = updateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: "بيانات غير صالحة", 
        errors: validationResult.error.errors 
      });
    }

    // معالجة الكلمات السرية
    // إذا كان الحقل فارغاً، استخدم القيمة السابقة
    const updateData = { ...validationResult.data };
    if (updateData.authType === 'password' && (!updateData.password || updateData.password === '')) {
      updateData.password = existingServer.password;
    }
    if (updateData.authType === 'key' && (!updateData.privateKey || updateData.privateKey === '')) {
      updateData.privateKey = existingServer.privateKey;
    }

    // تحديث الخادم
    const updatedServer = await storage.updateServer(id, updateData);
    
    // حماية البيانات الحساسة
    const sanitizedServer = {
      ...updatedServer,
      password: updatedServer.password ? "[محمي]" : null,
      privateKey: updatedServer.privateKey ? "[محمي]" : null,
    };

    res.json({ success: true, server: sanitizedServer });
  } catch (error) {
    console.error("Error updating server:", error);
    res.status(500).json({ success: false, message: "خطأ في تحديث الخادم" });
  }
});

// حذف خادم
deploymentRouter.delete("/servers/:id", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "معرف الخادم غير صالح" });
    }

    // التحقق من وجود الخادم
    const existingServer = await storage.getServer(id);
    if (!existingServer) {
      return res.status(404).json({ success: false, message: "الخادم غير موجود" });
    }

    await storage.deleteServer(id);
    res.json({ success: true, message: "تم حذف الخادم بنجاح" });
  } catch (error) {
    console.error("Error deleting server:", error);
    res.status(500).json({ success: false, message: "خطأ في حذف الخادم" });
  }
});

// اختبار الاتصال بالخادم
deploymentRouter.post("/test-connection/:id", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "معرف الخادم غير صالح" });
    }

    // جلب معلومات الخادم
    const server = await storage.getServer(id);
    if (!server) {
      return res.status(404).json({ success: false, message: "الخادم غير موجود" });
    }

    console.log("Testing connection to server:", server.name);

    // اختبار الاتصال
    const result = await DeploymentService.testConnection(server);
    console.log("Connection test result:", result);
    res.json(result);
  } catch (error: any) {
    console.error("Error testing connection:", error);
    res.status(500).json({ 
      success: false, 
      message: `خطأ في اختبار الاتصال: ${error.message || 'حدث خطأ غير معروف'}` 
    });
  }
});

// نشر التطبيق إلى خادم محدد
deploymentRouter.post("/deploy/:id", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "معرف الخادم غير صالح" });
    }

    // جلب معلومات الخادم
    const server = await storage.getServer(id);
    if (!server) {
      return res.status(404).json({ success: false, message: "الخادم غير موجود" });
    }

    // التحقق من حالة الخادم
    if (!server.isActive) {
      return res.status(400).json({ success: false, message: "الخادم غير نشط" });
    }

    console.log("Starting deployment to server:", server.name, "by user:", req.session.user?.id);

    // بدء عملية النشر
    const result = await DeploymentService.deployToServer({
      server,
      userId: req.session.user?.id,
      // يمكن تمرير خيارات إضافية من الواجهة
      ...req.body,
    });

    console.log("Deployment result:", result.success ? "Success" : "Failed", result.message);
    res.json(result);
  } catch (error: any) {
    console.error("Error deploying to server:", error);
    res.status(500).json({ 
      success: false, 
      message: `خطأ في عملية النشر: ${error.message || 'حدث خطأ غير معروف'}` 
    });
  }
});

// جلب سجلات النشر
deploymentRouter.get("/logs", isAdmin, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const logs = await storage.getAllLogs(limit);
    res.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: "خطأ في جلب سجلات النشر" });
  }
});

// جلب سجلات النشر لخادم محدد
deploymentRouter.get("/servers/:id/logs", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "معرف الخادم غير صالح" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const logs = await storage.getLogsByServer(id, limit);
    res.json(logs);
  } catch (error) {
    console.error("Error fetching server logs:", error);
    res.status(500).json({ error: "خطأ في جلب سجلات النشر للخادم" });
  }
});