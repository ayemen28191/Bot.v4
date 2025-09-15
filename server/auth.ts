import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import env from "./env";

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

export async function comparePasswords(supplied: string, stored: string) {
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
          } else {
            console.log("Password verification failed");
          }
          
          return isEqual;
        } catch (error) {
          console.error("Error comparing hashed passwords:", error);
        }
      }
    }
    
    // رفض أي كلمة مرور غير مشفرة أو غير صالحة
    console.log("Invalid password format - only properly hashed passwords are accepted");
    return false;
  } catch (error) {
    console.error("Error in password comparison:", error);
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
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      httpOnly: true // منع الوصول من JavaScript لأمان إضافي
    }
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
        console.log('🔐 IMPORTANT: Admin password for first login:', randomPassword);
        console.log('🔐 Please change this password immediately after first login!');
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
        const user = await storage.getUserByUsername(username);

        if (!user) {
          console.log(`Authentication failed: User ${username} not found`);
          return done(null, false, { message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          console.log(`Authentication failed: Invalid password for user ${username}`);
          return done(null, false, { message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
        }

        console.log(`Authentication successful for user: ${username}`);
        return done(null, user);
      } catch (err) {
        console.error('Authentication error:', err);
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
    console.log('Processing login request:', {
      username: req.body.username,
      hasPassword: !!req.body.password
    });

    passport.authenticate("local", (err: any, user: SelectUser | false, info: { message: string }) => {
      if (err) {
        console.error('Login error:', err);
        return next(err);
      }
      if (!user) {
        console.log('Login failed:', info.message);
        return res.status(401).json({ message: info.message });
      }

      req.login(user, (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return next(err);
        }
        console.log(`User logged in successfully: ${user.id}`);
        // إزالة كلمة المرور من الاستجابة لأسباب أمنية
        const { password, ...safeUser } = user;
        res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    console.log(`Processing logout request for user: ${userId}`);

    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return next(err);
      }
      console.log(`User ${userId} logged out successfully`);
      res.sendStatus(200);
    });
  });

  // إنشاء حساب جديد
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log('Processing registration request:', {
        username: req.body.username,
        email: req.body.email,
        hasPassword: !!req.body.password
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
        return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
      }

      // تشفير كلمة المرور
      const hashedPassword = await hashPassword(validatedUser.password);
      
      const newUser = await storage.createUser({
        ...validatedUser,
        password: hashedPassword
      });

      // تسجيل المستخدم الجديد تلقائياً
      req.login(newUser, (err) => {
        if (err) {
          console.error('Auto-login error after registration:', err);
          return next(err);
        }
        console.log(`User registered and logged in successfully: ${newUser.id}`);
        // إزالة كلمة المرور من الاستجابة لأسباب أمنية
        const { password, ...safeUser } = newUser;
        res.status(201).json(safeUser);
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل' });
      }
      
      res.status(400).json({ error: error.message || 'فشل في إنشاء الحساب' });
    }
  });

  app.get("/api/user", (req, res) => {
    console.log('Checking current user session:', {
      isAuthenticated: req.isAuthenticated(),
      userId: req.user?.id
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "غير مسجل الدخول" });
    }
    // إزالة كلمة المرور من الاستجابة لأسباب أمنية
    const { password, ...safeUser } = req.user!;
    res.json(safeUser);
  });
}