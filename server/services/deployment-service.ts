import { Client as SSHClient } from 'ssh2';
import { DeploymentServer, DeploymentLog } from '@shared/schema';
import { storage } from '../storage';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as child_process from 'child_process';
import { promisify } from 'util';

const exec = promisify(child_process.exec);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdtemp = promisify(fs.mkdtemp);
const rm = promisify(fs.rm);

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
        throw new Error('طريقة المصادقة غير صالحة أو ناقصة');
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
      } catch (error) {
        console.error('خطأ في حذف الملفات المؤقتة:', error);
      }

      return result;
    } catch (error) {
      console.error('خطأ في عملية النشر:', error);
      
      // تحديث سجل النشر بالخطأ
      let updatedLog: DeploymentLog;
      try {
        updatedLog = await storage.updateLog(
          deploymentLog.id,
          'failure',
          `فشل في النشر: ${error.message}`,
          error.stack,
          new Date().toISOString()
        );
      } catch (updateError) {
        console.error('خطأ في تحديث سجل النشر:', updateError);
        updatedLog = deploymentLog;
      }

      return {
        success: false,
        message: `فشل في نشر التطبيق: ${error.message}`,
        details: error.stack,
        log: updatedLog
      };
    }
  }

  /**
   * إعداد حزمة النشر (ملف مضغوط مؤقت)
   */
  private static async prepareDeploymentPackage(sourceDir: string, excludeFiles: string[] = []): Promise<string> {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'deploy-'));
    const outputFile = path.join(tempDir, 'deployment.tar.gz');
    
    // بناء قائمة الملفات المستثناة
    const excludeArgs = excludeFiles.map(file => `--exclude="${file}"`).join(' ');
    
    // تنفيذ أمر tar لإنشاء الأرشيف
    const tarCommand = `tar -czf "${outputFile}" -C "${sourceDir}" ${excludeArgs} .`;
    
    try {
      await exec(tarCommand);
      return outputFile;
    } catch (error) {
      throw new Error(`فشل في إنشاء حزمة النشر: ${error.message}`);
    }
  }

  /**
   * النشر باستخدام المصادقة بالمفتاح
   */
  private static async deployWithKey(
    server: DeploymentServer,
    packagePath: string,
    deploymentLog: DeploymentLog
  ): Promise<DeploymentResult> {
    const { host, port, username, deployPath } = server;
    
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
        }).on('error', (err) => {
          reject(new Error(`فشل في الاتصال بالخادم: ${err.message}`));
        }).connect({
          host,
          port: port || 22,
          username,
          privateKey: privateKeyContent,
          readyTimeout: 30000
        });
      });
      
      // إنشاء مجلد النشر إذا لم يكن موجوداً
      await this.executeSshCommand(ssh, `mkdir -p ${deployPath}`);
      
      // رفع ملف النشر
      await this.uploadFile(ssh, packagePath, `${deployPath}/deployment.tar.gz`, server);
      
      // فك ضغط الملف على الخادم
      await this.executeSshCommand(ssh, `cd ${deployPath} && tar -xzf deployment.tar.gz`);
      
      // حذف ملف النشر المضغوط
      await this.executeSshCommand(ssh, `rm ${deployPath}/deployment.tar.gz`);
      
      // تنفيذ أوامر ما بعد النشر
      let commandOutput = '';
      if (server.commands) {
        commandOutput = await this.executeSshCommand(ssh, `cd ${deployPath} && ${server.commands}`);
      }
      
      // إغلاق الاتصال
      ssh.end();
      
      // حذف ملف المفتاح المؤقت
      await rm(tempKeyFile, { force: true });
      
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
    } catch (error) {
      // حذف ملف المفتاح المؤقت في حالة الخطأ
      try {
        await rm(tempKeyFile, { force: true });
      } catch (rmError) {
        console.error('خطأ في حذف ملف المفتاح المؤقت:', rmError);
      }
      
      // تحديث سجل النشر بالفشل
      const updatedLog = await storage.updateLog(
        deploymentLog.id,
        'failure',
        `فشل في النشر: ${error.message}`,
        error.stack,
        new Date().toISOString()
      );
      
      return {
        success: false,
        message: `فشل في نشر التطبيق: ${error.message}`,
        details: error.stack,
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
    const { host, port, username, deployPath } = server;
    
    const ssh = new SSHClient();
    
    try {
      // انتظار اتصال SSH
      await new Promise<void>((resolve, reject) => {
        ssh.on('ready', () => {
          resolve();
        }).on('error', (err) => {
          reject(new Error(`فشل في الاتصال بالخادم: ${err.message}`));
        }).connect({
          host,
          port: port || 22,
          username,
          password: server.password || '',
          readyTimeout: 30000
        });
      });
      
      // إنشاء مجلد النشر إذا لم يكن موجوداً
      await this.executeSshCommand(ssh, `mkdir -p ${deployPath}`);
      
      // رفع ملف النشر
      await this.uploadFile(ssh, packagePath, `${deployPath}/deployment.tar.gz`, server);
      
      // فك ضغط الملف على الخادم
      await this.executeSshCommand(ssh, `cd ${deployPath} && tar -xzf deployment.tar.gz`);
      
      // حذف ملف النشر المضغوط
      await this.executeSshCommand(ssh, `rm ${deployPath}/deployment.tar.gz`);
      
      // تنفيذ أوامر ما بعد النشر
      let commandOutput = '';
      if (server.commands) {
        commandOutput = await this.executeSshCommand(ssh, `cd ${deployPath} && ${server.commands}`);
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
    } catch (error) {
      // تحديث سجل النشر بالفشل
      const updatedLog = await storage.updateLog(
        deploymentLog.id,
        'failure',
        `فشل في النشر: ${error.message}`,
        error.stack,
        new Date().toISOString()
      );
      
      return {
        success: false,
        message: `فشل في نشر التطبيق: ${error.message}`,
        details: error.stack,
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
        
        stream.on('data', (data) => {
          output += data.toString();
        });
        
        stream.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        stream.on('close', (code) => {
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
        
        writeStream.on('error', (err) => {
          reject(new Error(`فشل في رفع الملف: ${err.message}`));
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
        }).on('error', (err) => {
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
            } catch (error) {
              console.error('خطأ في حذف ملف المفتاح المؤقت:', error);
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
    } catch (error) {
      // إغلاق الاتصال في حالة الخطأ
      try {
        ssh.end();
      } catch (e) {
        // تجاهل الخطأ
      }
      
      return {
        success: false,
        message: `فشل الاتصال: ${error.message}`
      };
    }
  }
}