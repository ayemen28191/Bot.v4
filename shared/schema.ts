import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  isAdmin: integer("is_admin", { mode: "boolean" }).default(false),
  preferredLanguage: text("preferred_language").notNull().default("en"),
  preferredTheme: text("preferred_theme").notNull().default("system"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

// جدول لتخزين مفاتيح API وإعدادات التكوين
export const configKeys = sqliteTable("config_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(), // اسم المفتاح (مثل MARKET_API_KEY)
  value: text("value").notNull(), // قيمة المفتاح
  description: text("description"), // وصف الغرض من المفتاح
  isSecret: integer("is_secret", { mode: "boolean" }).default(true), // ما إذا كان المفتاح سرياً أم لا
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

// جدول لإعدادات الخوادم للنشر
export const deploymentServers = sqliteTable("deployment_servers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // اسم الخادم
  host: text("host").notNull(), // مضيف الخادم (عنوان IP أو اسم المجال)
  port: integer("port").notNull().default(22), // المنفذ، بشكل افتراضي 22 (SSH)
  username: text("username").notNull(), // اسم المستخدم للاتصال
  authType: text("auth_type").notNull().default("password"), // نوع المصادقة (password / key)
  password: text("password"), // كلمة المرور (في حال كان نوع المصادقة بكلمة مرور)
  privateKey: text("private_key"), // المفتاح الخاص (في حال كان نوع المصادقة بمفتاح SSH)
  deployPath: text("deploy_path").notNull(), // مسار النشر على الخادم
  isActive: integer("is_active", { mode: "boolean" }).default(true), // حالة الخادم
  environment: text("environment").notNull().default("production"), // بيئة الخادم (production/staging/testing)
  lastDeployment: text("last_deployment"), // تاريخ آخر عملية نشر
  commands: text("commands"), // أوامر ما بعد النشر (يتم تنفيذها على الخادم بعد النشر)
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

// جدول لسجل عمليات النشر
export const deploymentLogs = sqliteTable("deployment_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serverId: integer("server_id").notNull(), // معرّف الخادم المستهدف
  status: text("status").notNull(), // حالة النشر (success/failure/in_progress)
  message: text("message"), // رسالة النشر
  details: text("details"), // تفاصيل إضافية
  startTime: text("start_time").notNull().default(new Date().toISOString()),
  endTime: text("end_time"), // وقت انتهاء النشر
  userId: integer("user_id"), // المستخدم الذي قام بالنشر
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  email: true,
  isAdmin: true,
  preferredLanguage: true,
});

export const insertConfigKeySchema = createInsertSchema(configKeys).pick({
  key: true,
  value: true,
  description: true,
  isSecret: true,
});

// سكيما لإنشاء خادم جديد
export const insertDeploymentServerSchema = createInsertSchema(deploymentServers).pick({
  name: true,
  host: true,
  port: true,
  username: true,
  authType: true,
  password: true,
  privateKey: true,
  deployPath: true,
  environment: true,
  commands: true,
  isActive: true,
  lastDeployment: true,
});

// سكيما لإنشاء سجل نشر جديد
export const insertDeploymentLogSchema = createInsertSchema(deploymentLogs).pick({
  serverId: true,
  status: true,
  message: true,
  details: true,
  endTime: true,
  userId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertConfigKey = z.infer<typeof insertConfigKeySchema>;
export type ConfigKey = typeof configKeys.$inferSelect;

export type InsertDeploymentServer = z.infer<typeof insertDeploymentServerSchema>;
export type DeploymentServer = typeof deploymentServers.$inferSelect;

export type InsertDeploymentLog = z.infer<typeof insertDeploymentLogSchema>;
export type DeploymentLog = typeof deploymentLogs.$inferSelect;