# نظام التداول المالي 

نظام تداول مالي شامل مبني بـ React و Express يوفر إشارات التداول المتقدمة ولوحة تحكم إدارية.

## 🏗️ هيكل المشروع (محدث - ديسمبر 2024)

```
client/
├── src/
│   ├── features/           # ميزات المشروع الرئيسية
│   │   ├── admin/          # مكونات الإدارة
│   │   │   ├── AdminBottomNav.tsx
│   │   │   ├── AdminSidebar.tsx  
│   │   │   ├── AdminDashboardStats.tsx
│   │   │   └── index.ts    # ملف التصدير
│   │   ├── trading/        # مكونات التداول
│   │   │   ├── SignalIndicator.tsx
│   │   │   ├── MarketStatus.tsx
│   │   │   ├── MarketClosedAlert.tsx
│   │   │   ├── ProbabilityHeatmap.tsx
│   │   │   ├── TimeframeButtons.tsx
│   │   │   └── index.ts    # ملف التصدير
│   │   ├── deployment/     # مكونات النشر
│   │   │   ├── DeploymentProgressBar.tsx
│   │   │   └── index.ts    # ملف التصدير
│   │   └── index.ts        # ملف التصدير الرئيسي
│   ├── layouts/            # تخطيطات الصفحات
│   │   ├── AdminLayout.tsx
│   │   └── index.ts        # ملف التصدير
│   ├── components/         # مكونات مشتركة عامة
│   │   ├── ui/             # مكونات واجهة المستخدم
│   │   ├── ConnectionError.tsx
│   │   ├── ErrorMessage.tsx
│   │   ├── ErrorTranslator.tsx
│   │   ├── Header.tsx
│   │   ├── OfflineModeNotice.tsx
│   │   ├── SystemUpdater.tsx
│   │   └── index.ts        # ملف التصدير
│   ├── pages/              # صفحات التطبيق
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminDashboardNew.tsx
│   │   ├── AdminLogin.tsx
│   │   ├── TradingSignalPage.tsx
│   │   └── ...
│   ├── hooks/              # خطافات React
│   ├── lib/                # مكتبات وأدوات مساعدة
│   ├── store/              # إدارة الحالة
│   └── App.tsx
server/
├── routes/                 # مسارات API
├── middleware/             # وسطاء Express
├── utils/                  # أدوات مساعدة للخادم
└── index.ts               # نقطة دخول الخادم
```

## 📋 مبادئ هيكلة المشروع

### 1. التنظيم حسب الميزات (Feature-First)
- كل ميزة رئيسية في مجلدها الخاص تحت `features/`
- المكونات العامة المشتركة في `components/`
- التخطيطات في `layouts/`

### 2. ملفات التصدير (Barrel Files)
- كل مجلد يحتوي على `index.ts` لتصدير محتوياته
- يسهل الاستيراد ويحسن من تنظيم الكود
- مثال: `import { AdminSidebar, AdminBottomNav } from '@/features/admin'`

### 3. فصل الاهتمامات
- **features/admin**: كل ما يتعلق بالإدارة والتحكم
- **features/trading**: إشارات التداول والتحليل المالي  
- **features/deployment**: عمليات النشر والخوادم
- **layouts**: تخطيطات الصفحات
- **components**: مكونات عامة ومشتركة

## 📊 نمذجة البيانات

### مخطط قاعدة البيانات (shared/schema.ts)
جميع نماذج البيانات يجب تعريفها في `shared/schema.ts` باستخدام Drizzle ORM:

```typescript
// تعريف الجدول
export const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  username: text('username').notNull(),
  email: text('email').notNull()
});

// مخطط الإدراج باستخدام drizzle-zod
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;
```

### واجهة التخزين (server/storage.ts)
جميع عمليات CRUD يجب أن تمر عبر واجهة التخزين:

```typescript
interface IStorage {
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
}
```

## 🔧 قواعد الاستيراد والتصدير

### استيراد المكونات:

```typescript
// ✅ صحيح - استيراد من ملفات التصدير
import { AdminSidebar, AdminBottomNav } from '@/features/admin';
import { SignalIndicator, MarketStatus } from '@/features/trading';
import { AdminLayout } from '@/layouts';

// ❌ خطأ - استيراد مباشر
import AdminSidebar from '@/features/admin/AdminSidebar';
```

### تصدير المكونات:

```typescript
// في ملف index.ts
export { AdminSidebar } from './AdminSidebar';
export { AdminBottomNav } from './AdminBottomNav';
```

## 🚫 الملفات المحذوفة والمدمجة

تم حذف الملفات التالية لإزالة التكرار:
- `AdminDashboard.tsx` (الإصدار القديم - تم الاحتفاظ بـ AdminDashboardNew.tsx)
- `ErrorTranslatorExample.tsx` 
- `ErrorTranslatorPage.tsx`
- `NewAdminLayout.tsx` (تم دمجه مع AdminLayout)

**ملاحظة**: `ErrorTranslator.tsx` لا يزال موجوداً كمكون مشترك عام.

## 🔐 قواعد الأمان

- عدم تعريض أو اختلاق أسرار الحماية
- طلب مفاتيح API الحقيقية من المستخدم
- عدم طباعة أسرار الحماية في السجلات
- احترام حقوق الطبع والنشر للمحتوى الإعلامي

## 🎨 التصميم والثيمات

### إعداد الألوان والثيمات
استخدم `theme.json` لتخصيص الألوان بدلاً من `index.css`:

```json
{
  "primary": "#3b82f6",
  "variant": "professional",
  "appearance": "system",
  "radius": 0.5
}
```

### الوضع المظلم
التطبيق يدعم الوضع المظلم تلقائياً. استخدم التصنيفات المناسبة:
```css
className="bg-white dark:bg-black text-black dark:text-white"
```

## 🛠️ أنماط React Query و API

### استخدام TanStack Query v5
```typescript
// ✅ صحيح - الشكل الكائني
const { data, isLoading } = useQuery({ 
  queryKey: ['/api/users', userId],
  enabled: !!userId 
});

// المتحورات مع إبطال الكاش
const mutation = useMutation({
  mutationFn: (data) => apiRequest('/api/users', { method: 'POST', body: data }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/users'] })
});
```

### التوجيه مع Wouter
```typescript
import { Link, useLocation } from 'wouter';

// التنقل
<Link href="/admin">لوحة التحكم</Link>

// التحقق من المسار الحالي
const [location] = useLocation();
const isActive = location === '/admin';
```

## ♿ إمكانية الوصول

### خصائص data-testid
يجب إضافة `data-testid` لجميع العناصر التفاعلية:

```typescript
// عناصر تفاعلية
<button data-testid="button-submit">إرسال</button>
<input data-testid="input-email" />
<Link data-testid="link-profile" href="/profile">الملف الشخصي</Link>

// عناصر عرض
<div data-testid="text-username">{user.name}</div>
<img data-testid="img-avatar" src={avatar} />

// عناصر ديناميكية  
<div data-testid={`card-product-${productId}`}>
```

## 🧪 اختبار التطبيق

للتأكد من عمل التطبيق بشكل صحيح:

1. **تشغيل الخادم**: `npm run dev`
2. **فحص الصفحات**: التنقل بين الصفحات المختلفة
3. **اختبار الميزات**: التأكد من عمل إشارات التداول ولوحة الإدارة
4. **فحص المراجع**: التأكد من عدم وجود أخطاء في الاستيراد

## 📚 مراجع مفيدة

- [دليل React](https://react.dev)
- [دليل Express.js](https://expressjs.com)
- [دليل TypeScript](https://typescriptlang.org)
- [مكونات shadcn/ui](https://ui.shadcn.com)

## 🔄 سجل التحديثات

### ديسمبر 2024 - إعادة الهيكلة الكاملة
- ✅ إنشاء هيكل feature-first
- ✅ دمج المكونات المتكررة  
- ✅ إنشاء ملفات التصدير (barrel files)
- ✅ إصلاح جميع المراجع المكسورة
- ✅ حذف الملفات غير المستخدمة
- ✅ توحيد قواعد الاستيراد والتصدير

---

**ملاحظة مهمة**: هذا المشروع تم إعادة هيكلته بالكامل لضمان التنظيم والوضوح وسهولة الصيانة. يرجى اتباع قواعد الهيكلة المذكورة أعلاه عند إضافة ميزات جديدة.