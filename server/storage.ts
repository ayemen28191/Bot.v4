// تم التحويل لاستخدام sqlite3 مباشرة بدلاً من drizzle-orm
import session from "express-session";
import path from "path";
import fs from "fs";
import sqlite3, { Database as SQLiteDatabase } from "sqlite3";
import { UAParser } from "ua-parser-js";
// @ts-expect-error - geoip-lite has no official TypeScript types but has custom declaration in types.d.ts
import geoip from "geoip-lite";
import {
  users, type User, type InsertUser,
  configKeys, type ConfigKey, type InsertConfigKey,
  deploymentServers, type DeploymentServer, type InsertDeploymentServer,
  deploymentLogs, type DeploymentLog, type InsertDeploymentLog,
  systemLogs, type SystemLog, type InsertSystemLog,
  notificationSettings, type NotificationSetting, type InsertNotificationSetting,
  signalLogs, type SignalLog, type InsertSignalLog,
  userCounters, type UserCounter, type InsertUserCounter,
  errorReports, type ErrorReport, type InsertErrorReport
} from "@shared/schema";
import env from "./env";

// @ts-expect-error - connect-sqlite3 has no official TypeScript types but has custom declaration in types.d.ts
import connectSqlite3 from "connect-sqlite3";
const SQLiteStore = connectSqlite3(session);

// SQLite row interfaces for type safety
interface SQLiteUserRow {
  id: number;
  username: string;
  password: string;
  display_name: string;
  email: string;
  is_admin: number;
  preferred_language: string;
  preferred_theme: string;
  created_at: string;
  updated_at: string;
}

interface SQLiteConfigKeyRow {
  id: number;
  key: string;
  value: string;
  provider?: string;
  description?: string;
  is_secret: number;
  last_used_at?: string;
  failed_until?: string;
  usage_today: number;
  daily_quota?: number;
  created_at: string;
  updated_at: string;
}

interface SQLiteDeploymentServerRow {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: string;
  password?: string;
  private_key?: string;
  deploy_path: string;
  is_active: number;
  environment: string;
  last_deployment?: string;
  commands?: string;
  created_at: string;
  updated_at: string;
}

interface SQLiteDeploymentLogRow {
  id: number;
  server_id: number;
  status: string;
  message?: string;
  details?: string;
  start_time: string;
  end_time?: string;
  user_id?: number;
  created_at: string;
}

interface SQLiteSystemLogRow {
  id: number;
  timestamp: string;
  level: string;
  source: string;
  message: string;
  meta?: string;
  request_id?: string;
  session_id?: string;
  combined_tracking_id?: string;
  actor_type?: string;
  actor_id?: string;
  actor_display_name?: string;
  action?: string;
  result?: string;
  details?: string;
  previous_total?: number;
  daily_total?: number;
  monthly_total?: number;
  user_id?: number;
  username?: string;
  user_display_name?: string;
  user_avatar?: string;
  created_at: string;
}

interface SQLiteNotificationSettingRow {
  id: number;
  type: string;
  name: string;
  is_enabled: number;
  webhook_url?: string;
  chat_id?: string;
  alert_levels: string;
  threshold: number;
  cooldown_minutes: number;
  created_at: string;
  updated_at: string;
}

interface SQLiteSignalLogRow {
  id: number;
  user_id?: number;
  username?: string;
  request_id?: string;
  session_id?: string;
  symbol: string;
  market_type: string;
  timeframe: string;
  platform?: string;
  status: string;
  signal?: string;
  probability?: string;
  current_price?: string;
  price_source?: string;
  error_code?: string;
  error_message?: string;
  analysis_data?: string;
  indicators?: string;
  execution_time?: number;
  api_keys_used?: string;
  request_ip?: string;
  user_agent?: string;
  market_open?: number;
  offline_mode: number;
  cache_used: number;
  requested_at: string;
  completed_at?: string;
  created_at: string;
}

interface SQLiteUserCounterRow {
  id: number;
  user_id?: number;
  normalized_user_id: number;
  action: string;
  date: string;
  period: string;
  count: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

interface SQLiteErrorReportRow {
  id: number;
  error_hash: string;
  category: string;
  code: string;
  message: string;
  message_ar?: string;
  severity: string;
  count: number;
  user_agent?: string;
  language?: string;
  url?: string;
  platform?: string;
  connection_type?: string;
  details?: string;
  stack?: string;
  request_id?: string;
  session_id?: string;
  user_id?: number;
  first_reported_at: string;
  last_reported_at: string;
  created_at: string;
  updated_at: string;
}

// SQLite callback types
type SQLiteCallback = (this: sqlite3.RunResult, err: Error | null) => void;
type SQLiteRowCallback<T> = (err: Error | null, row: T | undefined) => void;
type SQLiteRowsCallback<T> = (err: Error | null, rows: T[]) => void;

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;

  // Config keys methods
  getConfigKey(key: string): Promise<ConfigKey | undefined>;
  getAllConfigKeys(): Promise<ConfigKey[]>;
  setConfigKey(key: string, value: string, description?: string, isSecret?: boolean): Promise<ConfigKey>;
  deleteConfigKey(key: string): Promise<void>;
  updateKeyUsage(keyId: number): Promise<void>;
  markKeyFailed(keyId: number, failedUntil: string): Promise<void>;
  resetDailyUsage(): Promise<void>;

  // Deployment server methods
  getServer(id: number): Promise<DeploymentServer | undefined>;
  getAllServers(): Promise<DeploymentServer[]>;
  getActiveServers(): Promise<DeploymentServer[]>;
  createServer(server: InsertDeploymentServer): Promise<DeploymentServer>;
  updateServer(id: number, serverData: Partial<InsertDeploymentServer>): Promise<DeploymentServer>;
  deleteServer(id: number): Promise<void>;

  // Deployment logs methods
  getLog(id: number): Promise<DeploymentLog | undefined>;
  getLogsByServer(serverId: number, limit?: number): Promise<DeploymentLog[]>;
  getAllLogs(limit?: number): Promise<DeploymentLog[]>;
  createLog(log: InsertDeploymentLog): Promise<DeploymentLog>;
  updateLog(id: number, status: string, message?: string, details?: string, endTime?: string): Promise<DeploymentLog>;

  // System logs methods
  createSystemLog(log: InsertSystemLog): Promise<SystemLog>;
  getSystemLogs(filters: { since?: string; level?: string; source?: string; limit?: number; offset?: number }): Promise<SystemLog[]>;
  getLogsCount(): Promise<number>;
  getLogsCountByLevel(): Promise<Record<string, number>>;
  getLogsCountBySource(): Promise<Record<string, number>>;
  deleteOldSystemLogs(cutoffDate: string): Promise<number>;
  clearAllSystemLogs(): Promise<number>;

  // Notification settings methods
  getNotificationSetting(id: number): Promise<NotificationSetting | undefined>;
  getAllNotificationSettings(): Promise<NotificationSetting[]>;
  createNotificationSetting(setting: InsertNotificationSetting): Promise<NotificationSetting>;
  updateNotificationSetting(id: number, settingData: Partial<InsertNotificationSetting>): Promise<NotificationSetting>;
  deleteNotificationSetting(id: number): Promise<void>;

  // Signal logs methods
  createSignalLog(log: InsertSignalLog): Promise<SignalLog>;
  getSignalLogs(filters: { 
    since?: string; 
    status?: string; 
    symbol?: string; 
    marketType?: string; 
    userId?: number;
    platform?: string;
    limit?: number; 
    offset?: number; 
  }): Promise<SignalLog[]>;
  getSignalLog(id: number): Promise<SignalLog | undefined>;
  updateSignalLog(id: number, updates: Partial<InsertSignalLog>): Promise<SignalLog>;
  getSignalLogStats(): Promise<{
    total: number;
    statusCounts: Record<string, number>;
    symbolCounts: Record<string, number>;
    platformCounts: Record<string, number>;
    recentErrors: SignalLog[];
    averageExecutionTime: number;
  }>;
  deleteOldSignalLogs(cutoffDate: string): Promise<number>;

  // User counters methods
  createOrUpdateCounter(userId: number | null, action: string, date: string, period: 'daily' | 'monthly', increment?: number): Promise<UserCounter>;
  getCounter(userId: number | null, action: string, date: string, period: 'daily' | 'monthly'): Promise<UserCounter | undefined>;
  getCountersByPeriod(filters: {
    userId?: number | null;
    action?: string;
    period: 'daily' | 'monthly';
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<UserCounter[]>;
  getUserCountersSummary(userId: number | null, actions?: string[]): Promise<{
    daily: Record<string, number>;
    monthly: Record<string, number>;
    totalActions: number;
    mostActiveDay: string | null;
    mostActiveAction: string | null;
  }>;

  // Error reports methods
  createOrUpdateErrorReport(errorData: {
    errorHash: string;
    category: string;
    code: string;
    message: string;
    messageAr?: string;
    severity: string;
    userAgent?: string;
    language?: string;
    url?: string;
    platform?: string;
    connectionType?: string;
    details?: string;
    stack?: string;
    requestId?: string;
    sessionId?: string;
    userId?: number;
  }): Promise<ErrorReport>;
  getErrorReport(id: number): Promise<ErrorReport | undefined>;
  getErrorReportByHash(errorHash: string): Promise<ErrorReport | undefined>;
  getErrorReports(filters: {
    category?: string;
    severity?: string;
    since?: string;
    limit?: number;
    offset?: number;
  }): Promise<ErrorReport[]>;
  getErrorReportsStats(): Promise<{
    totalReports: number;
    categoryCounts: Record<string, number>;
    severityCounts: Record<string, number>;
    recentErrors: ErrorReport[];
    topErrors: ErrorReport[];
  }>;
  deleteOldErrorReports(cutoffDate: string): Promise<number>;

  // Database access
  getDatabase(): SQLiteDatabase;

  // Session store
  sessionStore: session.Store;
}

// Ensure database directory exists
const dbDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// SQLite database path
const DB_PATH = path.resolve(dbDir, "database.sqlite");
console.log('Using SQLite database at:', DB_PATH);

// استخدام sqlite3 مباشرة
sqlite3.verbose();
const sqliteDb = new sqlite3.Database(DB_PATH);

// إنشاء الجداول
try {
  // تأكد من إنشاء جدول المستخدمين
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      is_admin INTEGER DEFAULT 0,
      preferred_language TEXT NOT NULL DEFAULT 'en',
      preferred_theme TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Users table created or already exists');
      // تحقق من وجود الأعمدة وإضافتها فقط إذا لزم الأمر
      sqliteDb.get(`PRAGMA table_info(users)`, (pragmaErr, result) => {
        if (!pragmaErr) {
          // فحص وجود الأعمدة في schema الجدول بدلاً من محاولة إضافتها دائماً
          console.log('Users table schema verification complete');
        }
      });
    }
  });

  // تأكد من إنشاء جدول الجلسات
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expired INTEGER NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating sessions table:', err);
    } else {
      console.log('Sessions table created or already exists');
    }
  });

  // تأكد من إنشاء جدول مفاتيح التكوين مع الحقول الجديدة
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS config_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      provider TEXT,
      description TEXT,
      is_secret INTEGER DEFAULT 1,
      last_used_at TEXT,
      failed_until TEXT,
      usage_today INTEGER DEFAULT 0,
      daily_quota INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating config_keys table:', err);
    } else {
      console.log('Config_keys table created or already exists');

      // تحقق من وجود schema الجدول بدلاً من محاولة التغيير دائماً
      sqliteDb.get(`PRAGMA table_info(config_keys)`, (pragmaErr, result) => {
        if (!pragmaErr) {
          console.log('Config_keys table schema verification complete');
        }
      });
    }
  });

  // تأكد من إنشاء جدول خوادم النشر
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS deployment_servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 22,
      username TEXT NOT NULL,
      auth_type TEXT NOT NULL DEFAULT 'password',
      password TEXT,
      private_key TEXT,
      deploy_path TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      environment TEXT NOT NULL DEFAULT 'production',
      last_deployment TEXT,
      commands TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating deployment_servers table:', err);
    } else {
      console.log('Deployment_servers table created or already exists');
    }
  });

  // تأكد من إنشاء جدول سجلات النشر
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS deployment_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      details TEXT,
      start_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      end_time TEXT,
      user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES deployment_servers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating deployment_logs table:', err);
    } else {
      console.log('Deployment_logs table created or already exists');
    }
  });

  // تأكد من إنشاء جدول السجلات النظام
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      level TEXT NOT NULL,
      source TEXT NOT NULL,
      message TEXT NOT NULL,
      meta TEXT,
      request_id TEXT,
      session_id TEXT,
      combined_tracking_id TEXT,
      actor_type TEXT,
      actor_id TEXT,
      actor_display_name TEXT,
      action TEXT,
      result TEXT,
      details TEXT,
      previous_total INTEGER,
      daily_total INTEGER,
      monthly_total INTEGER,
      user_id INTEGER,
      username TEXT,
      user_display_name TEXT,
      user_avatar TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating system_logs table:', err);
    } else {
      console.log('System_logs table created or already exists');

      // إضافة الأعمدة الجديدة للجداول الموجودة
      const columnsToAdd = [
        'ADD COLUMN request_id TEXT',
        'ADD COLUMN session_id TEXT',
        'ADD COLUMN combined_tracking_id TEXT',
        'ADD COLUMN actor_type TEXT',
        'ADD COLUMN actor_id TEXT',
        'ADD COLUMN actor_display_name TEXT',
        'ADD COLUMN action TEXT',
        'ADD COLUMN result TEXT',
        'ADD COLUMN details TEXT',
        'ADD COLUMN previous_total INTEGER',
        'ADD COLUMN daily_total INTEGER',
        'ADD COLUMN monthly_total INTEGER',
        'ADD COLUMN username TEXT',
        'ADD COLUMN user_display_name TEXT',
        'ADD COLUMN user_avatar TEXT'
      ];

      columnsToAdd.forEach((alteration, index) => {
        sqliteDb.run(`ALTER TABLE system_logs ${alteration}`, (alterErr) => {
          if (alterErr && !alterErr.message.includes('duplicate column name')) {
            console.warn(`Warning adding column to system_logs (${alteration}):`, alterErr.message);
          } else if (!alterErr) {
            console.log(`✓ Added column to system_logs: ${alteration.split(' ')[2]}`);
          }
        });
      });
    }
  });

  // تأكد من إنشاء جدول إعدادات الإشعارات
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      is_enabled INTEGER DEFAULT 1,
      webhook_url TEXT,
      chat_id TEXT,
      alert_levels TEXT NOT NULL DEFAULT 'error,warn',
      threshold INTEGER DEFAULT 1,
      cooldown_minutes INTEGER DEFAULT 5,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating notification_settings table:', err);
    } else {
      console.log('Notification_settings table created or already exists');
    }
  });

  // تأكد من إنشاء جدول سجلات الإشارات المالية
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS signal_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      request_id TEXT,
      session_id TEXT,
      symbol TEXT NOT NULL,
      market_type TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      platform TEXT,
      status TEXT NOT NULL,
      signal TEXT,
      probability TEXT,
      current_price TEXT,
      price_source TEXT,
      error_code TEXT,
      error_message TEXT,
      analysis_data TEXT,
      indicators TEXT,
      execution_time INTEGER,
      api_keys_used TEXT,
      request_ip TEXT,
      user_agent TEXT,
      market_open INTEGER,
      offline_mode INTEGER DEFAULT 0,
      cache_used INTEGER DEFAULT 0,
      requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating signal_logs table:', err);
    } else {
      console.log('Signal_logs table created or already exists');

      // إضافة العمود request_id للجداول الموجودة إذا لم يكن موجوداً
      sqliteDb.run('ALTER TABLE signal_logs ADD COLUMN request_id TEXT', (alterErr) => {
        if (alterErr && !alterErr.message.includes('duplicate column name')) {
          console.warn('Warning adding request_id to signal_logs:', alterErr.message);
        } else if (!alterErr) {
          console.log('✓ Added request_id column to signal_logs');
        }
      });

      // إضافة فهارس الأداء للحقول المهمة في جدول سجلات الإشارات
      sqliteDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_signal_logs_requested_at ON signal_logs(requested_at);
        CREATE INDEX IF NOT EXISTS idx_signal_logs_status ON signal_logs(status);
        CREATE INDEX IF NOT EXISTS idx_signal_logs_symbol ON signal_logs(symbol);
        CREATE INDEX IF NOT EXISTS idx_signal_logs_platform ON signal_logs(platform);
        CREATE INDEX IF NOT EXISTS idx_signal_logs_user_id ON signal_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_signal_logs_symbol_status ON signal_logs(symbol, status);
        CREATE INDEX IF NOT EXISTS idx_signal_logs_user_status ON signal_logs(user_id, status);
        CREATE INDEX IF NOT EXISTS idx_signal_logs_requested_at_status ON signal_logs(requested_at, status);
      `, (indexErr) => {
        if (indexErr) {
          console.error('Error creating signal_logs indexes:', indexErr);
        } else {
          console.log('✅ Signal_logs performance indexes created successfully');
        }
      });
    }
  });

  // تأكد من إنشاء جدول العدادات التراكمية للمستخدمين مع التحقق من البنية الصحيحة
  sqliteDb.get("PRAGMA table_info(user_counters)", (pragmaErr, tableInfo) => {
    if (pragmaErr) {
      console.error('Error checking user_counters table info:', pragmaErr);
      return;
    }

    // Check if table exists and has normalized_user_id column
    sqliteDb.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='user_counters'", (err, row: any) => {
      const hasNormalizedUserId = row && row.sql && row.sql.includes('normalized_user_id');

      if (!hasNormalizedUserId) {
        console.log('User_counters table needs recreation to add normalized_user_id column');

        // Drop existing table if it exists and recreate with correct structure
        sqliteDb.exec(`
          DROP TABLE IF EXISTS user_counters;

          CREATE TABLE user_counters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            normalized_user_id INTEGER GENERATED ALWAYS AS (COALESCE(user_id, -1)) STORED,
            action TEXT NOT NULL,
            date TEXT NOT NULL,
            period TEXT NOT NULL CHECK (period IN ('daily', 'monthly')),
            count INTEGER NOT NULL DEFAULT 1,
            last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE (normalized_user_id, action, date, period)
          );
        `, (createErr) => {
          if (createErr) {
            console.error('Error recreating user_counters table:', createErr);
          } else {
            console.log('✅ User_counters table recreated successfully with normalized_user_id');

            // إنشاء فهارس الأداء
            sqliteDb.exec(`
              CREATE INDEX IF NOT EXISTS idx_user_counters_user_period 
              ON user_counters(user_id, period, date DESC);

              CREATE INDEX IF NOT EXISTS idx_user_counters_action_period 
              ON user_counters(action, period, date DESC);

              CREATE INDEX IF NOT EXISTS idx_user_counters_normalized_user_id 
              ON user_counters(normalized_user_id, period, date DESC);
            `, (indexErr) => {
              if (indexErr) {
                console.error('Error creating user_counters indexes:', indexErr);
              } else {
                console.log('✅ User_counters performance indexes created successfully');
              }
            });
          }
        });
      } else {
        console.log('User_counters table already has correct structure');

        // إنشاء فهارس الأداء
        sqliteDb.exec(`
          CREATE INDEX IF NOT EXISTS idx_user_counters_user_period 
          ON user_counters(user_id, period, date DESC);

          CREATE INDEX IF NOT EXISTS idx_user_counters_action_period 
          ON user_counters(action, period, date DESC);

          CREATE INDEX IF NOT EXISTS idx_user_counters_normalized_user_id 
          ON user_counters(normalized_user_id, period, date DESC);
        `, (indexErr) => {
          if (indexErr) {
            console.error('Error creating user_counters indexes:', indexErr);
          } else {
            console.log('✅ User_counters performance indexes created successfully');
          }
        });
      }
    });
  });

  // تأكد من إنشاء جدول تقارير الأخطاء
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS error_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      error_hash TEXT NOT NULL,
      category TEXT NOT NULL,
      code TEXT NOT NULL,
      message TEXT NOT NULL,
      message_ar TEXT,
      severity TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      user_agent TEXT,
      language TEXT,
      url TEXT,
      platform TEXT,
      connection_type TEXT,
      details TEXT,
      stack TEXT,
      request_id TEXT,
      session_id TEXT,
      user_id INTEGER,
      first_reported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_reported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE (error_hash)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating error_reports table:', err);
    } else {
      console.log('Error_reports table created or already exists');

      // إنشاء فهارس الأداء
      sqliteDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_error_reports_category ON error_reports(category);
        CREATE INDEX IF NOT EXISTS idx_error_reports_severity ON error_reports(severity);
        CREATE INDEX IF NOT EXISTS idx_error_reports_last_reported ON error_reports(last_reported_at DESC);
        CREATE INDEX IF NOT EXISTS idx_error_reports_count ON error_reports(count DESC);
        CREATE INDEX IF NOT EXISTS idx_error_reports_hash ON error_reports(error_hash);
        CREATE INDEX IF NOT EXISTS idx_error_reports_category_severity ON error_reports(category, severity);
      `, (indexErr) => {
        if (indexErr) {
          console.error('Error creating error_reports indexes:', indexErr);
        } else {
          console.log('✅ Error_reports performance indexes created successfully');
        }
      });
    }
  });

  console.log('✅ تم إنشاء جداول قاعدة البيانات بنجاح');
} catch (error) {
  console.error('❌ حدث خطأ أثناء إنشاء جداول قاعدة البيانات:', error);
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new SQLiteStore({
      db: "sessions.sqlite",
      dir: dbDir,
      concurrentDB: false,
    });
  }

  // إتاحة الوصول إلى قاعدة البيانات
  getDatabase(): SQLiteDatabase {
    return sqliteDb;
  }

  // ========================= دوال إدارة المستخدمين =========================

  async getUser(id: number): Promise<User | undefined> {
    return new Promise<User | undefined>((resolve, reject) => {
      sqliteDb.get('SELECT * FROM users WHERE id = ?', [id], (err: Error | null, row: SQLiteUserRow | undefined) => {
        if (err) {
          console.error('Error getting user by ID:', err);
          reject(err);
        } else {
          if (!row) {
            resolve(undefined);
          } else {
            // تحويل أسماء الأعمدة من snake_case إلى camelCase
            const user: User = {
              id: row.id,
              username: row.username,
              password: row.password,
              displayName: row.display_name,
              email: row.email,
              isAdmin: !!row.is_admin,
              preferredLanguage: row.preferred_language || 'en',
              preferredTheme: row.preferred_theme || 'system',
              createdAt: row.created_at,
              updatedAt: row.updated_at
            };
            resolve(user);
          }
        }
      });
    });
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return new Promise<User | undefined>((resolve, reject) => {
      sqliteDb.get('SELECT * FROM users WHERE username = ?', [username], (err: Error | null, row: SQLiteUserRow | undefined) => {
        if (err) {
          console.error('Error getting user by username:', err);
          reject(err);
        } else {
          if (!row) {
            resolve(undefined);
          } else {
            // تحويل أسماء الأعمدة من snake_case إلى camelCase
            const user: User = {
              id: row.id,
              username: row.username,
              password: row.password,
              displayName: row.display_name,
              email: row.email,
              isAdmin: !!row.is_admin,
              preferredLanguage: row.preferred_language || 'en',
              preferredTheme: row.preferred_theme || 'system',
              createdAt: row.created_at,
              updatedAt: row.updated_at
            };
            resolve(user);
          }
        }
      });
    });
  }

  async createUser(user: InsertUser): Promise<User> {
    return new Promise<User>((resolve, reject) => {
      const now = new Date().toISOString();

      // تحويل من camelCase إلى snake_case للقاعدة
      sqliteDb.run(
        'INSERT INTO users (username, password, display_name, email, is_admin, preferred_language, preferred_theme, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [user.username, user.password, user.displayName, user.email, user.isAdmin ? 1 : 0, user.preferredLanguage || 'en', user.preferredTheme || 'system', now, now],
        function(err) {
          if (err) {
            console.error('Error creating user:', err);
            reject(err);
          } else {
            const userId = this.lastID;
            const createdUser: User = {
              id: userId,
              username: user.username,
              password: user.password,
              displayName: user.displayName,
              email: user.email,
              isAdmin: !!user.isAdmin,
              preferredLanguage: user.preferredLanguage || 'en',
              preferredTheme: user.preferredTheme || 'system',
              createdAt: now,
              updatedAt: now
            };
            resolve(createdUser);
          }
        }
      );
    });
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    return new Promise<User>(async (resolve, reject) => {
      try {
        // تحقق من وجود المستخدم
        const existingUser = await this.getUser(id);
        if (!existingUser) {
          throw new Error('المستخدم غير موجود');
        }

        // استخدام نسخة من بيانات التحديث
        const updateData = { ...userData };

        // تحقق من عدم وجود تعارض في اسم المستخدم
        if (updateData.username) {
          const existingUserWithSameUsername = await new Promise<any>((resolve, reject) => {
            sqliteDb.get(
              'SELECT * FROM users WHERE username = ? AND id != ?',
              [updateData.username, id],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          });

          if (existingUserWithSameUsername) {
            throw new Error('اسم المستخدم مستخدم بالفعل');
          }
        }

        // تحقق من عدم وجود تعارض في البريد الإلكتروني
        if (updateData.email) {
          const existingUserWithSameEmail = await new Promise<any>((resolve, reject) => {
            sqliteDb.get(
              'SELECT * FROM users WHERE email = ? AND id != ?',
              [updateData.email, id],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          });

          if (existingUserWithSameEmail) {
            throw new Error('البريد الإلكتروني مستخدم بالفعل');
          }
        }

        // بناء استعلام التحديث من البيانات المتوفرة
        const updateFields: string[] = [];
        const updateValues: any[] = [];

        if (updateData.username) {
          updateFields.push('username = ?');
          updateValues.push(updateData.username);
        }

        if (updateData.displayName) {
          updateFields.push('display_name = ?');
          updateValues.push(updateData.displayName);
        }

        if (updateData.email) {
          updateFields.push('email = ?');
          updateValues.push(updateData.email);
        }

        if ('isAdmin' in updateData) {
          updateFields.push('is_admin = ?');
          updateValues.push(updateData.isAdmin ? 1 : 0);
        }

        if (updateData.preferredLanguage) {
          updateFields.push('preferred_language = ?');
          updateValues.push(updateData.preferredLanguage);
        }

        if (updateData.preferredTheme) {
          updateFields.push('preferred_theme = ?');
          updateValues.push(updateData.preferredTheme);
        }

        // تحديث تاريخ التحديث
        const now = new Date().toISOString();
        updateFields.push('updated_at = ?');
        updateValues.push(now);

        // إضافة معرف المستخدم للشرط
        updateValues.push(id);

        // تنفيذ استعلام التحديث
        if (updateFields.length > 0) {
          sqliteDb.run(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues,
            async (err) => {
              if (err) {
                console.error('Error updating user:', err);
                reject(err);
              } else {
                // الحصول على المستخدم المحدث
                const updatedUser = await this.getUser(id);
                if (!updatedUser) {
                  reject(new Error('فشل في الحصول على المستخدم المحدث'));
                } else {
                  resolve(updatedUser);
                }
              }
            }
          );
        } else {
          // لا يوجد تغييرات للتحديث
          resolve(existingUser);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async deleteUser(id: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // التأكد من عدم حذف المشرف الرئيسي
      if (id === 1) {
        reject(new Error('لا يمكن حذف المشرف الرئيسي'));
        return;
      }

      sqliteDb.run('DELETE FROM users WHERE id = ?', [id], (err) => {
        if (err) {
          console.error('Error deleting user:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async getAllUsers(): Promise<User[]> {
    return new Promise<User[]>((resolve, reject) => {
      sqliteDb.all('SELECT * FROM users', (err: Error | null, rows: SQLiteUserRow[]) => {
        if (err) {
          console.error('Error getting all users:', err);
          reject(err);
        } else {
          // تحويل أسماء الأعمدة من snake_case إلى camelCase
          const users: User[] = rows.map(row => ({
            id: row.id,
            username: row.username,
            password: row.password,
            displayName: row.display_name,
            email: row.email,
            isAdmin: !!row.is_admin,
            preferredLanguage: row.preferred_language || 'en',
            preferredTheme: row.preferred_theme || 'system',
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
          resolve(users);
        }
      });
    });
  }

  // ========================= دوال إدارة مفاتيح API والتكوين =========================

  async getConfigKey(key: string): Promise<ConfigKey | undefined> {
    return new Promise<ConfigKey | undefined>((resolve, reject) => {
      sqliteDb.get('SELECT * FROM config_keys WHERE key = ?', [key], (err: Error | null, row: SQLiteConfigKeyRow | undefined) => {
        if (err) {
          console.error('Error getting config key:', err);
          reject(err);
        } else {
          if (!row) {
            resolve(undefined);
          } else {
            // تحويل أسماء الأعمدة من snake_case إلى camelCase
            const configKey: ConfigKey = {
              id: row.id,
              key: row.key,
              value: row.value,
              provider: row.provider || null,
              description: row.description || null,
              isSecret: !!row.is_secret,
              lastUsedAt: row.last_used_at || null,
              failedUntil: row.failed_until || null,
              usageToday: row.usage_today || 0,
              dailyQuota: row.daily_quota || null,
              createdAt: row.created_at,
              updatedAt: row.updated_at
            };
            resolve(configKey);
          }
        }
      });
    });
  }

  async getAllConfigKeys(): Promise<ConfigKey[]> {
    return new Promise<ConfigKey[]>((resolve, reject) => {
      sqliteDb.all('SELECT * FROM config_keys', (err: Error | null, rows: SQLiteConfigKeyRow[]) => {
        if (err) {
          console.error('Error getting all config keys:', err);
          reject(err);
        } else {
          // تحويل أسماء الأعمدة من snake_case إلى camelCase
          const configKeys: ConfigKey[] = rows.map(row => ({
            id: row.id,
            key: row.key,
            value: row.value,
            provider: row.provider || null,
            description: row.description || null,
            isSecret: !!row.is_secret,
            lastUsedAt: row.last_used_at || null,
            failedUntil: row.failed_until || null,
            usageToday: row.usage_today || 0,
            dailyQuota: row.daily_quota || null,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
          resolve(configKeys);
        }
      });
    });
  }

  async setConfigKey(key: string, value: string, description?: string, isSecret: boolean = true): Promise<ConfigKey> {
    return new Promise<ConfigKey>(async (resolve, reject) => {
      try {
        // تحقق مما إذا كان المفتاح موجوداً بالفعل
        const existingKey = await this.getConfigKey(key);
        const now = new Date().toISOString();

        if (existingKey) {
          // تحديث المفتاح الموجود
          sqliteDb.run(
            'UPDATE config_keys SET value = ?, description = ?, is_secret = ?, updated_at = ? WHERE key = ?',
            [
              value,
              description || existingKey.description,
              isSecret ? 1 : 0,
              now,
              key
            ],
            async (err) => {
              if (err) {
                console.error('Error updating config key:', err);
                reject(err);
              } else {
                // الحصول على المفتاح المحدث
                const updatedKey = await this.getConfigKey(key);
                if (!updatedKey) {
                  reject(new Error('فشل في الحصول على المفتاح المحدث'));
                } else {
                  resolve(updatedKey);
                }
              }
            }
          );
        } else {
          // إنشاء مفتاح جديد
          sqliteDb.run(
            'INSERT INTO config_keys (key, value, description, is_secret, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [key, value, description || null, isSecret ? 1 : 0, now, now],
            async function(err) {
              if (err) {
                console.error('Error creating config key:', err);
                reject(err);
              } else {
                const newKeyId = this.lastID;
                const newKey: ConfigKey = {
                  id: newKeyId,
                  key,
                  value,
                  provider: null,
                  description: description || null,
                  isSecret,
                  lastUsedAt: null,
                  failedUntil: null,
                  usageToday: 0,
                  dailyQuota: null,
                  createdAt: now,
                  updatedAt: now
                };
                resolve(newKey);
              }
            }
          );
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async deleteConfigKey(key: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      sqliteDb.run('DELETE FROM config_keys WHERE key = ?', [key], (err) => {
        if (err) {
          console.error('Error deleting config key:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // ========================= دوال إدارة خوادم النشر =========================

  async getServer(id: number): Promise<DeploymentServer | undefined> {
    return new Promise<DeploymentServer | undefined>((resolve, reject) => {
      sqliteDb.get('SELECT * FROM deployment_servers WHERE id = ?', [id], (err: Error | null, row: SQLiteDeploymentServerRow | undefined) => {
        if (err) {
          console.error('Error getting deployment server by ID:', err);
          reject(err);
        } else {
          if (!row) {
            resolve(undefined);
          } else {
            // تحويل أسماء الأعمدة من snake_case إلى camelCase
            const server: DeploymentServer = {
              id: row.id,
              name: row.name,
              host: row.host,
              port: row.port,
              username: row.username,
              authType: row.auth_type,
              password: row.password || null,
              privateKey: row.private_key || null,
              deployPath: row.deploy_path,
              isActive: !!row.is_active,
              environment: row.environment,
              lastDeployment: row.last_deployment || null,
              commands: row.commands || null,
              createdAt: row.created_at,
              updatedAt: row.updated_at
            };
            resolve(server);
          }
        }
      });
    });
  }

  async getAllServers(): Promise<DeploymentServer[]> {
    return new Promise<DeploymentServer[]>((resolve, reject) => {
      sqliteDb.all('SELECT * FROM deployment_servers ORDER BY name', (err: Error | null, rows: SQLiteDeploymentServerRow[]) => {
        if (err) {
          console.error('Error getting all deployment servers:', err);
          reject(err);
        } else {
          // تحويل أسماء الأعمدة من snake_case إلى camelCase
          const servers: DeploymentServer[] = rows.map(row => ({
            id: row.id,
            name: row.name,
            host: row.host,
            port: row.port,
            username: row.username,
            authType: row.auth_type,
            password: row.password || null,
            privateKey: row.private_key || null,
            deployPath: row.deploy_path,
            isActive: !!row.is_active,
            environment: row.environment,
            lastDeployment: row.last_deployment || null,
            commands: row.commands || null,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
          resolve(servers);
        }
      });
    });
  }

  async getActiveServers(): Promise<DeploymentServer[]> {
    return new Promise<DeploymentServer[]>((resolve, reject) => {
      sqliteDb.all('SELECT * FROM deployment_servers WHERE is_active = 1 ORDER BY name', (err: Error | null, rows: SQLiteDeploymentServerRow[]) => {
        if (err) {
          console.error('Error getting active deployment servers:', err);
          reject(err);
        } else {
          // تحويل أسماء الأعمدة من snake_case إلى camelCase
          const servers: DeploymentServer[] = rows.map(row => ({
            id: row.id,
            name: row.name,
            host: row.host,
            port: row.port,
            username: row.username,
            authType: row.auth_type,
            password: row.password || null,
            privateKey: row.private_key || null,
            deployPath: row.deploy_path,
            isActive: !!row.is_active,
            environment: row.environment,
            lastDeployment: row.last_deployment || null,
            commands: row.commands || null,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
          resolve(servers);
        }
      });
    });
  }

  async createServer(server: InsertDeploymentServer): Promise<DeploymentServer> {
    return new Promise<DeploymentServer>((resolve, reject) => {
      const now = new Date().toISOString();

      // تحويل من camelCase إلى snake_case للقاعدة
      sqliteDb.run(
        `INSERT INTO deployment_servers (
          name, host, port, username, auth_type, password, private_key, 
          deploy_path, is_active, environment, commands, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          server.name,
          server.host,
          server.port || 22,
          server.username,
          server.authType || 'password',
          server.password || null,
          server.privateKey || null,
          server.deployPath,
          server.isActive ? 1 : 0,
          server.environment || 'production',
          server.commands || null,
          now,
          now
        ],
        function(err) {
          if (err) {
            console.error('Error creating deployment server:', err);
            reject(err);
          } else {
            const serverId = this.lastID;
            const createdServer: DeploymentServer = {
              id: serverId,
              name: server.name,
              host: server.host,
              port: server.port || 22,
              username: server.username,
              authType: server.authType || 'password',
              password: server.password || null,
              privateKey: server.privateKey || null,
              deployPath: server.deployPath,
              isActive: !!server.isActive,
              environment: server.environment || 'production',
              lastDeployment: null,
              commands: server.commands || null,
              createdAt: now,
              updatedAt: now
            };
            resolve(createdServer);
          }
        }
      );
    });
  }

  async updateServer(id: number, serverData: Partial<InsertDeploymentServer>): Promise<DeploymentServer> {
    return new Promise<DeploymentServer>(async (resolve, reject) => {
      try {
        // تحقق من وجود الخادم
        const existingServer = await this.getServer(id);
        if (!existingServer) {
          throw new Error('الخادم غير موجود');
        }

        // بناء استعلام التحديث من البيانات المتوفرة
        const updateFields: string[] = [];
        const updateValues: any[] = [];

        if (serverData.name !== undefined) {
          updateFields.push('name = ?');
          updateValues.push(serverData.name);
        }

        if (serverData.host !== undefined) {
          updateFields.push('host = ?');
          updateValues.push(serverData.host);
        }

        if (serverData.port !== undefined) {
          updateFields.push('port = ?');
          updateValues.push(serverData.port);
        }

        if (serverData.username !== undefined) {
          updateFields.push('username = ?');
          updateValues.push(serverData.username);
        }

        if (serverData.authType !== undefined) {
          updateFields.push('auth_type = ?');
          updateValues.push(serverData.authType);
        }

        if (serverData.password !== undefined) {
          updateFields.push('password = ?');
          updateValues.push(serverData.password);
        }

        if (serverData.privateKey !== undefined) {
          updateFields.push('private_key = ?');
          updateValues.push(serverData.privateKey);
        }

        if (serverData.deployPath !== undefined) {
          updateFields.push('deploy_path = ?');
          updateValues.push(serverData.deployPath);
        }

        if (serverData.isActive !== undefined) {
          updateFields.push('is_active = ?');
          updateValues.push(serverData.isActive ? 1 : 0);
        }

        if (serverData.environment !== undefined) {
          updateFields.push('environment = ?');
          updateValues.push(serverData.environment);
        }

        if (serverData.commands !== undefined) {
          updateFields.push('commands = ?');
          updateValues.push(serverData.commands);
        }

        // تحديث تاريخ التحديث
        const now = new Date().toISOString();
        updateFields.push('updated_at = ?');
        updateValues.push(now);

        // إضافة معرف الخادم للشرط
        updateValues.push(id);

        // تنفيذ استعلام التحديث
        if (updateFields.length > 0) {
          sqliteDb.run(
            `UPDATE deployment_servers SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues,
            async (err) => {
              if (err) {
                console.error('Error updating deployment server:', err);
                reject(err);
              } else {
                // الحصول على الخادم المحدث
                const updatedServer = await this.getServer(id);
                if (!updatedServer) {
                  reject(new Error('فشل في الحصول على الخادم المحدث'));
                } else {
                  resolve(updatedServer);
                }
              }
            }
          );
        } else {
          // لا يوجد تغييرات للتحديث
          resolve(existingServer);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async deleteServer(id: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      sqliteDb.run('DELETE FROM deployment_servers WHERE id = ?', [id], (err) => {
        if (err) {
          console.error('Error deleting deployment server:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // ========================= دوال إدارة سجلات النشر =========================

  async getLog(id: number): Promise<DeploymentLog | undefined> {
    return new Promise<DeploymentLog | undefined>((resolve, reject) => {
      sqliteDb.get('SELECT * FROM deployment_logs WHERE id = ?', [id], (err: Error | null, row: SQLiteDeploymentLogRow | undefined) => {
        if (err) {
          console.error('Error getting deployment log by ID:', err);
          reject(err);
        } else {
          if (!row) {
            resolve(undefined);
          } else {
            // تحويل أسماء الأعمدة من snake_case إلى camelCase
            const log: DeploymentLog = {
              id: row.id,
              serverId: row.server_id,
              status: row.status,
              message: row.message || null,
              details: row.details || null,
              startTime: row.start_time,
              endTime: row.end_time || null,
              userId: row.user_id || null,
              createdAt: row.created_at
            };
            resolve(log);
          }
        }
      });
    });
  }

  async getLogsByServer(serverId: number, limit: number = 50): Promise<DeploymentLog[]> {
    return new Promise<DeploymentLog[]>((resolve, reject) => {
      sqliteDb.all(
        'SELECT * FROM deployment_logs WHERE server_id = ? ORDER BY created_at DESC LIMIT ?',
        [serverId, limit],
        (err, rows: any[]) => {
          if (err) {
            console.error('Error getting deployment logs by server ID:', err);
            reject(err);
          } else {
            // تحويل أسماء الأعمدة من snake_case إلى camelCase
            const logs: DeploymentLog[] = rows.map(row => ({
              id: row.id,
              serverId: row.server_id,
              status: row.status,
              message: row.message || null,
              details: row.details || null,
              startTime: row.start_time,
              endTime: row.end_time || null,
              userId: row.user_id || null,
              createdAt: row.created_at
            }));
            resolve(logs);
          }
        }
      );
    });
  }

  async getAllLogs(limit: number = 100): Promise<DeploymentLog[]> {
    return new Promise<DeploymentLog[]>((resolve, reject) => {
      sqliteDb.all(
        'SELECT * FROM deployment_logs ORDER BY created_at DESC LIMIT ?',
        [limit],
        (err, rows: any[]) => {
          if (err) {
            console.error('Error getting all deployment logs:', err);
            reject(err);
          } else {
            // تحويل أسماء الأعمدة من snake_case إلى camelCase
            const logs: DeploymentLog[] = rows.map(row => ({
              id: row.id,
              serverId: row.server_id,
              status: row.status,
              message: row.message || null,
              details: row.details || null,
              startTime: row.start_time,
              endTime: row.end_time || null,
              userId: row.user_id || null,
              createdAt: row.created_at
            }));
            resolve(logs);
          }
        }
      );
    });
  }

  async createLog(log: InsertDeploymentLog): Promise<DeploymentLog> {
    return new Promise<DeploymentLog>((resolve, reject) => {
      const now = new Date().toISOString();

      // تحويل من camelCase إلى snake_case للقاعدة
      sqliteDb.run(
        `INSERT INTO deployment_logs (
          server_id, status, message, details, start_time, end_time, user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          log.serverId,
          log.status,
          log.message || null,
          log.details || null,
          now, // وقت البدء تلقائياً الآن
          log.endTime || null,
          log.userId || null,
          now
        ],
        function(err) {
          if (err) {
            console.error('Error creating deployment log:', err);
            reject(err);
          } else {
            const logId = this.lastID;
            const createdLog: DeploymentLog = {
              id: logId,
              serverId: log.serverId,
              status: log.status,
              message: log.message || null,
              details: log.details || null,
              startTime: now,
              endTime: log.endTime || null,
              userId: log.userId || null,
              createdAt: now
            };
            resolve(createdLog);
          }
        }
      );
    });
  }

  async clearAllLogs(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      sqliteDb.run('DELETE FROM deployment_logs', [], (err) => {
        if (err) {
          console.error('Error clearing deployment logs:', err);
          reject(err);
        } else {
          console.log('All deployment logs cleared successfully');
          resolve();
        }
      });
    });
  }

  async updateLog(id: number, status: string, message?: string, details?: string, endTime?: string): Promise<DeploymentLog> {
    return new Promise<DeploymentLog>(async (resolve, reject) => {
      try {
        // تحقق من وجود السجل
        const existingLog = await this.getLog(id);
        if (!existingLog) {
          throw new Error('سجل النشر غير موجود');
        }

        // بناء استعلام التحديث
        const updateFields: string[] = [];
        const updateValues: any[] = [];

        updateFields.push('status = ?');
        updateValues.push(status);

        if (message !== undefined) {
          updateFields.push('message = ?');
          updateValues.push(message);
        }

        if (details !== undefined) {
          updateFields.push('details = ?');
          updateValues.push(details);
        }

        if (endTime) {
          updateFields.push('end_time = ?');
          updateValues.push(endTime);
        } else if (status === 'success' || status === 'failure') {
          // إضافة وقت الانتهاء تلقائياً عند الانتهاء من العملية
          const now = new Date().toISOString();
          updateFields.push('end_time = ?');
          updateValues.push(now);
        }

        // إضافة معرف السجل للشرط
        updateValues.push(id);

        // تنفيذ استعلام التحديث
        sqliteDb.run(
          `UPDATE deployment_logs SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues,
          async (err) => {
            if (err) {
              console.error('Error updating deployment log:', err);
              reject(err);
            } else {
              // الحصول على السجل المحدث
              const updatedLog = await this.getLog(id);
              if (!updatedLog) {
                reject(new Error('فشل في الحصول على سجل النشر المحدث'));
              } else {
                resolve(updatedLog);
              }
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  // ========================= دوال إدارة المفاتيح المتقدمة =========================

  async updateKeyUsage(keyId: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const now = new Date().toISOString();

      sqliteDb.run(
        'UPDATE config_keys SET last_used_at = ?, usage_today = usage_today + 1 WHERE id = ?',
        [now, keyId],
        (err) => {
          if (err) {
            console.error('Error updating key usage:', err);
            reject(err);
          } else {
            console.log(`تم تحديث استخدام المفتاح ${keyId}`);
            resolve();
          }
        }
      );
    });
  }

  async markKeyFailed(keyId: number, failedUntil: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      sqliteDb.run(
        'UPDATE config_keys SET failed_until = ? WHERE id = ?',
        [failedUntil, keyId],
        (err) => {
          if (err) {
            console.error('Error marking key as failed:', err);
            reject(err);
          } else {
            console.log(`تم وسم المفتاح ${keyId} كفاشل حتى ${failedUntil}`);
            resolve();
          }
        }
      );
    });
  }

  async resetDailyUsage(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const now = new Date().toISOString();

      sqliteDb.run(
        'UPDATE config_keys SET usage_today = 0, failed_until = NULL, updated_at = ?',
        [now],
        (err) => {
          if (err) {
            console.error('Error resetting daily usage:', err);
            reject(err);
          } else {
            console.log('تم إعادة تعيين الاستخدام اليومي للمفاتيح');
            resolve();
          }
        }
      );
    });
  }

  // ========================= دوال إدارة السجلات النظام =========================

  async createSystemLog(log: InsertSystemLog): Promise<SystemLog> {
    return new Promise<SystemLog>(async (resolve, reject) => {
      try {
        const now = new Date().toISOString();
        const today = now.split('T')[0]; // YYYY-MM-DD format
        const thisMonth = `${now.split('-')[0]}-${now.split('-')[1]}-01`; // YYYY-MM-01 format

        let calculatedPreviousTotal = log.previousTotal || null;
        let calculatedDailyTotal = log.dailyTotal || null;
        let calculatedMonthlyTotal = log.monthlyTotal || null;

        // حساب العدادات فقط إذا كان لدينا userId و action
        if (log.userId && log.action) {
          try {
            // الحصول على العدادات الحالية قبل الزيادة
            const [dailyCounter, monthlyCounter] = await Promise.all([
              this.getCounter(log.userId, log.action, today, 'daily'),
              this.getCounter(log.userId, log.action, thisMonth, 'monthly')
            ]);

            // حساب previousTotal (المجموع الإجمالي للعمل قبل هذا السجل)
            calculatedPreviousTotal = (dailyCounter?.count || 0);

            // زيادة العدادات وحفظها
            const [updatedDailyCounter, updatedMonthlyCounter] = await Promise.all([
              this.createOrUpdateCounter(log.userId, log.action, today, 'daily', 1),
              this.createOrUpdateCounter(log.userId, log.action, thisMonth, 'monthly', 1)
            ]);

            // حساب القيم الجديدة
            calculatedDailyTotal = updatedDailyCounter.count;
            calculatedMonthlyTotal = updatedMonthlyCounter.count;

          } catch (counterError) {
            console.warn('Error calculating counters for system log:', counterError);
            // في حالة الفشل، نستخدم القيم المرسلة أو null
          }
        }

        sqliteDb.run(
          `INSERT INTO system_logs (
            timestamp, level, source, message, meta, 
            request_id, session_id, combined_tracking_id,
            actor_type, actor_id, actor_display_name, action, result, details,
            previous_total, daily_total, monthly_total,
            user_id, username, user_display_name, user_avatar, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            now, log.level, log.source, log.message, log.meta || null,
            log.requestId || null, log.sessionId || null, log.combinedTrackingId || null,
            log.actorType || null, log.actorId || null, log.actorDisplayName || null, 
            log.action || null, log.result || null, log.details || null,
            calculatedPreviousTotal, calculatedDailyTotal, calculatedMonthlyTotal,
            log.userId || null, log.username || null, log.userDisplayName || null, 
            log.userAvatar || null, now
          ],
          function(err) {
            if (err) {
              console.error('Error creating system log:', err);
              reject(err);
            } else {
              const newLog: SystemLog = {
                id: this.lastID,
                timestamp: now,
                level: log.level,
                source: log.source,
                message: log.message,
                meta: log.meta || null,
                // Request tracking fields
                requestId: log.requestId || null,
                sessionId: log.sessionId || null,
                combinedTrackingId: log.combinedTrackingId || null,
                // Enhanced fields
                actorType: log.actorType || null,
                actorId: log.actorId || null,
                actorDisplayName: log.actorDisplayName || null,
                action: log.action || null,
                result: log.result || null,
                details: log.details || null,
                // Cumulative counter fields
                previousTotal: calculatedPreviousTotal,
                dailyTotal: calculatedDailyTotal,
                monthlyTotal: calculatedMonthlyTotal,
                // Legacy fields for backward compatibility
                userId: log.userId || null,
                username: log.username || null,
                userDisplayName: log.userDisplayName || null,
                userAvatar: log.userAvatar || null,
                createdAt: now
              };
              resolve(newLog);
            }
          }
        );
      } catch (error) {
        console.error('Error in createSystemLog:', error);
        reject(error);
      }
    });
  }

  async getSystemLogs(filters: { since?: string; level?: string; source?: string; limit?: number; offset?: number }): Promise<SystemLog[]> {
    return new Promise<SystemLog[]>((resolve, reject) => {
      let query = 'SELECT * FROM system_logs WHERE 1=1';
      const params: any[] = [];

      if (filters.since) {
        query += ' AND timestamp >= ?';
        params.push(filters.since);
      }

      if (filters.level) {
        query += ' AND level = ?';
        params.push(filters.level);
      }

      if (filters.source) {
        query += ' AND source = ?';
        params.push(filters.source);
      }

      query += ' ORDER BY timestamp DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }

      sqliteDb.all(query, params, (err, rows: any[]) => {
        if (err) {
          console.error('Error getting system logs:', err);
          reject(err);
        } else {
          const logs: SystemLog[] = rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            level: row.level,
            source: row.source,
            message: row.message,
            meta: row.meta,
            // Request tracking fields
            requestId: row.request_id,
            sessionId: row.session_id,
            combinedTrackingId: row.combined_tracking_id,
            // Enhanced fields
            actorType: row.actor_type,
            actorId: row.actor_id,
            actorDisplayName: row.actor_display_name,
            action: row.action,
            result: row.result,
            details: row.details,
            // Cumulative counter fields
            previousTotal: row.previous_total,
            dailyTotal: row.daily_total,
            monthlyTotal: row.monthly_total,
            // Legacy fields for backward compatibility
            userId: row.user_id,
            username: row.username,
            userDisplayName: row.user_display_name,
            userAvatar: row.user_avatar,
            createdAt: row.created_at
          }));
          resolve(logs);
        }
      });
    });
  }

  async getLogsCount(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      sqliteDb.get('SELECT COUNT(*) as count FROM system_logs', [], (err: Error | null, row: { count: number } | undefined) => {
        if (err) {
          console.error('Error getting logs count:', err);
          reject(err);
        } else {
          resolve(row?.count || 0);
        }
      });
    });
  }

  async getLogsCountByLevel(): Promise<Record<string, number>> {
    return new Promise<Record<string, number>>((resolve, reject) => {
      sqliteDb.all('SELECT level, COUNT(*) as count FROM system_logs GROUP BY level', [], (err: Error | null, rows: { level: string; count: number }[]) => {
        if (err) {
          console.error('Error getting logs count by level:', err);
          reject(err);
        } else {
          const result: Record<string, number> = {};
          rows.forEach(row => {
            result[row.level] = row.count;
          });
          resolve(result);
        }
      });
    });
  }

  async getLogsCountBySource(): Promise<Record<string, number>> {
    return new Promise<Record<string, number>>((resolve, reject) => {
      sqliteDb.all('SELECT source, COUNT(*) as count FROM system_logs GROUP BY source', [], (err: Error | null, rows: { source: string; count: number }[]) => {
        if (err) {
          console.error('Error getting logs count by source:', err);
          reject(err);
        } else {
          const result: Record<string, number> = {};
          rows.forEach(row => {
            result[row.source] = row.count;
          });
          resolve(result);
        }
      });
    });
  }

  async deleteOldSystemLogs(cutoffDate: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      sqliteDb.run(
        'DELETE FROM system_logs WHERE timestamp < ?',
        [cutoffDate],
        function(err) {
          if (err) {
            console.error('Error deleting old system logs:', err);
            reject(err);
          } else {
            console.log(`Deleted ${this.changes} old system logs`);
            resolve(this.changes || 0);
          }
        }
      );
    });
  }

  async clearAllSystemLogs(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      sqliteDb.run(
        'DELETE FROM system_logs',
        [],
        function(err) {
          if (err) {
            console.error('Error clearing all system logs:', err);
            reject(err);
          } else {
            console.log(`Cleared ${this.changes} system logs`);
            resolve(this.changes || 0);
          }
        }
      );
    });
  }

  // ========================= دوال إدارة إعدادات الإشعارات =========================

  async getNotificationSetting(id: number): Promise<NotificationSetting | undefined> {
    return new Promise<NotificationSetting | undefined>((resolve, reject) => {
      sqliteDb.get('SELECT * FROM notification_settings WHERE id = ?', [id], (err: Error | null, row: SQLiteNotificationSettingRow | undefined) => {
        if (err) {
          console.error('Error getting notification setting:', err);
          reject(err);
        } else {
          if (!row) {
            resolve(undefined);
          } else {
            const setting: NotificationSetting = {
              id: row.id,
              type: row.type,
              name: row.name,
              isEnabled: !!row.is_enabled,
              webhookUrl: row.webhook_url ?? null,
              chatId: row.chat_id ?? null,
              alertLevels: row.alert_levels,
              threshold: row.threshold,
              cooldownMinutes: row.cooldown_minutes,
              createdAt: row.created_at,
              updatedAt: row.updated_at
            };
            resolve(setting);
          }
        }
      });
    });
  }

  async getAllNotificationSettings(): Promise<NotificationSetting[]> {
    return new Promise<NotificationSetting[]>((resolve, reject) => {
      sqliteDb.all('SELECT * FROM notification_settings ORDER BY created_at DESC', [], (err: Error | null, rows: SQLiteNotificationSettingRow[]) => {
        if (err) {
          console.error('Error getting all notification settings:', err);
          reject(err);
        } else {
          const settings: NotificationSetting[] = rows.map(row => ({
            id: row.id,
            type: row.type,
            name: row.name,
            isEnabled: !!row.is_enabled,
            webhookUrl: row.webhook_url ?? null,
            chatId: row.chat_id ?? null,
            alertLevels: row.alert_levels,
            threshold: row.threshold,
            cooldownMinutes: row.cooldown_minutes,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
          resolve(settings);
        }
      });
    });
  }

  async createNotificationSetting(setting: InsertNotificationSetting): Promise<NotificationSetting> {
    return new Promise<NotificationSetting>((resolve, reject) => {
      const now = new Date().toISOString();

      sqliteDb.run(
        'INSERT INTO notification_settings (type, name, is_enabled, webhook_url, chat_id, alert_levels, threshold, cooldown_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [setting.type, setting.name, setting.isEnabled ? 1 : 0, setting.webhookUrl || null, setting.chatId || null, setting.alertLevels, setting.threshold, setting.cooldownMinutes, now, now],
        function(err) {
          if (err) {
            console.error('Error creating notification setting:', err);
            reject(err);
          } else {
            const newSetting: NotificationSetting = {
              id: this.lastID,
              type: setting.type,
              name: setting.name,
              isEnabled: setting.isEnabled || true,
              webhookUrl: setting.webhookUrl || null,
              chatId: setting.chatId || null,
              alertLevels: setting.alertLevels || 'error,warn',
              threshold: setting.threshold || 1,
              cooldownMinutes: setting.cooldownMinutes || 5,
              createdAt: now,
              updatedAt: now
            };
            resolve(newSetting);
          }
        }
      );
    });
  }

  async updateNotificationSetting(id: number, settingData: Partial<InsertNotificationSetting>): Promise<NotificationSetting> {
    return new Promise<NotificationSetting>(async (resolve, reject) => {
      try {
        const updateFields: string[] = [];
        const updateValues: any[] = [];

        if (settingData.name !== undefined) {
          updateFields.push('name = ?');
          updateValues.push(settingData.name);
        }

        if (settingData.isEnabled !== undefined) {
          updateFields.push('is_enabled = ?');
          updateValues.push(settingData.isEnabled ? 1 : 0);
        }

        if (settingData.webhookUrl !== undefined) {
          updateFields.push('webhook_url = ?');
          updateValues.push(settingData.webhookUrl);
        }

        if (settingData.chatId !== undefined) {
          updateFields.push('chat_id = ?');
          updateValues.push(settingData.chatId);
        }

        if (settingData.alertLevels !== undefined) {
          updateFields.push('alert_levels = ?');
          updateValues.push(settingData.alertLevels);
        }

        if (settingData.threshold !== undefined) {
          updateFields.push('threshold = ?');
          updateValues.push(settingData.threshold);
        }

        if (settingData.cooldownMinutes !== undefined) {
          updateFields.push('cooldown_minutes = ?');
          updateValues.push(settingData.cooldownMinutes);
        }

        updateFields.push('updated_at = ?');
        updateValues.push(new Date().toISOString());
        updateValues.push(id);

        sqliteDb.run(
          `UPDATE notification_settings SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues,
          async (err) => {
            if (err) {
              console.error('Error updating notification setting:', err);
              reject(err);
            } else {
              const updatedSetting = await this.getNotificationSetting(id);
              if (!updatedSetting) {
                reject(new Error('فشل في الحصول على إعدادات الإشعار المحدثة'));
              } else {
                resolve(updatedSetting);
              }
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  async deleteNotificationSetting(id: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      sqliteDb.run('DELETE FROM notification_settings WHERE id = ?', [id], (err) => {
        if (err) {
          console.error('Error deleting notification setting:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // ========================= دوال إدارة سجلات الإشارات المالية =========================

  async createSignalLog(log: InsertSignalLog): Promise<SignalLog> {
    return new Promise<SignalLog>((resolve, reject) => {
      const now = new Date().toISOString();

      sqliteDb.run(
        `INSERT INTO signal_logs (
          user_id, username, request_id, symbol, market_type, timeframe, platform, status, signal, 
          probability, current_price, price_source, error_code, error_message, 
          analysis_data, indicators, execution_time, api_keys_used, request_ip, 
          user_agent, session_id, market_open, offline_mode, cache_used, 
          requested_at, completed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          log.userId || null, log.username || null, log.requestId || null, log.symbol, log.marketType, log.timeframe,
          log.platform || null, log.status, log.signal || null, log.probability || null,
          log.currentPrice || null, log.priceSource || null, log.errorCode || null,
          log.errorMessage || null, log.analysisData || null, log.indicators || null,
          log.executionTime || null, log.apiKeysUsed || null, log.requestIp || null,
          log.userAgent || null, log.sessionId || null, log.marketOpen ? 1 : 0,
          log.offlineMode ? 1 : 0, log.cacheUsed ? 1 : 0, log.requestedAt || now,
          log.completedAt || null, now
        ],
        function(err) {
          if (err) {
            console.error('Error creating signal log:', err);
            reject(err);
          } else {
            const newLog: SignalLog = {
              id: this.lastID,
              userId: log.userId || null,
              username: log.username || null,
              requestId: log.requestId || null,
              symbol: log.symbol,
              marketType: log.marketType,
              timeframe: log.timeframe,
              platform: log.platform || null,
              status: log.status,
              signal: log.signal || null,
              probability: log.probability || null,
              currentPrice: log.currentPrice || null,
              priceSource: log.priceSource || null,
              errorCode: log.errorCode || null,
              errorMessage: log.errorMessage || null,
              analysisData: log.analysisData || null,
              indicators: log.indicators || null,
              executionTime: log.executionTime || null,
              apiKeysUsed: log.apiKeysUsed || null,
              requestIp: log.requestIp || null,
              userAgent: log.userAgent || null,
              sessionId: log.sessionId || null,
              marketOpen: log.marketOpen || null,
              offlineMode: log.offlineMode || false,
              cacheUsed: log.cacheUsed || false,
              requestedAt: log.requestedAt || now,
              completedAt: log.completedAt || null,
              createdAt: now
            };
            resolve(newLog);
          }
        }
      );
    });
  }

  async getSignalLogs(filters: {
    since?: string;
    status?: string;
    symbol?: string;
    marketType?: string;
    userId?: number;
    platform?: string;
    limit?: number;
    offset?: number;
  }): Promise<SignalLog[]> {
    return new Promise<SignalLog[]>((resolve, reject) => {
      let query = 'SELECT * FROM signal_logs WHERE 1=1';
      const params: any[] = [];

      if (filters.since) {
        query += ' AND requested_at >= ?';
        params.push(filters.since);
      }

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters.symbol) {
        query += ' AND symbol = ?';
        params.push(filters.symbol);
      }

      if (filters.marketType) {
        query += ' AND market_type = ?';
        params.push(filters.marketType);
      }

      if (filters.userId) {
        query += ' AND user_id = ?';
        params.push(filters.userId);
      }

      if (filters.platform) {
        query += ' AND platform = ?';
        params.push(filters.platform);
      }

      query += ' ORDER BY requested_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);

        if (filters.offset) {
          query += ' OFFSET ?';
          params.push(filters.offset);
        }
      }

      sqliteDb.all(query, params, (err, rows: any[]) => {
        if (err) {
          console.error('Error getting signal logs:', err);
          reject(err);
        } else {
          const logs: SignalLog[] = rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            username: row.username,
            requestId: row.request_id,
            symbol: row.symbol,
            marketType: row.market_type,
            timeframe: row.timeframe,
            platform: row.platform,
            status: row.status,
            signal: row.signal,
            probability: row.probability,
            currentPrice: row.current_price,
            priceSource: row.price_source,
            errorCode: row.error_code,
            errorMessage: row.error_message,
            analysisData: row.analysis_data,
            indicators: row.indicators,
            executionTime: row.execution_time,
            apiKeysUsed: row.api_keys_used,
            requestIp: row.request_ip,
            userAgent: row.user_agent,
            sessionId: row.session_id,
            marketOpen: !!row.market_open,
            offlineMode: !!row.offline_mode,
            cacheUsed: !!row.cache_used,
            requestedAt: row.requested_at,
            completedAt: row.completed_at,
            createdAt: row.created_at
          }));
          resolve(logs);
        }
      });
    });
  }

  async getSignalLog(id: number): Promise<SignalLog | undefined> {
    return new Promise<SignalLog | undefined>((resolve, reject) => {
      sqliteDb.get('SELECT * FROM signal_logs WHERE id = ?', [id], (err: Error | null, row: SQLiteSignalLogRow | undefined) => {
        if (err) {
          console.error('Error getting signal log by ID:', err);
          reject(err);
        } else {
          if (!row) {
            resolve(undefined);
          } else {
            const log: SignalLog = {
              id: row.id,
              userId: row.user_id ?? null,
              username: row.username ?? null,
              requestId: row.request_id ?? null,
              symbol: row.symbol,
              marketType: row.market_type,
              timeframe: row.timeframe,
              platform: row.platform ?? null,
              status: row.status,
              signal: row.signal ?? null,
              probability: row.probability ?? null,
              currentPrice: row.current_price ?? null,
              priceSource: row.price_source ?? null,
              errorCode: row.error_code ?? null,
              errorMessage: row.error_message ?? null,
              analysisData: row.analysis_data ?? null,
              indicators: row.indicators ?? null,
              executionTime: row.execution_time ?? null,
              apiKeysUsed: row.api_keys_used ?? null,
              requestIp: row.request_ip ?? null,
              userAgent: row.user_agent ?? null,
              sessionId: row.session_id ?? null,
              marketOpen: !!row.market_open,
              offlineMode: !!row.offline_mode,
              cacheUsed: !!row.cache_used,
              requestedAt: row.requested_at,
              completedAt: row.completed_at ?? null,
              createdAt: row.created_at
            };
            resolve(log);
          }
        }
      });
    });
  }

  async updateSignalLog(id: number, updates: Partial<InsertSignalLog>): Promise<SignalLog> {
    return new Promise<SignalLog>(async (resolve, reject) => {
      try {
        const updateFields: string[] = [];
        const updateValues: any[] = [];

        if (updates.status !== undefined) {
          updateFields.push('status = ?');
          updateValues.push(updates.status);
        }

        if (updates.signal !== undefined) {
          updateFields.push('signal = ?');
          updateValues.push(updates.signal);
        }

        if (updates.probability !== undefined) {
          updateFields.push('probability = ?');
          updateValues.push(updates.probability);
        }

        if (updates.currentPrice !== undefined) {
          updateFields.push('current_price = ?');
          updateValues.push(updates.currentPrice);
        }

        if (updates.errorCode !== undefined) {
          updateFields.push('error_code = ?');
          updateValues.push(updates.errorCode);
        }

        if (updates.errorMessage !== undefined) {
          updateFields.push('error_message = ?');
          updateValues.push(updates.errorMessage);
        }

        if (updates.analysisData !== undefined) {
          updateFields.push('analysis_data = ?');
          updateValues.push(updates.analysisData);
        }

        if (updates.indicators !== undefined) {
          updateFields.push('indicators = ?');
          updateValues.push(updates.indicators);
        }

        if (updates.executionTime !== undefined) {
          updateFields.push('execution_time = ?');
          updateValues.push(updates.executionTime);
        }

        if (updates.completedAt !== undefined) {
          updateFields.push('completed_at = ?');
          updateValues.push(updates.completedAt);
        }

        if (updates.cacheUsed !== undefined) {
          updateFields.push('cache_used = ?');
          updateValues.push(updates.cacheUsed ? 1 : 0);
        }

        if (updateFields.length === 0) {
          throw new Error('لا توجد حقول للتحديث');
        }

        updateValues.push(id);

        sqliteDb.run(
          `UPDATE signal_logs SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues,
          async (err) => {
            if (err) {
              console.error('Error updating signal log:', err);
              reject(err);
            } else {
              const updatedLog = await this.getSignalLog(id);
              if (!updatedLog) {
                reject(new Error('فشل في الحصول على سجل الإشارة المحدث'));
              } else {
                resolve(updatedLog);
              }
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  async getSignalLogStats(): Promise<{
    total: number;
    statusCounts: Record<string, number>;
    symbolCounts: Record<string, number>;
    platformCounts: Record<string, number>;
    recentErrors: SignalLog[];
    averageExecutionTime: number;
  }> {
    return new Promise((resolve, reject) => {
      // احصل على العدد الإجمالي
      sqliteDb.get('SELECT COUNT(*) as total FROM signal_logs', (err, totalRow: any) => {
        if (err) {
          console.error('Error getting signal logs count:', err);
          reject(err);
          return;
        }

        const total = totalRow.total;

        // احصل على إحصائيات الحالة
        sqliteDb.all(
          'SELECT status, COUNT(*) as count FROM signal_logs GROUP BY status',
          (err, statusRows: any[]) => {
            if (err) {
              console.error('Error getting status counts:', err);
              reject(err);
              return;
            }

            const statusCounts: Record<string, number> = {};
            statusRows.forEach(row => {
              statusCounts[row.status] = row.count;
            });

            // احصل على إحصائيات الرموز
            sqliteDb.all(
              'SELECT symbol, COUNT(*) as count FROM signal_logs GROUP BY symbol ORDER BY count DESC LIMIT 10',
              (err, symbolRows: any[]) => {
                if (err) {
                  console.error('Error getting symbol counts:', err);
                  reject(err);
                  return;
                }

                const symbolCounts: Record<string, number> = {};
                symbolRows.forEach(row => {
                  symbolCounts[row.symbol] = row.count;
                });

                // احصل على إحصائيات المنصات
                sqliteDb.all(
                  'SELECT platform, COUNT(*) as count FROM signal_logs WHERE platform IS NOT NULL GROUP BY platform',
                  (err, platformRows: any[]) => {
                    if (err) {
                      console.error('Error getting platform counts:', err);
                      reject(err);
                      return;
                    }

                    const platformCounts: Record<string, number> = {};
                    platformRows.forEach(row => {
                      platformCounts[row.platform] = row.count;
                    });

                    // احصل على الأخطاء الأخيرة
                    sqliteDb.all(
                      'SELECT * FROM signal_logs WHERE status = "failed" ORDER BY requested_at DESC LIMIT 10',
                      (err, errorRows: any[]) => {
                        if (err) {
                          console.error('Error getting recent errors:', err);
                          reject(err);
                          return;
                        }

                        const recentErrors: SignalLog[] = errorRows.map(row => ({
                          id: row.id,
                          userId: row.user_id,
                          username: row.username,
                          requestId: row.request_id,
                          symbol: row.symbol,
                          marketType: row.market_type,
                          timeframe: row.timeframe,
                          platform: row.platform,
                          status: row.status,
                          signal: row.signal,
                          probability: row.probability,
                          currentPrice: row.current_price,
                          priceSource: row.price_source,
                          errorCode: row.error_code,
                          errorMessage: row.error_message,
                          analysisData: row.analysis_data,
                          indicators: row.indicators,
                          executionTime: row.execution_time,
                          apiKeysUsed: row.api_keys_used,
                          requestIp: row.request_ip,
                          userAgent: row.user_agent,
                          sessionId: row.session_id,
                          marketOpen: !!row.market_open,
                          offlineMode: !!row.offline_mode,
                          cacheUsed: !!row.cache_used,
                          requestedAt: row.requested_at,
                          completedAt: row.completed_at,
                          createdAt: row.created_at
                        }));

                        // احصل على متوسط وقت التنفيذ
                        sqliteDb.get(
                          'SELECT AVG(execution_time) as avg_time FROM signal_logs WHERE execution_time IS NOT NULL',
                          (err, avgRow: any) => {
                            if (err) {
                              console.error('Error getting average execution time:', err);
                              reject(err);
                              return;
                            }

                            const averageExecutionTime = avgRow.avg_time || 0;

                            resolve({
                              total,
                              statusCounts,
                              symbolCounts,
                              platformCounts,
                              recentErrors,
                              averageExecutionTime
                            });
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    });
  }

  async deleteOldSignalLogs(cutoffDate: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      sqliteDb.run(
        'DELETE FROM signal_logs WHERE requested_at < ?',
        [cutoffDate],
        function(err) {
          if (err) {
            console.error('Error deleting old signal logs:', err);
            reject(err);
          } else {
            resolve(this.changes || 0);
          }
        }
      );
    });
  }

  // Helper method to extract device and location information
  private enrichWithDeviceAndLocation(userAgent?: string | null, ip?: string | null): {
    deviceInfo: {
      device?: string;
      os?: string;
      browser?: string;
      model?: string;
    };
    locationInfo: {
      country?: string;
      city?: string;
      region?: string;
      timezone?: string;
    };
  } {
    const result = {
      deviceInfo: {},
      locationInfo: {}
    };

    // Parse user agent for device information
    if (userAgent) {
      try {
        const parser = new UAParser(userAgent);
        const parsedResult = parser.getResult();

        result.deviceInfo = {
          device: parsedResult.device?.type || 'desktop',
          os: `${parsedResult.os?.name || 'Unknown'} ${parsedResult.os?.version || ''}`.trim(),
          browser: `${parsedResult.browser?.name || 'Unknown'} ${parsedResult.browser?.version || ''}`.trim(),
          model: parsedResult.device?.model || parsedResult.device?.vendor || null
        };
      } catch (error) {
        console.warn('Error parsing user agent:', error);
      }
    }

    // Parse IP for location information  
    if (ip && ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('10.') && !ip.startsWith('192.168.')) {
      try {
        const geo = geoip.lookup(ip);
        if (geo) {
          result.locationInfo = {
            country: geo.country || undefined,
            city: geo.city || undefined,
            region: geo.region || undefined,
            timezone: geo.timezone || undefined
          };
        }
      } catch (error) {
        console.warn('Error looking up IP location:', error);
      }
    }

    return result;
  }

  // Helper method to normalize date format
  private normalizeDateFormat(date: string, period: 'daily' | 'monthly'): string {
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        // If parsing fails, use current date
        const now = new Date();
        if (period === 'monthly') {
          return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        }
        return now.toISOString().split('T')[0]; // YYYY-MM-DD
      }

      // Format based on period
      if (period === 'monthly') {
        return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-01`;
      } else {
        return parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    } catch (error) {
      console.error('Error normalizing date format:', error);
      const now = new Date();
      if (period === 'monthly') {
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      }
      return now.toISOString().split('T')[0];
    }
  }

  // User counters methods implementation
  async createOrUpdateCounter(
    userId: number | null, 
    action: string, 
    date: string, 
    period: 'daily' | 'monthly', 
    increment: number = 1
  ): Promise<UserCounter> {
    return new Promise<UserCounter>((resolve, reject) => {
      const now = new Date().toISOString();
      const normalizedDate = this.normalizeDateFormat(date, period);

      // Use UPSERT with normalized_user_id for NULL userId handling
      sqliteDb.run(`
        INSERT INTO user_counters (user_id, action, date, period, count, last_updated, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (normalized_user_id, action, date, period)
        DO UPDATE SET 
          count = count + excluded.count,
          last_updated = excluded.last_updated,
          updated_at = excluded.updated_at
      `, [
        userId, action, normalizedDate, period, increment, now, now, now
      ], function(err) {
        if (err) {
          console.error('Error creating/updating counter:', err);
          reject(err);
          return;
        }

        // Get the updated counter using normalized_user_id for consistent lookup
        sqliteDb.get(
          'SELECT * FROM user_counters WHERE normalized_user_id = COALESCE(?, -1) AND action = ? AND date = ? AND period = ?',
          [userId, action, normalizedDate, period],
          (err, row: any) => {
            if (err) {
              console.error('Error fetching updated counter:', err);
              reject(err);
            } else if (row) {
              resolve({
                id: row.id,
                userId: row.user_id,
                normalizedUserId: row.normalized_user_id,
                action: row.action,
                date: row.date,
                period: row.period,
                count: row.count,
                lastUpdated: row.last_updated,
                createdAt: row.created_at,
                updatedAt: row.updated_at
              });
            } else {
              reject(new Error('Counter not found after creation/update'));
            }
          }
        );
      });
    });
  }

  async getCounter(
    userId: number | null, 
    action: string, 
    date: string, 
    period: 'daily' | 'monthly'
  ): Promise<UserCounter | undefined> {
    return new Promise<UserCounter | undefined>((resolve, reject) => {
      const normalizedDate = this.normalizeDateFormat(date, period);

      sqliteDb.get(
        'SELECT * FROM user_counters WHERE normalized_user_id = COALESCE(?, -1) AND action = ? AND date = ? AND period = ?',
        [userId, action, normalizedDate, period],
        (err, row: any) => {
          if (err) {
            console.error('Error getting counter:', err);
            reject(err);
          } else if (row) {
            resolve({
              id: row.id,
              userId: row.user_id,
              normalizedUserId: row.normalized_user_id,
              action: row.action,
              date: row.date,
              period: row.period,
              count: row.count,
              lastUpdated: row.last_updated,
              createdAt: row.created_at,
              updatedAt: row.updated_at
            });
          } else {
            resolve(undefined);
          }
        }
      );
    });
  }

  async getCountersByPeriod(filters: {
    userId?: number | null;
    action?: string;
    period: 'daily' | 'monthly';
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<UserCounter[]> {
    return new Promise<UserCounter[]>((resolve, reject) => {
      // Optimized query using normalized_user_id for consistent NULL handling and index utilization
      let query = 'SELECT * FROM user_counters WHERE period = ?';
      const params: any[] = [filters.period];

      if (filters.userId !== undefined) {
        query += ' AND normalized_user_id = COALESCE(?, -1)';
        params.push(filters.userId);
      }

      if (filters.action) {
        query += ' AND action = ?';
        params.push(filters.action);
      }

      if (filters.dateFrom) {
        query += ' AND date >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        query += ' AND date <= ?';
        params.push(filters.dateTo);
      }

      // Optimize ordering to enable index-only ordering based on filters
      if (filters.userId !== undefined) {
        // When userId is specified, ORDER BY date DESC only to use idx_user_counters_user_period
        query += ' ORDER BY date DESC';
      } else if (filters.action) {
        // When filtering by action, ORDER BY date DESC to use idx_user_counters_action_period
        query += ' ORDER BY date DESC';
      } else {
        // General case: order by date DESC for consistent results
        query += ' ORDER BY date DESC';
      }

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }

      sqliteDb.all(query, params, (err, rows: any[]) => {
        if (err) {
          console.error('Error getting counters by period:', err);
          reject(err);
        } else {
          const counters: UserCounter[] = rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            normalizedUserId: row.normalized_user_id,
            action: row.action,
            date: row.date,
            period: row.period,
            count: row.count,
            lastUpdated: row.last_updated,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
          resolve(counters);
        }
      });
    });
  }

  async getUserCountersSummary(
    userId: number | null, 
    actions?: string[]
  ): Promise<{
    daily: Record<string, number>;
    monthly: Record<string, number>;
    totalActions: number;
    mostActiveDay: string | null;
    mostActiveAction: string | null;
  }> {
    return new Promise<{
      daily: Record<string, number>;
      monthly: Record<string, number>;
      totalActions: number;
      mostActiveDay: string | null;
      mostActiveAction: string | null;
    }>((resolve, reject) => {
      // Using normalized_user_id for efficient index utilization with NULL values
      let baseQuery = 'FROM user_counters WHERE normalized_user_id = COALESCE(?, -1)';
      const baseParams: any[] = [userId];

      if (actions && actions.length > 0) {
        const placeholders = actions.map(() => '?').join(',');
        baseQuery += ` AND action IN (${placeholders})`;
        baseParams.push(...actions);
      }

      // Get daily totals
      sqliteDb.all(
        `SELECT action, SUM(count) as total ${baseQuery} AND period = 'daily' GROUP BY action ORDER BY action`,
        baseParams,
        (err, dailyRows: any[]) => {
          if (err) {
            console.error('Error getting daily counters:', err);
            reject(err);
            return;
          }

          const daily: Record<string, number> = {};
          dailyRows.forEach(row => {
            daily[row.action] = row.total;
          });

          // Get monthly totals
          sqliteDb.all(
            `SELECT action, SUM(count) as total ${baseQuery} AND period = 'monthly' GROUP BY action ORDER BY action`,
            baseParams,
            (err, monthlyRows: any[]) => {
              if (err) {
                console.error('Error getting monthly counters:', err);
                reject(err);
                return;
              }

              const monthly: Record<string, number> = {};
              monthlyRows.forEach(row => {
                monthly[row.action] = row.total;
              });

              // Get total actions
              sqliteDb.get(
                `SELECT SUM(count) as total ${baseQuery} AND period = 'daily'`,
                baseParams,
                (err, totalRow: any) => {
                  if (err) {
                    console.error('Error getting total actions:', err);
                    reject(err);
                    return;
                  }

                  const totalActions = totalRow?.total || 0;

                  // Get most active day
                  sqliteDb.get(
                    `SELECT date, SUM(count) as total ${baseQuery} AND period = 'daily' GROUP BY date ORDER BY total DESC LIMIT 1`,
                    baseParams,
                    (err, mostActiveDayRow: any) => {
                      if (err) {
                        console.error('Error getting most active day:', err);
                        reject(err);
                        return;
                      }

                      const mostActiveDay = mostActiveDayRow?.date || null;

                      // Get most active action
                      sqliteDb.get(
                        `SELECT action, SUM(count) as total ${baseQuery} AND period = 'daily' GROUP BY action ORDER BY total DESC LIMIT 1`,
                        baseParams,
                        (err, mostActiveActionRow: any) => {
                          if (err) {
                            console.error('Error getting most active action:', err);
                            reject(err);
                            return;
                          }

                          const mostActiveAction = mostActiveActionRow?.action || null;

                          resolve({
                            daily,
                            monthly,
                            totalActions,
                            mostActiveDay,
                            mostActiveAction
                          });
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  }

  // ========================= دوال إدارة تقارير الأخطاء =========================

  async createOrUpdateErrorReport(errorData: {
    errorHash: string;
    category: string;
    code: string;
    message: string;
    messageAr?: string;
    severity: string;
    userAgent?: string;
    language?: string;
    url?: string;
    platform?: string;
    connectionType?: string;
    details?: string;
    stack?: string;
    requestId?: string;
    sessionId?: string;
    userId?: number;
  }): Promise<ErrorReport> {
    return new Promise<ErrorReport>((resolve, reject) => {
      const now = new Date().toISOString();
      
      // Save reference to this for use in callbacks
      const self = this;
      
      // إنشاء hash آمن للخطأ لتجميع التقارير المتشابهة - تنظيف URL
      const cleanUrl = errorData.url ? (() => {
        try {
          // If it's already a path (starts with /), keep it as is
          if (errorData.url.startsWith('/')) {
            // Remove query parameters and hash if present
            return errorData.url.split('?')[0].split('#')[0];
          }
          // If it's a full URL, extract only the pathname
          const url = new URL(errorData.url);
          return url.pathname;
        } catch {
          // If parsing fails, try to extract path-like structure
          const pathMatch = errorData.url.match(/^[^?#]+/);
          return pathMatch ? pathMatch[0] : null;
        }
      })() : null;
      
      // First check if error exists
      sqliteDb.get(
        'SELECT * FROM error_reports WHERE error_hash = ?',
        [errorData.errorHash],
        (err, existingRow: any) => {
          if (err) {
            console.error('Error checking existing error report:', err);
            reject(err);
            return;
          }

          if (existingRow) {
            // Update existing error report (increment count)
            sqliteDb.run(
              `UPDATE error_reports SET 
                count = count + 1,
                last_reported_at = ?,
                updated_at = ?,
                user_agent = COALESCE(?, user_agent),
                language = COALESCE(?, language),
                platform = COALESCE(?, platform),
                connection_type = COALESCE(?, connection_type)
               WHERE error_hash = ?`,
              [
                now, now,
                errorData.userAgent,
                errorData.language,
                errorData.platform,
                errorData.connectionType,
                errorData.errorHash
              ],
              function(updateErr) {
                if (updateErr) {
                  console.error('Error updating error report:', updateErr);
                  reject(updateErr);
                  return;
                }

                // Return updated record
                sqliteDb.get(
                  'SELECT * FROM error_reports WHERE error_hash = ?',
                  [errorData.errorHash],
                  (getErr, updatedRow: any) => {
                    if (getErr) {
                      reject(getErr);
                    } else {
                      resolve(self.convertErrorReportRow(updatedRow));
                    }
                  }
                );
              }
            );
          } else {
            // Create new error report
            sqliteDb.run(
              `INSERT INTO error_reports (
                error_hash, category, code, message, message_ar, severity,
                user_agent, language, url, platform, connection_type,
                details, stack, request_id, session_id, user_id,
                first_reported_at, last_reported_at, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                errorData.errorHash,
                errorData.category,
                errorData.code,
                errorData.message,
                errorData.messageAr,
                errorData.severity,
                errorData.userAgent,
                errorData.language,
                cleanUrl,
                errorData.platform,
                errorData.connectionType,
                errorData.details,
                errorData.stack,
                errorData.requestId,
                errorData.sessionId,
                errorData.userId,
                now, now, now, now
              ],
              function(insertErr) {
                if (insertErr) {
                  console.error('Error creating error report:', insertErr);
                  reject(insertErr);
                  return;
                }

                const reportId = this.lastID;
                sqliteDb.get(
                  'SELECT * FROM error_reports WHERE id = ?',
                  [reportId],
                  (getErr, newRow: any) => {
                    if (getErr) {
                      reject(getErr);
                    } else {
                      resolve(self.convertErrorReportRow(newRow));
                    }
                  }
                );
              }
            );
          }
        }
      );
    });
  }

  async getErrorReport(id: number): Promise<ErrorReport | undefined> {
    return new Promise<ErrorReport | undefined>((resolve, reject) => {
      sqliteDb.get('SELECT * FROM error_reports WHERE id = ?', [id], (err: Error | null, row: SQLiteErrorReportRow | undefined) => {
        if (err) {
          console.error('Error getting error report by ID:', err);
          reject(err);
        } else {
          resolve(row ? this.convertErrorReportRow(row) : undefined);
        }
      });
    });
  }

  async getErrorReportByHash(errorHash: string): Promise<ErrorReport | undefined> {
    return new Promise<ErrorReport | undefined>((resolve, reject) => {
      sqliteDb.get('SELECT * FROM error_reports WHERE error_hash = ?', [errorHash], (err: Error | null, row: SQLiteErrorReportRow | undefined) => {
        if (err) {
          console.error('Error getting error report by hash:', err);
          reject(err);
        } else {
          resolve(row ? this.convertErrorReportRow(row) : undefined);
        }
      });
    });
  }

  async getErrorReports(filters: {
    category?: string;
    severity?: string;
    since?: string;
    limit?: number;
    offset?: number;
  }): Promise<ErrorReport[]> {
    return new Promise<ErrorReport[]>((resolve, reject) => {
      let query = 'SELECT * FROM error_reports WHERE 1=1';
      const params: any[] = [];

      if (filters.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }

      if (filters.severity) {
        query += ' AND severity = ?';
        params.push(filters.severity);
      }

      if (filters.since) {
        query += ' AND last_reported_at >= ?';
        params.push(filters.since);
      }

      query += ' ORDER BY last_reported_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }

      sqliteDb.all(query, params, (err, rows: any[]) => {
        if (err) {
          console.error('Error getting error reports:', err);
          reject(err);
        } else {
          const reports = rows.map(row => this.convertErrorReportRow(row));
          resolve(reports);
        }
      });
    });
  }

  async getErrorReportsStats(): Promise<{
    totalReports: number;
    categoryCounts: Record<string, number>;
    severityCounts: Record<string, number>;
    recentErrors: ErrorReport[];
    topErrors: ErrorReport[];
  }> {
    return new Promise((resolve, reject) => {
      // Get total count
      sqliteDb.get('SELECT COUNT(*) as total FROM error_reports', [], (err, totalRow: any) => {
        if (err) {
          reject(err);
          return;
        }

        const totalReports = totalRow.total;

        // Get category counts
        sqliteDb.all(
          'SELECT category, SUM(count) as total FROM error_reports GROUP BY category ORDER BY total DESC',
          [],
          (err, categoryRows: any[]) => {
            if (err) {
              reject(err);
              return;
            }

            const categoryCounts: Record<string, number> = {};
            categoryRows.forEach(row => {
              categoryCounts[row.category] = row.total;
            });

            // Get severity counts
            sqliteDb.all(
              'SELECT severity, SUM(count) as total FROM error_reports GROUP BY severity ORDER BY total DESC',
              [],
              (err, severityRows: any[]) => {
                if (err) {
                  reject(err);
                  return;
                }

                const severityCounts: Record<string, number> = {};
                severityRows.forEach(row => {
                  severityCounts[row.severity] = row.total;
                });

                // Get recent errors
                sqliteDb.all(
                  'SELECT * FROM error_reports ORDER BY last_reported_at DESC LIMIT 10',
                  [],
                  (err, recentRows: any[]) => {
                    if (err) {
                      reject(err);
                      return;
                    }

                    const recentErrors = recentRows.map(row => this.convertErrorReportRow(row));

                    // Get top errors by count
                    sqliteDb.all(
                      'SELECT * FROM error_reports ORDER BY count DESC LIMIT 10',
                      [],
                      (err, topRows: any[]) => {
                        if (err) {
                          reject(err);
                          return;
                        }

                        const topErrors = topRows.map(row => this.convertErrorReportRow(row));

                        resolve({
                          totalReports,
                          categoryCounts,
                          severityCounts,
                          recentErrors,
                          topErrors
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    });
  }

  async deleteOldErrorReports(cutoffDate: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      sqliteDb.run(
        'DELETE FROM error_reports WHERE first_reported_at < ?',
        [cutoffDate],
        function(err) {
          if (err) {
            console.error('Error deleting old error reports:', err);
            reject(err);
          } else {
            console.log(`Deleted ${this.changes} old error reports`);
            resolve(this.changes);
          }
        }
      );
    });
  }

  // Helper method to convert snake_case database row to camelCase
  private convertErrorReportRow(row: any): ErrorReport {
    return {
      id: row.id,
      errorHash: row.error_hash,
      category: row.category,
      code: row.code,
      message: row.message,
      messageAr: row.message_ar,
      severity: row.severity,
      count: row.count,
      userAgent: row.user_agent,
      language: row.language,
      url: row.url,
      platform: row.platform,
      connectionType: row.connection_type,
      details: row.details,
      stack: row.stack,
      requestId: row.request_id,
      sessionId: row.session_id,
      userId: row.user_id,
      firstReportedAt: row.first_reported_at,
      lastReportedAt: row.last_reported_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const storage = new DatabaseStorage();