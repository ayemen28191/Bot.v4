import { Client as SSHClient } from 'ssh2';
import { DeploymentServer, DeploymentLog } from '@shared/schema';
import { storage } from '../storage';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as child_process from 'child_process';
import { promisify } from 'util';
import {
  ErrorCategory,
  ErrorSeverity,
  createError,
  createValidationError,
  createNetworkError,
  convertJavaScriptError,
  ERROR_CODES,
  ERROR_MESSAGES
} from '@shared/error-types';

const exec = promisify(child_process.exec);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdtemp = promisify(fs.mkdtemp);
const rm = promisify(fs.rm);

/**
 * قائمة الأوامر المسموحة والآمنة لتنفيذها على الخادم (إزالة sudo لتجنب المخاطر)
 */
const ALLOWED_COMMANDS = [
  'npm', 'yarn', 'pnpm', 'node', 'pm2', 'systemctl',
  'chmod', 'chown', 'mkdir', 'cp', 'mv', 'ls', 'cat',
  'echo', 'cd', 'pwd', 'whoami', 'id', 'date', 'uptime',
  'ps', 'kill', 'killall', 'which', 'whereis',
  'git', 'docker', 'docker-compose', 'nginx', 'apache2',
  'service'
];

/**
 * أحرف وأنماط خطيرة محظورة في الأوامر
 */
const DANGEROUS_PATTERNS = [
  /[;&|`$(){}[\]\\]/,   // أحرف خطيرة للتحكم في الأوامر (إزالة /g لتجنب مشاكل lastIndex)
  /[\r\n]/,             // منع حقن الأسطر الجديدة  
  /\.\./,               // نقاط للصعود للمجلدات العليا
  /rm\s+-rf?\s+\//,     // أوامر حذف خطيرة
  />\s*\/dev\/null/,    // إعادة توجيه المخرجات
  /2>&1/,               // إعادة توجيه الأخطاء
  /\|\s*sh/,            // تنفيذ أوامر عبر الأنابيب
  /\|\s*bash/,          // تنفيذ أوامر عبر bash
  /--?\s*eval/,         // تنفيذ أوامر ديناميكية
  /curl.*\|\s*sh/,      // تحميل وتنفيذ أوامر من الإنترنت
  /wget.*\|\s*sh/,      // تحميل وتنفيذ أوامر من الإنترنت
];

/**
 * تحقق من صحة مسار النشر
 */
function validateDeployPath(path: string): string {
  if (!path || typeof path !== 'string') {
    throw createValidationError(
      ERROR_CODES.VALIDATION_REQUIRED,
      'Deploy path must be a non-empty string',
      'deployPath',
      path
    );
  }

  // السماح فقط بمسارات مطلقة آمنة
  const safePathPattern = /^\/[A-Za-z0-9_\-\.\/~]+$/;
  if (!safePathPattern.test(path)) {
    throw createValidationError(
      ERROR_CODES.VALIDATION_FORMAT,
      'Deploy path contains invalid characters',
      'deployPath',
      path
    );
  }

  // منع الصعود للمجلدات العليا
  if (path.includes('../')) {
    throw createValidationError(
      ERROR_CODES.VALIDATION_FORMAT,
      'Deploy path cannot contain ../',
      'deployPath',
      path
    );
  }

  return path;
}

/**
 * هروب آمن للمعاملات في shell
 */
function escapeShellArg(arg: string): string {
  // استخدام علامات تنصيص مفردة واستبدال أي علامة تنصيص مفردة موجودة
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * تنظيف وتأمين الأوامر المرسلة من المستخدم (رفض بدلاً من التعديل)
 */
function sanitizeCommand(command: string): string {
  if (!command || typeof command !== 'string') {
    throw createValidationError(
      ERROR_CODES.VALIDATION_REQUIRED,
      'Command must be a non-empty string',
      'command',
      command
    );
  }

  // إزالة المسافات الزائدة وتحويل إلى مسافة واحدة
  const trimmedCommand = command.trim().replace(/\s+/g, ' ');
  
  if (!trimmedCommand) {
    throw createValidationError(
      ERROR_CODES.VALIDATION_REQUIRED,
      'Cannot execute empty command',
      'command',
      trimmedCommand
    );
  }

  // فحص الأنماط الخطيرة (رفض فوري بدلاً من التعديل)
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmedCommand)) {
      throw createError(
        ErrorCategory.BUSINESS_LOGIC,
        'COMMAND_UNSAFE_PATTERN',
        `Command contains dangerous pattern: ${pattern.source}`,
        {
          messageAr: `الأمر يحتوي على نمط خطير غير مسموح: ${pattern.source}`,
          severity: ErrorSeverity.HIGH,
          userFriendly: true,
          details: { command: trimmedCommand, pattern: pattern.source }
        }
      );
    }
  }

  // التحقق من أن الأمر يحتوي فقط على أحرف آمنة
  const safeCharPattern = /^[a-zA-Z0-9\s\-_./:=@]+$/;
  if (!safeCharPattern.test(trimmedCommand)) {
    throw createValidationError(
      ERROR_CODES.VALIDATION_FORMAT,
      'Command contains invalid characters',
      'command',
      trimmedCommand
    );
  }

  // تقسيم الأمر وفحص كل جزء
  const parts = trimmedCommand.split(/\s+/);
  const mainCommand = parts[0];

  // فحص إذا كان الأمر الرئيسي مسموح
  if (!ALLOWED_COMMANDS.includes(mainCommand)) {
    throw createError(
      ErrorCategory.BUSINESS_LOGIC,
      'COMMAND_NOT_ALLOWED',
      `Command '${mainCommand}' is not allowed. Allowed commands: ${ALLOWED_COMMANDS.join(', ')}`,
      {
        messageAr: `الأمر '${mainCommand}' غير مسموح. الأوامر المسموحة: ${ALLOWED_COMMANDS.join(', ')}`,
        severity: ErrorSeverity.HIGH,
        userFriendly: true,
        details: { command: mainCommand, allowedCommands: ALLOWED_COMMANDS }
      }
    );
  }

  return trimmedCommand;
}

/**
 * تنظيف قائمة الملفات المستثناة لمنع حقن الأوامر في tar
 */
function sanitizeExcludeFiles(files: string[]): string[] {
  return files
    .filter(file => typeof file === 'string' && file.trim())
    .map(file => {
      // إزالة الأحرف الخطيرة والاحتفاظ بالأحرف الآمنة فقط
      const sanitized = file.replace(/[^a-zA-Z0-9\-_./*]/g, '');
      if (!sanitized) {
        throw createValidationError(
          ERROR_CODES.VALIDATION_FORMAT,
          `Invalid file name: ${file}`,
          'excludeFiles',
          file
        );
      }
      return sanitized;
    });
}

/**
 * واجهة معلومات النشر
 */
export interface DeploymentInfo {
  server: DeploymentServer;
  userId?: number;
  sourceDir?: string;
  excludeFiles?: string[];
}

/**
 * واجهة نتيجة النشر
 */
export interface DeploymentResult {
  success: boolean;
  message: string;
  details?: string;
  log: DeploymentLog;
}

/**
 * خدمة التعامل مع عمليات النشر
 */
export class DeploymentService {
  /**
   * تنفيذ عملية النشر إلى خادم محدد
   */
  static async deployToServer(deployInfo: DeploymentInfo): Promise<DeploymentResult> {
    const { server, userId, sourceDir = '.', excludeFiles = ['node_modules', 'data', '.git', 'dist'] } = deployInfo;

    // إنشاء سجل بدء النشر
    const deploymentLog = await storage.createLog({
      serverId: server.id,
      status: 'in_progress',
      message: `بدء عملية النشر إلى الخادم ${server.name}`,
      userId
    });

    try {
      // تجهيز حزمة النشر
      const packagePath = await this.prepareDeploymentPackage(sourceDir, excludeFiles);
      console.log(`تم إنشاء حزمة النشر: ${packagePath}`);

      // تنفيذ النشر بناءً على نوع المصادقة
      let result: DeploymentResult;
      if (server.authType === 'key' && server.privateKey) {
        result = await this.deployWithKey(server, packagePath, deploymentLog);
      } else if (server.authType === 'password' && server.password) {
        result = await this.deployWithPassword(server, packagePath, deploymentLog);
      } else {
        throw createError(
          ErrorCategory.VALIDATION,
          'INVALID_AUTH_METHOD',
          'Invalid or incomplete authentication method',
          {
            messageAr: 'طريقة المصادقة غير صالحة أو ناقصة',
            severity: ErrorSeverity.HIGH,
            userFriendly: true,
            details: { authType: server.authType, hasKey: !!server.privateKey, hasPassword: !!server.password }
          }
        );
      }

      // تحديث تاريخ آخر نشر للخادم
      if (result.success) {
        await storage.updateServer(server.id, {
          lastDeployment: new Date().toISOString()
        });
      }

      // تنظيف الملفات المؤقتة
      try {
        await rm(packagePath, { force: true });
        console.log(`تم حذف الملف المؤقت: ${packagePath}`);
      } catch (error: unknown) {
        console.error('خطأ في حذف الملفات المؤقتة:', (error as Error)?.message || String(error));
      }

      return result;
    } catch (error: unknown) {
      const appError = convertJavaScriptError(error as Error);
      console.error('خطأ في عملية النشر:', (error as Error)?.message || String(error));

      // تحديث سجل النشر بالخطأ
      let updatedLog: DeploymentLog;
      try {
        updatedLog = await storage.updateLog(
          deploymentLog.id,
          'failure',
          `فشل في النشر: ${appError.message}`,
          JSON.stringify({ error: appError.details || appError.message, stack: (error as Error)?.stack }),
          new Date().toISOString()
        );
      } catch (updateError: unknown) {
        console.error('خطأ في تحديث سجل النشر:', (updateError as Error)?.message || String(updateError));
        updatedLog = deploymentLog;
      }

      return {
        success: false,
        message: `فشل في نشر التطبيق: ${appError.message}`,
        details: JSON.stringify({ error: appError.details || appError.message, stack: (error as Error)?.stack }),
        log: updatedLog
      };
    }
  }

  /**
   * إعداد حزمة النشر (ملف مضغوط مؤقت) - استخدام spawn بدلاً من exec لتجنب حقن الأوامر
   */
  private static async prepareDeploymentPackage(sourceDir: string, excludeFiles: string[] = []): Promise<string> {
    // التحقق من صحة sourceDir
    if (!sourceDir || typeof sourceDir !== 'string') {
      throw createValidationError(
        ERROR_CODES.VALIDATION_REQUIRED,
        'Source directory must be a valid string',
        'sourceDir',
        sourceDir
      );
    }
    
    // التحقق من أن sourceDir يحتوي على أحرف آمنة فقط
    const safeDirPattern = /^[A-Za-z0-9_\-\.\/~]+$/;
    if (!safeDirPattern.test(sourceDir)) {
      throw createValidationError(
        ERROR_CODES.VALIDATION_FORMAT,
        'Source directory contains invalid characters',
        'sourceDir',
        sourceDir
      );
    }

    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'deploy-'));
    const outputFile = path.join(tempDir, 'deployment.tar.gz');

    // بناء قائمة الملفات المستثناة مع التنظيف الأمني
    const sanitizedExcludes = sanitizeExcludeFiles(excludeFiles);
    
    // استخدام spawn بدلاً من exec لتجنب حقن الأوامر
    const { spawn } = child_process;
    const tarArgs = ['-czf', outputFile, '-C', sourceDir];
    
    // إضافة ملفات الاستثناء
    sanitizedExcludes.forEach(file => {
      tarArgs.push(`--exclude=${file}`);
    });
    
    tarArgs.push('.');

    return new Promise((resolve, reject) => {
      const tarProcess = spawn('tar', tarArgs);
      let stderr = '';

      tarProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      tarProcess.on('close', (code) => {
        if (code !== 0) {
          reject(createError(
            ErrorCategory.FILE_SYSTEM,
            'TAR_CREATE_FAILED',
            `Failed to create deployment archive: ${stderr}`,
            {
              messageAr: `فشل في إنشاء أرشيف النشر: ${stderr}`,
              severity: ErrorSeverity.HIGH,
              userFriendly: false,
              details: { sourceDir, stderr, exitCode: code }
            }
          ));
        } else {
          resolve(outputFile);
        }
      });

      tarProcess.on('error', (error) => {
        reject(createError(
          ErrorCategory.SYSTEM,
          'TAR_EXEC_FAILED',
          `Error executing tar command: ${error.message}`,
          {
            messageAr: `خطأ في تنفيذ أمر tar: ${error.message}`,
            severity: ErrorSeverity.HIGH,
            userFriendly: false,
            details: { originalError: error.name, sourceDir }
          }
        ));
      });
    });
  }

  /**
   * النشر باستخدام المصادقة بالمفتاح
   */
  private static async deployWithKey(
    server: DeploymentServer,
    packagePath: string,
    deploymentLog: DeploymentLog
  ): Promise<DeploymentResult> {
    const { host, port, username } = server;
    
    // التحقق من صحة مسار النشر
    const safeDeployPath = validateDeployPath(server.deployPath);

    // إنشاء ملف مؤقت للمفتاح الخاص
    const tempKeyFile = path.join(os.tmpdir(), `ssh-key-${crypto.randomBytes(8).toString('hex')}`);
    try {
      await writeFile(tempKeyFile, server.privateKey || '', { mode: 0o600 });

      const ssh = new SSHClient();

      // قراءة المفتاح الخاص
      const privateKeyContent = await readFile(tempKeyFile);

      // انتظار اتصال SSH
      await new Promise<void>((resolve, reject) => {
        ssh.on('ready', () => {
          resolve();
        }).on('error', (err: any) => {
          reject(createNetworkError(
            ERROR_CODES.NETWORK_CONNECTION_FAILED,
            `SSH connection failed: ${err.message}`,
            `${host}:${port}`,
            undefined,
            true
          ));
        }).connect({
          host,
          port: port || 22,
          username,
          privateKey: privateKeyContent,
          readyTimeout: 30000
        });
      });

      // إنشاء مجلد النشر إذا لم يكن موجوداً مع هروب آمن للمسار
      await this.executeSshCommand(ssh, `mkdir -p ${escapeShellArg(safeDeployPath)}`);

      // رفع ملف النشر
      await this.uploadFile(ssh, packagePath, `${safeDeployPath}/deployment.tar.gz`, server);

      // فك ضغط الملف على الخادم مع هروب آمن للمسار
      await this.executeSshCommand(ssh, `cd ${escapeShellArg(safeDeployPath)} && tar -xzf deployment.tar.gz`);

      // حذف ملف النشر المضغوط مع هروب آمن للمسار
      await this.executeSshCommand(ssh, `rm ${escapeShellArg(safeDeployPath)}/deployment.tar.gz`);

      // تنفيذ أوامر ما بعد النشر مع التحقق الأمني
      let commandOutput = '';
      if (server.commands) {
        try {
          const sanitizedCommand = sanitizeCommand(server.commands);
          commandOutput = await this.executeSshCommand(ssh, `cd ${escapeShellArg(safeDeployPath)} && ${sanitizedCommand}`);
        } catch (sanitizeError: unknown) {
          const appError = convertJavaScriptError(sanitizeError as Error);
          throw createError(
            ErrorCategory.BUSINESS_LOGIC,
            'COMMAND_SANITIZATION_FAILED',
            `أمر غير آمن تم رفضه: ${appError.message}`,
            {
              messageAr: `الأمر غير آمن ولا يمكن تنفيذه: ${appError.message}`,
              severity: ErrorSeverity.HIGH,
              userFriendly: true,
              details: { originalError: appError.details }
            }
          );
        }
      }

      // إغلاق الاتصال
      ssh.end();

      // حذف ملف المفتاح المؤقت
      try {
        await rm(tempKeyFile, { force: true });
      } catch (error: unknown) {
        console.error('خطأ في حذف ملف المفتاح المؤقت:', (error as Error)?.message || String(error));
      }

      // تحديث سجل النشر بالنجاح
      const updatedLog = await storage.updateLog(
        deploymentLog.id,
        'success',
        `تم النشر بنجاح إلى ${server.name}`,
        commandOutput,
        new Date().toISOString()
      );

      return {
        success: true,
        message: 'تم النشر بنجاح',
        details: commandOutput,
        log: updatedLog
      };
    } catch (error: unknown) {
      const appError = convertJavaScriptError(error as Error);
      
      // حذف ملف المفتاح المؤقت في حالة الخطأ
      try {
        await rm(tempKeyFile, { force: true });
      } catch (rmError: unknown) {
        console.error('خطأ في حذف ملف المفتاح المؤقت:', rmError);
      }

      // تحديث سجل النشر بالفشل
      const updatedLog = await storage.updateLog(
        deploymentLog.id,
        'failure',
        `فشل في النشر: ${appError.message}`,
        JSON.stringify({ error: appError.details || appError.message, stack: (error as Error)?.stack }),
        new Date().toISOString()
      );

      return {
        success: false,
        message: `فشل في نشر التطبيق: ${appError.message}`,
        details: JSON.stringify({ error: appError.details || appError.message, stack: (error as Error)?.stack }),
        log: updatedLog
      };
    }
  }

  /**
   * النشر باستخدام المصادقة بكلمة المرور
   */
  private static async deployWithPassword(
    server: DeploymentServer,
    packagePath: string,
    deploymentLog: DeploymentLog
  ): Promise<DeploymentResult> {
    const { host, port, username } = server;
    
    // التحقق من صحة مسار النشر
    const safeDeployPath = validateDeployPath(server.deployPath);

    const ssh = new SSHClient();

    try {
      // انتظار اتصال SSH
      await new Promise<void>((resolve, reject) => {
        ssh.on('ready', () => {
          resolve();
        }).on('error', (err: any) => {
          reject(new Error(`فشل في الاتصال بالخادم: ${err.message}`));
        }).connect({
          host,
          port: port || 22,
          username,
          password: server.password || '',
          readyTimeout: 30000
        });
      });

      // إنشاء مجلد النشر إذا لم يكن موجوداً مع هروب آمن للمسار
      await this.executeSshCommand(ssh, `mkdir -p ${escapeShellArg(safeDeployPath)}`);

      // رفع ملف النشر
      await this.uploadFile(ssh, packagePath, `${safeDeployPath}/deployment.tar.gz`, server);

      // فك ضغط الملف على الخادم مع هروب آمن للمسار
      await this.executeSshCommand(ssh, `cd ${escapeShellArg(safeDeployPath)} && tar -xzf deployment.tar.gz`);

      // حذف ملف النشر المضغوط مع هروب آمن للمسار
      await this.executeSshCommand(ssh, `rm ${escapeShellArg(safeDeployPath)}/deployment.tar.gz`);

      // تنفيذ أوامر ما بعد النشر مع التحقق الأمني
      let commandOutput = '';
      if (server.commands) {
        try {
          const sanitizedCommand = sanitizeCommand(server.commands);
          commandOutput = await this.executeSshCommand(ssh, `cd ${escapeShellArg(safeDeployPath)} && ${sanitizedCommand}`);
        } catch (sanitizeError: unknown) {
          const appError = convertJavaScriptError(sanitizeError as Error);
          throw createError(
            ErrorCategory.BUSINESS_LOGIC,
            'COMMAND_SANITIZATION_FAILED',
            `أمر غير آمن تم رفضه: ${appError.message}`,
            {
              messageAr: `الأمر غير آمن ولا يمكن تنفيذه: ${appError.message}`,
              severity: ErrorSeverity.HIGH,
              userFriendly: true,
              details: { originalError: appError.details }
            }
          );
        }
      }

      // إغلاق الاتصال
      ssh.end();

      // تحديث سجل النشر بالنجاح
      const updatedLog = await storage.updateLog(
        deploymentLog.id,
        'success',
        `تم النشر بنجاح إلى ${server.name}`,
        commandOutput,
        new Date().toISOString()
      );

      return {
        success: true,
        message: 'تم النشر بنجاح',
        details: commandOutput,
        log: updatedLog
      };
    } catch (error: unknown) {
      const appError = convertJavaScriptError(error as Error);
      
      // تحديث سجل النشر بالفشل
      const updatedLog = await storage.updateLog(
        deploymentLog.id,
        'failure',
        `فشل في النشر: ${appError.message}`,
        JSON.stringify({ error: appError.details || appError.message, stack: (error as Error)?.stack }),
        new Date().toISOString()
      );

      return {
        success: false,
        message: `فشل في نشر التطبيق: ${appError.message}`,
        details: JSON.stringify({ error: appError.details || appError.message, stack: (error as Error)?.stack }),
        log: updatedLog
      };
    }
  }

  /**
   * تنفيذ أمر عبر SSH
   */
  private static async executeSshCommand(
    ssh: SSHClient,
    command: string
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      ssh.exec(command, (err, stream) => {
        if (err) return reject(err);

        let output = '';
        let errorOutput = '';

        stream.on('data', (data: Buffer | string) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data: Buffer | string) => {
          errorOutput += data.toString();
        });

        stream.on('close', (code: number | null) => {
          if (code !== 0) {
            reject(new Error(`فشل تنفيذ الأمر (${code}): ${errorOutput || output}`));
          } else {
            resolve(output);
          }
        });
      });
    });
  }

  /**
   * رفع ملف عبر SSH
   */
  private static async uploadFile(
    ssh: SSHClient,
    localPath: string,
    remotePath: string,
    server: DeploymentServer
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ssh.sftp((err, sftp) => {
        if (err) return reject(err);

        const readStream = fs.createReadStream(localPath);
        const writeStream = sftp.createWriteStream(remotePath);

        // معالجة الأحداث
        writeStream.on('close', () => {
          resolve();
        });

        writeStream.on('error', (err: Error) => {
          reject(createError(
            ErrorCategory.FILE_SYSTEM,
            'FILE_UPLOAD_FAILED',
            `فشل في رفع الملف: ${err.message}`,
            {
              messageAr: `فشل في رفع الملف عبر SSH: ${err.message}`,
              severity: ErrorSeverity.HIGH,
              userFriendly: false,
              details: { originalError: err.name, server: server.name }
            }
          ));
        });

        // بدء عملية الرفع
        readStream.pipe(writeStream);
      });
    });
  }

  /**
   * اختبار الاتصال بالخادم
   */
  static async testConnection(server: DeploymentServer): Promise<{ success: boolean; message: string }> {
    const { host, port, username, authType } = server;

    const ssh = new SSHClient();

    try {
      // محاولة الاتصال
      await new Promise<void>((resolve, reject) => {
        ssh.on('ready', () => {
          resolve();
        }).on('error', (err: any) => {
          reject(new Error(`فشل في الاتصال بالخادم: ${err.message}`));
        });

        // الاتصال بناءً على نوع المصادقة
        if (authType === 'key' && server.privateKey) {
          // إنشاء ملف مؤقت للمفتاح الخاص
          const tempKeyFile = path.join(os.tmpdir(), `ssh-key-${crypto.randomBytes(8).toString('hex')}`);
          fs.writeFileSync(tempKeyFile, server.privateKey, { mode: 0o600 });

          ssh.connect({
            host,
            port: port || 22,
            username,
            privateKey: fs.readFileSync(tempKeyFile),
            readyTimeout: 10000
          });

          // حذف ملف المفتاح المؤقت
          setTimeout(() => {
            try {
              fs.unlinkSync(tempKeyFile);
            } catch (error: unknown) {
              console.error('خطأ في حذف ملف المفتاح المؤقت:', (error as Error)?.message || String(error));
            }
          }, 1000);
        } else if (authType === 'password' && server.password) {
          ssh.connect({
            host,
            port: port || 22,
            username,
            password: server.password,
            readyTimeout: 10000
          });
        } else {
          reject(new Error('طريقة المصادقة غير صالحة أو ناقصة'));
        }
      });

      // إغلاق الاتصال
      ssh.end();

      return {
        success: true,
        message: `تم الاتصال بنجاح بالخادم ${server.name}`
      };
    } catch (error: unknown) {
      const appError = convertJavaScriptError(error as Error);
      
      // إغلاق الاتصال في حالة الخطأ
      try {
        ssh.end();
      } catch (e: unknown) {
        // تجاهل الخطأ
      }

      return {
        success: false,
        message: `فشل الاتصال: ${appError.message}`
      };
    }
  }
}