// تم التحويل لاستخدام sqlite3 مباشرة بدلاً من drizzle-orm
import session from "express-session";
import path from "path";
import fs from "fs";
import sqlite3 from "sqlite3";
import { 
  users, type User, type InsertUser,
  configKeys, type ConfigKey, type InsertConfigKey,
  deploymentServers, type DeploymentServer, type InsertDeploymentServer,
  deploymentLogs, type DeploymentLog, type InsertDeploymentLog
} from "@shared/schema";
import env from "./env";

// تجاوز التحقق من النوع لتسهيل استخدام sqlite3
// @ts-ignore
import connectSqlite3 from "connect-sqlite3";
// @ts-ignore
const SQLiteStore = connectSqlite3(session);

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

  // Database access
  getDatabase(): any;

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
      // إضافة عمود preferred_language إلى الجدول الموجود إذا لم يكن موجوداً
      sqliteDb.run(`
        ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'en'
      `, (alterErr) => {
        if (alterErr && alterErr.message.indexOf('duplicate column name') === -1) {
          console.error('Error adding preferred_language column:', alterErr);
        } else {
          console.log('Preferred language column ensured in users table');
        }
      });
      
      // إضافة عمود preferred_theme إلى الجدول الموجود إذا لم يكن موجوداً
      sqliteDb.run(`
        ALTER TABLE users ADD COLUMN preferred_theme TEXT DEFAULT 'system'
      `, (alterErr) => {
        if (alterErr && alterErr.message.indexOf('duplicate column name') === -1) {
          console.error('Error adding preferred_theme column:', alterErr);
        } else {
          console.log('Preferred theme column ensured in users table');
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
  
  // تأكد من إنشاء جدول مفاتيح التكوين
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS config_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT,
      is_secret INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating config_keys table:', err);
    } else {
      console.log('Config_keys table created or already exists');
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
  getDatabase() {
    return sqliteDb;
  }

  // ========================= دوال إدارة المستخدمين =========================

  async getUser(id: number): Promise<User | undefined> {
    return new Promise<User | undefined>((resolve, reject) => {
      sqliteDb.get('SELECT * FROM users WHERE id = ?', [id], (err, row: any) => {
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
      sqliteDb.get('SELECT * FROM users WHERE username = ?', [username], (err, row: any) => {
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
      sqliteDb.all('SELECT * FROM users', (err, rows: any[]) => {
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
      sqliteDb.get('SELECT * FROM config_keys WHERE key = ?', [key], (err, row: any) => {
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
              description: row.description || null,
              isSecret: !!row.is_secret,
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
      sqliteDb.all('SELECT * FROM config_keys', (err, rows: any[]) => {
        if (err) {
          console.error('Error getting all config keys:', err);
          reject(err);
        } else {
          // تحويل أسماء الأعمدة من snake_case إلى camelCase
          const configKeys: ConfigKey[] = rows.map(row => ({
            id: row.id,
            key: row.key,
            value: row.value,
            description: row.description || null,
            isSecret: !!row.is_secret,
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
                  description: description || null,
                  isSecret,
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
      sqliteDb.get('SELECT * FROM deployment_servers WHERE id = ?', [id], (err, row: any) => {
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
      sqliteDb.all('SELECT * FROM deployment_servers ORDER BY name', (err, rows: any[]) => {
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
      sqliteDb.all('SELECT * FROM deployment_servers WHERE is_active = 1 ORDER BY name', (err, rows: any[]) => {
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
      sqliteDb.get('SELECT * FROM deployment_logs WHERE id = ?', [id], (err, row: any) => {
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
}

export const storage = new DatabaseStorage();