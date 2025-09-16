import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import env from "./env";
import { logsService } from "./services/logs-service";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string, username?: string) {
  try {
    // فقط التحقق من كلمات المرور المشفرة بتنسيق [hash].[salt]
    if (stored && stored.includes(".")) {
      const [hashed, salt] = stored.split(".");
      
      if (hashed && salt) {
        try {
          const hashedBuf = Buffer.from(hashed, "hex");
          const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
          const isEqual = timingSafeEqual(hashedBuf, suppliedBuf);
          
          if (isEqual) {
            console.log("Password verification successful");
            if (username) {
              await logsService.debug("auth", `Password verification successful for user: ${username}`, {
                action: "password_verification",
                username,
                status: "success"
              });
            }
          } else {
            console.log("Password verification failed");
            if (username) {
              await logsService.warn("auth", `Password verification failed for user: ${username}`, {
                action: "password_verification",
                username,
                status: "failed",
                reason: "invalid_password"
              });
            }
          }
          
          return isEqual;
        } catch (error) {
          console.error("Error comparing hashed passwords:", error);
          if (username) {
            await logsService.error("auth", `Error during password comparison for user: ${username}`, {
              action: "password_verification",
              username,
              status: "error",
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
    }
    
    // رفض أي كلمة مرور غير مشفرة أو غير صالحة
    console.log("Invalid password format - only properly hashed passwords are accepted");
    if (username) {
      await logsService.debug("auth", "Invalid password format detected", {
        action: "password_verification",
        status: "failed",
        reason: "invalid_format"
      });
    }
    return false;
  } catch (error) {
    console.error("Error in password comparison:", error);
    if (username) {
      await logsService.error("auth", `Critical error in password comparison for user: ${username}`, {
        action: "password_verification",
        username,
        status: "error",
        error: error instanceof Error ? error.message : String(error)
      });
    }
    return false;
  }
}

export function setupAuth(app: Express) {
  console.log('Setting up authentication middleware...');

  const sessionSettings: session.SessionOptions = {
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: env.NODE_ENV === 'production', // آمن في الإنتاج فقط
      maxAge: 24 * 60 * 60 * 1000, // 24 ساعة - توازن بين الأمان والراحة
      sameSite: 'lax',
      httpOnly: true // منع الوصول من JavaScript لأمان إضافي
    },
    // إضافة إعدادات لتحسين استقرار الجلسة
    rolling: true, // تجديد الجلسة مع كل طلب
    name: 'binar.sid', // اسم مخصص لملف تعريف الارتباط
    // إضافة إعدادات للاستقرار
    proxy: true, // للعمل مع Replit proxy
    unset: 'keep' // الاحتفاظ بالجلسة حتى لو لم تتغير
  };

  console.log('Session settings configured:', {
    secure: sessionSettings.cookie?.secure,
    maxAge: sessionSettings.cookie?.maxAge,
    sameSite: sessionSettings.cookie?.sameSite
  });

  app.set("trust proxy", 1);
  
  // إنشاء session middleware وحفظه للاستخدام مع Socket.IO
  const sessionMiddleware = session(sessionSettings);
  app.use(sessionMiddleware);
  
  // حفظ session middleware في app للوصول إليه من Socket.IO
  app.set('sessionMiddleware', sessionMiddleware);
  
  app.use(passport.initialize());
  app.use(passport.session());

  // التحقق من صلاحيات المستخدم فقط دون تغيير كلمة المرور
  async function verifyUserPasswordFormat(username: string): Promise<boolean> {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) return false;
      
      // التحقق من وجود كلمة المرور فقط
      if (!user.password) {
        console.log(`Missing password for user ${username}`);
        return false;
      }
      
      // لا نقوم بإعادة تعيين كلمات المرور تلقائيًا - نسمح بأي تنسيق لكلمات المرور
      console.log(`User ${username} password verification passed`);
      return true;
    } catch (error) {
      console.error(`Error verifying password format for ${username}:`, error);
      return false;
    }
  }
  
  // إضافة حساب المسؤول إذا لم يكن موجوداً
  (async () => {
    try {
      console.log('Checking for admin account...');
      const admin = await storage.getUserByUsername('admin');
      if (!admin) {
        console.log('Creating admin account...');
        // إنشاء كلمة مرور عشوائية قوية للمدير
        const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + Math.random().toString(36).slice(-4);
        const hashedPassword = await hashPassword(randomPassword);
        await storage.createUser({
          username: 'admin',
          password: hashedPassword,
          displayName: 'Administrator',
          email: 'admin@example.com',
          isAdmin: true
        });
        console.log('Admin account created successfully');
        console.log('🔐 SECURITY: Admin password has been generated and stored securely');
        console.log('🔐 Use password reset functionality to set a new admin password');
        
        // Log admin creation event securely (without password)
        await logsService.info("auth", "Admin account created during system initialization", {
          action: "admin_account_created",
          username: "admin",
          email: "admin@example.com"
        });
      } else {
        console.log('Admin account already exists');
        
        // التحقق من صحة تنسيق كلمة مرور المشرف وإصلاحها إذا لزم الأمر
        await verifyUserPasswordFormat('admin');
      }
      
      // التحقق من صحة تنسيق كلمات مرور جميع المستخدمين
      await verifyUserPasswordFormat('admin');
      await verifyUserPasswordFormat('asoof55');
      
      // التحقق من أي مستخدمين آخرين
      try {
        console.log('Fixing all user passwords format...');
        const allUsers = await storage.getAllUsers();
        for (const user of allUsers) {
          if (user.username !== 'admin') { // لأننا قمنا بالفعل بفحص المشرف
            await verifyUserPasswordFormat(user.username);
          }
        }
        console.log('All user passwords format verification complete');
      } catch (error) {
        console.error('Error verifying all users password format:', error);
      }
      
    } catch (error) {
      console.error('Error checking/creating admin account:', error);
    }
  })();

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Attempting authentication for user: ${username}`);
        await logsService.info("auth", `Login attempt for user: ${username}`, {
          action: "login_attempt",
          username,
          timestamp: new Date().toISOString()
        });

        const user = await storage.getUserByUsername(username);

        if (!user) {
          console.log(`Authentication failed: User ${username} not found`);
          await logsService.warn("auth", `Login failed: User not found - ${username}`, {
            action: "login_failed",
            username,
            reason: "user_not_found",
            timestamp: new Date().toISOString()
          });
          return done(null, false, { message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
        }

        const isValid = await comparePasswords(password, user.password, username);
        if (!isValid) {
          console.log(`Authentication failed: Invalid password for user ${username}`);
          await logsService.warn("auth", `Login failed: Invalid credentials for user - ${username}`, {
            action: "login_failed",
            username,
            reason: "invalid_credentials",
            timestamp: new Date().toISOString()
          });
          return done(null, false, { message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
        }

        console.log(`Authentication successful for user: ${username}`);
        await logsService.logUserInfo("auth", `Login successful for user: ${username}`, {
          id: user.id,
          username: user.username,
          displayName: user.displayName
        }, {
          action: "login_success",
          isAdmin: user.isAdmin,
          timestamp: new Date().toISOString()
        });
        return done(null, user);
      } catch (err) {
        console.error('Authentication error:', err);
        await logsService.error("auth", `Authentication error for user: ${username}`, {
          action: "login_error",
          username,
          error: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString()
        });
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`Deserialization failed: User ${id} not found`);
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      console.error('Deserialization error:', err);
      done(err);
    }
  });

  // مسارات المصادقة
  app.post("/api/login", (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    console.log('Processing login request:', {
      username: req.body.username,
      hasPassword: !!req.body.password
    });

    passport.authenticate("local", async (err: any, user: SelectUser | false, info: { message: string }) => {
      if (err) {
        console.error('Login error:', err);
        await logsService.logError("auth", `Login route error: ${err.message}`, {
          action: "login_route_error",
          username: req.body.username,
          clientIP,
          userAgent,
          error: err.message
        });
        return next(err);
      }
      if (!user) {
        console.log('Login failed:', info.message);
        await logsService.logWarn("auth", `Login route failed for user: ${req.body.username}`, {
          action: "login_route_failed",
          username: req.body.username,
          clientIP,
          userAgent,
          reason: info.message
        });
        return res.status(401).json({ message: info.message });
      }

      req.login(user, async (err) => {
        if (err) {
          console.error('Session creation error:', err);
          await logsService.logError("auth", `Session creation failed for user: ${user.username}`, {
            action: "session_creation_failed",
            username: user.username,
            userId: user.id,
            clientIP,
            userAgent,
            error: err.message
          });
          return next(err);
        }
        console.log(`User logged in successfully: ${user.id}`);
        await logsService.logUserInfo("auth", `Session created successfully for user: ${user.username}`, {
          id: user.id,
          username: user.username,
          displayName: user.displayName
        }, {
          action: "session_created",
          isAdmin: user.isAdmin,
          clientIP,
          userAgent
        });
        // إزالة كلمة المرور من الاستجابة لأسباب أمنية
        const { password, ...safeUser } = user;
        res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/logout", async (req, res, next) => {
    const userId = req.user?.id;
    const username = req.user?.username;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    console.log(`Processing logout request for user: ${userId}`);

    req.logout(async (err) => {
      if (err) {
        console.error('Logout error:', err);
        await logsService.logError("auth", `Logout error for user: ${username}`, {
          action: "logout_error",
          username,
          userId,
          clientIP,
          userAgent,
          error: err.message
        });
        return next(err);
      }
      console.log(`User ${userId} logged out successfully`);
      if (userId && username) {
        await logsService.logUserInfo("auth", `User logged out successfully: ${username}`, {
          id: userId,
          username: username,
          displayName: username
        }, {
          action: "logout_success",
          clientIP,
          userAgent
        });
      } else {
        await logsService.logInfo("auth", `User logged out successfully`, {
          action: "logout_success",
          clientIP,
          userAgent
        });
      }
      res.sendStatus(200);
    });
  });

  // إنشاء حساب جديد
  app.post("/api/register", async (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    try {
      console.log('Processing registration request:', {
        username: req.body.username,
        email: req.body.email,
        hasPassword: !!req.body.password
      });

      await logsService.logInfo("auth", `Registration attempt for user: ${req.body.username}`, {
        action: "registration_attempt",
        username: req.body.username,
        email: req.body.email,
        clientIP,
        userAgent
      });

      // التحقق من صحة البيانات مع whitelist للغة
      const validatedUser = {
        username: req.body.username?.trim(),
        password: req.body.password,
        displayName: req.body.displayName?.trim(),
        email: req.body.email?.trim().toLowerCase(),
        isAdmin: req.body.isAdmin || false,
        preferredLanguage: ['en', 'ar', 'hi'].includes(req.body.preferredLanguage) ? req.body.preferredLanguage : 'en'
      };

      // التحقق من الحقول المطلوبة
      if (!validatedUser.username || !validatedUser.password || !validatedUser.displayName || !validatedUser.email) {
        await logsService.logWarn("auth", `Registration failed - missing required fields for: ${req.body.username}`, {
          action: "registration_failed",
          username: req.body.username,
          reason: "missing_required_fields",
          clientIP,
          userAgent
        });
        return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
      }

      // تشفير كلمة المرور
      const hashedPassword = await hashPassword(validatedUser.password);
      
      const newUser = await storage.createUser({
        ...validatedUser,
        password: hashedPassword
      });

      await logsService.logInfo("auth", `User account created successfully: ${newUser.username}`, {
        action: "user_created",
        username: newUser.username,
        userId: newUser.id,
        email: newUser.email,
        isAdmin: newUser.isAdmin,
        clientIP,
        userAgent
      });

      // تسجيل المستخدم الجديد تلقائياً
      req.login(newUser, async (err) => {
        if (err) {
          console.error('Auto-login error after registration:', err);
          await logsService.logError("auth", `Auto-login failed after registration for: ${newUser.username}`, {
            action: "auto_login_failed",
            username: newUser.username,
            userId: newUser.id,
            clientIP,
            userAgent,
            error: err.message
          });
          return next(err);
        }
        console.log(`User registered and logged in successfully: ${newUser.id}`);
        await logsService.logUserInfo("auth", `User registered and auto-logged in successfully: ${newUser.username}`, {
          id: newUser.id,
          username: newUser.username,
          displayName: newUser.displayName
        }, {
          action: "registration_success",
          isAdmin: newUser.isAdmin,
          clientIP,
          userAgent
        });
        // إزالة كلمة المرور من الاستجابة لأسباب أمنية
        const { password, ...safeUser } = newUser;
        res.status(201).json(safeUser);
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.code === 'SQLITE_CONSTRAINT') {
        await logsService.logWarn("auth", `Registration failed - duplicate user/email: ${req.body.username}`, {
          action: "registration_failed",
          username: req.body.username,
          email: req.body.email,
          reason: "duplicate_constraint",
          clientIP,
          userAgent
        });
        return res.status(400).json({ error: 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل' });
      }
      
      await logsService.logError("auth", `Registration error for user: ${req.body.username}`, {
        action: "registration_error",
        username: req.body.username,
        email: req.body.email,
        clientIP,
        userAgent,
        error: error.message || String(error)
      });
      
      res.status(400).json({ error: 'فشل في إنشاء الحساب' });
    }
  });

  app.get("/api/user", async (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    console.log('Checking current user session:', {
      isAuthenticated: req.isAuthenticated(),
      userId: req.user?.id
    });

    if (!req.isAuthenticated()) {
      await logsService.logInfo("auth", "Unauthenticated session check attempt", {
        action: "session_check_unauthenticated",
        clientIP,
        userAgent
      });
      return res.status(401).json({ message: "غير مسجل الدخول" });
    }
    
    await logsService.logUserInfo("auth", `Session check for user: ${req.user!.username}`, {
      id: req.user!.id,
      username: req.user!.username,
      displayName: req.user!.displayName || req.user!.username
    }, {
      action: "session_check_authenticated",
      isAdmin: req.user!.isAdmin,
      clientIP,
      userAgent
    });
    
    // إزالة كلمة المرور من الاستجابة لأسباب أمنية
    const { password, ...safeUser } = req.user!;
    res.json(safeUser);
  });
}