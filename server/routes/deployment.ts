import * as express from "express";
import { Request, Response } from "express";
import { storage } from "../storage";
import { insertDeploymentServerSchema } from "@shared/schema";
import { DeploymentService } from "../services/deployment-service";
import { validateRequest } from "../middleware/validate-request";
import { requireAdminSecure, getCurrentUser } from "../middleware/auth-middleware";
import * as SessionData from "express-session";
import { catchAsync } from "../middleware/global-error-handler";
import { 
  createValidationError, 
  createError,
  ErrorCategory,
  ERROR_CODES, 
  ERROR_MESSAGES 
} from '@shared/error-types';

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


// جلب جميع الخوادم
deploymentRouter.get("/servers", requireAdminSecure, catchAsync(async (req: Request, res: Response) => {
  const servers = await storage.getAllServers();
  // حماية البيانات الحساسة
  const sanitizedServers = servers.map(server => ({
    ...server,
    // استبدال كلمة السر والمفتاح الخاص بقيمة تدل على وجودهما
    password: server.password ? "[محمي]" : null,
    privateKey: server.privateKey ? "[محمي]" : null,
  }));
  res.json(sanitizedServers);
}));

// إضافة خادم جديد
deploymentRouter.post("/servers", requireAdminSecure, 
  validateRequest({
    body: insertDeploymentServerSchema
  }),
  catchAsync(async (req: Request, res: Response) => {
    const server = await storage.createServer(req.body);
    // حماية البيانات الحساسة في الاستجابة
    const sanitizedServer = {
      ...server,
      password: server.password ? "[محمي]" : null,
      privateKey: server.privateKey ? "[محمي]" : null,
    };
    
    res.status(201).json({ success: true, server: sanitizedServer });
  })
);

// تحديث خادم موجود
deploymentRouter.put("/servers/:id", requireAdminSecure, catchAsync(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createValidationError(
      ERROR_CODES.VALIDATION_FORMAT,
      "معرف الخادم غير صالح",
      "id",
      req.params.id
    );
  }

  // التحقق من وجود الخادم
  const existingServer = await storage.getServer(id);
  if (!existingServer) {
    throw createError(
      ErrorCategory.AUTHORIZATION,
      ERROR_CODES.AUTHZ_RESOURCE_NOT_FOUND,
      "الخادم غير موجود",
      { details: { serverId: id }, userFriendly: true }
    );
  }

  // التحقق من صحة البيانات
  const updateSchema = insertDeploymentServerSchema.partial();
  const validationResult = updateSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw createValidationError(
      ERROR_CODES.VALIDATION_FORMAT,
      "بيانات غير صالحة",
      "body",
      validationResult.error.errors
    );
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
}));

// حذف خادم
deploymentRouter.delete("/servers/:id", requireAdminSecure, catchAsync(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createValidationError(
      ERROR_CODES.VALIDATION_FORMAT,
      "معرف الخادم غير صالح",
      "id",
      req.params.id
    );
  }

  // التحقق من وجود الخادم
  const existingServer = await storage.getServer(id);
  if (!existingServer) {
    throw createError(
      ErrorCategory.AUTHORIZATION,
      ERROR_CODES.AUTHZ_RESOURCE_NOT_FOUND,
      "الخادم غير موجود",
      { details: { serverId: id }, userFriendly: true }
    );
  }

  await storage.deleteServer(id);
  res.json({ success: true, message: "تم حذف الخادم بنجاح" });
}));

// اختبار الاتصال بالخادم
deploymentRouter.post("/test-connection/:id", requireAdminSecure, catchAsync(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createValidationError(
      ERROR_CODES.VALIDATION_FORMAT,
      "معرف الخادم غير صالح",
      "id",
      req.params.id
    );
  }

  // جلب معلومات الخادم
  const server = await storage.getServer(id);
  if (!server) {
    throw createError(
      ErrorCategory.AUTHORIZATION,
      ERROR_CODES.AUTHZ_RESOURCE_NOT_FOUND,
      "الخادم غير موجود",
      { details: { serverId: id }, userFriendly: true }
    );
  }

  console.log("Testing connection to server:", server.name);

  // اختبار الاتصال
  const result = await DeploymentService.testConnection(server);
  console.log("Connection test result:", result);
  res.json(result);
}));

// نشر التطبيق إلى خادم محدد
deploymentRouter.post("/deploy/:id", requireAdminSecure, catchAsync(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createValidationError(
      ERROR_CODES.VALIDATION_FORMAT,
      "معرف الخادم غير صالح",
      "id",
      req.params.id
    );
  }

  // جلب معلومات الخادم
  const server = await storage.getServer(id);
  if (!server) {
    throw createError(
      ErrorCategory.AUTHORIZATION,
      ERROR_CODES.AUTHZ_RESOURCE_NOT_FOUND,
      "الخادم غير موجود",
      { details: { serverId: id }, userFriendly: true }
    );
  }

  // التحقق من حالة الخادم
  if (!server.isActive) {
    throw createValidationError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      "الخادم غير نشط",
      "isActive",
      server.isActive
    );
  }

  const currentUser = getCurrentUser(req);
  console.log("Starting deployment to server:", server.name, "by user:", currentUser?.id);

  // بدء عملية النشر
  const result = await DeploymentService.deployToServer({
    server,
    userId: currentUser?.id,
    // يمكن تمرير خيارات إضافية من الواجهة
    ...req.body,
  });

  console.log("Deployment result:", result.success ? "Success" : "Failed", result.message);
  res.json(result);
}));

// جلب سجلات النشر
deploymentRouter.get("/logs", requireAdminSecure, catchAsync(async (req: Request, res: Response) => {
  let limit = 50; // القيمة الافتراضية
  
  if (req.query.limit) {
    const parsedLimit = parseInt(req.query.limit as string, 10);
    if (isNaN(parsedLimit)) {
      throw createValidationError(
        ERROR_CODES.VALIDATION_FORMAT,
        "قيمة limit غير صالحة - يجب أن تكون رقماً",
        "limit",
        req.query.limit
      );
    }
    if (parsedLimit < 1 || parsedLimit > 1000) {
      throw createValidationError(
        ERROR_CODES.VALIDATION_RANGE,
        "قيمة limit يجب أن تكون بين 1 و 1000",
        "limit",
        parsedLimit
      );
    }
    limit = parsedLimit;
  }
  
  const logs = await storage.getAllLogs(limit);
  res.json(logs);
}));

// جلب سجلات النشر لخادم محدد
deploymentRouter.get("/servers/:id/logs", requireAdminSecure, catchAsync(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createValidationError(
      ERROR_CODES.VALIDATION_FORMAT,
      "معرف الخادم غير صالح",
      "id",
      req.params.id
    );
  }

  let limit = 50; // القيمة الافتراضية
  
  if (req.query.limit) {
    const parsedLimit = parseInt(req.query.limit as string, 10);
    if (isNaN(parsedLimit)) {
      throw createValidationError(
        ERROR_CODES.VALIDATION_FORMAT,
        "قيمة limit غير صالحة - يجب أن تكون رقماً",
        "limit",
        req.query.limit
      );
    }
    if (parsedLimit < 1 || parsedLimit > 1000) {
      throw createValidationError(
        ERROR_CODES.VALIDATION_RANGE,
        "قيمة limit يجب أن تكون بين 1 و 1000",
        "limit",
        parsedLimit
      );
    }
    limit = parsedLimit;
  }
  
  const logs = await storage.getLogsByServer(id, limit);
  res.json(logs);
}));

// حذف جميع سجلات النشر
deploymentRouter.delete("/logs", requireAdminSecure, catchAsync(async (req: Request, res: Response) => {
  await storage.clearAllLogs();
  res.json({ success: true, message: "تم حذف جميع سجلات النشر بنجاح" });
}));