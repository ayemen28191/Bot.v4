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

// جدول لتخزين مفاتيح API وإعدادات التكوين مع دعم التناوب الذكي
export const configKeys = sqliteTable("config_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(), // اسم المفتاح (مثل MARKET_API_KEY)
  value: text("value").notNull(), // قيمة المفتاح
  provider: text("provider"), // مزود الخدمة (twelvedata, alphavantage, binance)
  description: text("description"), // وصف الغرض من المفتاح
  isSecret: integer("is_secret", { mode: "boolean" }).default(true), // ما إذا كان المفتاح سرياً أم لا
  lastUsedAt: text("last_used_at"), // آخر مرة تم استخدام المفتاح
  failedUntil: text("failed_until"), // المفتاح فاشل حتى هذا التاريخ
  usageToday: integer("usage_today").default(0), // عدد استخدامات اليوم
  dailyQuota: integer("daily_quota"), // الحد الأقصى اليومي للاستخدام
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

// جدول لتخزين السجلات (للمراقبة والتحليل)
export const systemLogs = sqliteTable("system_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timestamp: text("timestamp").notNull().default(new Date().toISOString()),
  level: text("level").notNull(), // error | warn | info | debug
  source: text("source").notNull(), // مصدر السجل (api, auth, deployment, etc.)
  message: text("message").notNull(),
  meta: text("meta"), // JSON string for additional data
  userId: integer("user_id"), // المستخدم المتعلق بالسجل (اختياري)
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// جدول لإعدادات الإشعارات
export const notificationSettings = sqliteTable("notification_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // telegram | slack | webhook
  name: text("name").notNull(), // اسم التكوين
  isEnabled: integer("is_enabled", { mode: "boolean" }).default(true),
  webhookUrl: text("webhook_url"), // URL للـ webhook أو bot token
  chatId: text("chat_id"), // معرف المحادثة لـ Telegram
  alertLevels: text("alert_levels").notNull().default("error,warn"), // مستويات التنبيه
  threshold: integer("threshold").default(1), // عدد الأخطاء قبل الإشعار
  cooldownMinutes: integer("cooldown_minutes").default(5), // فترة الانتظار بين الإشعارات
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  email: true,
  isAdmin: true,
  preferredLanguage: true,
  preferredTheme: true,
});

export const insertConfigKeySchema = createInsertSchema(configKeys).pick({
  key: true,
  value: true,
  provider: true,
  description: true,
  isSecret: true,
  dailyQuota: true,
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

// سكيما لإنشاء سجل نظام جديد
export const insertSystemLogSchema = createInsertSchema(systemLogs).pick({
  level: true,
  source: true,
  message: true,
  meta: true,
  userId: true,
});

// سكيما لإعدادات الإشعارات
export const insertNotificationSettingSchema = createInsertSchema(notificationSettings).pick({
  type: true,
  name: true,
  isEnabled: true,
  webhookUrl: true,
  chatId: true,
  alertLevels: true,
  threshold: true,
  cooldownMinutes: true,
});

export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type SystemLog = typeof systemLogs.$inferSelect;

export type InsertNotificationSetting = z.infer<typeof insertNotificationSettingSchema>;
export type NotificationSetting = typeof notificationSettings.$inferSelect;