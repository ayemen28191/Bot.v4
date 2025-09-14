
const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const scryptAsync = promisify(scrypt);

// دالة تشفير كلمة المرور (مطابقة لما في auth.ts)
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function resetAdminPassword() {
  const newPassword = 'newpassword123';
  const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');
  
  try {
    console.log('🔐 بدء عملية إعادة تعيين كلمة مرور المشرف...');
    
    // تشفير كلمة المرور الجديدة
    const hashedPassword = await hashPassword(newPassword);
    console.log('✅ تم تشفير كلمة المرور الجديدة');
    
    // الاتصال بقاعدة البيانات
    const db = new sqlite3.Database(dbPath);
    
    // تحديث كلمة مرور المشرف
    const updateQuery = `UPDATE users SET password = ? WHERE username = 'admin'`;
    
    db.run(updateQuery, [hashedPassword], function(err) {
      if (err) {
        console.error('❌ خطأ في تحديث كلمة المرور:', err);
        return;
      }
      
      if (this.changes === 0) {
        console.error('❌ لم يتم العثور على المستخدم admin');
      } else {
        console.log('✅ تم تحديث كلمة مرور المشرف بنجاح');
        console.log(`🔑 كلمة المرور الجديدة: ${newPassword}`);
        console.log('🛡️  يرجى تسجيل الدخول باستخدام كلمة المرور الجديدة');
      }
      
      db.close();
    });
    
  } catch (error) {
    console.error('❌ خطأ في العملية:', error);
  }
}

// تشغيل السكربت
resetAdminPassword();
