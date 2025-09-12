# دليل المطور - نظام التداول المالي

## 🚀 البدء السريع

### متطلبات النظام
- Node.js 18+ 
- npm أو yarn
- TypeScript

### تشغيل المشروع
```bash
npm install
npm run dev
```

## 📁 إرشادات تنظيم الكود

### 1. إضافة ميزة جديدة

عند إضافة ميزة جديدة، اتبع هذه الخطوات:

```bash
# 1. أنشئ مجلد الميزة
mkdir client/src/features/feature-name

# 2. أنشئ المكونات
touch client/src/features/feature-name/ComponentName.tsx

# 3. أنشئ ملف التصدير
touch client/src/features/feature-name/index.ts
```

### 2. قواعد تسمية الملفات

```
✅ صحيح:
- AdminSidebar.tsx (PascalCase للمكونات)
- useAuth.ts (camelCase للخطافات)
- index.ts (ملفات التصدير)

❌ خطأ:
- admin-sidebar.tsx
- AdminSidebar.js  
- Use-Auth.ts
```

### 3. بنية ملف المكون

```typescript
// لا تستورد React صراحة - Vite يقوم بذلك تلقائياً
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

interface ComponentProps {
  // اكتب الخصائص بشكل واضح
  title: string;
  isActive?: boolean;
}

export default function ComponentName({ title, isActive = false }: ComponentProps) {
  return (
    <div className="component-container">
      <h2>{t(title)}</h2>
      {/* محتوى المكون */}
    </div>
  );
}
```

### 4. ملفات التصدير (index.ts)

```typescript
// client/src/features/feature-name/index.ts
export { default as ComponentOne } from './ComponentOne';
export { default as ComponentTwo } from './ComponentTwo';
export type { ComponentOneProps, ComponentTwoProps } from './types';
```

## 🔄 قواعد الاستيراد

### استيراد من الميزات
```typescript
// ✅ صحيح
import { AdminSidebar, AdminBottomNav } from '@/features/admin';
import { SignalIndicator } from '@/features/trading';

// ❌ خطأ
import AdminSidebar from '@/features/admin/AdminSidebar';
import { AdminSidebar } from '@/features/admin/AdminSidebar';
```

### استيراد المكونات العامة
```typescript
// ✅ صحيح
import { Button } from '@/components/ui/button';
import { Header, ErrorMessage } from '@/components';

// ❌ خطأ
import Button from '@/components/ui/button';
```

## 🧪 إرشادات الاختبار

### اختبار المكونات الجديدة
1. تأكد من عمل جميع المراجع
2. اختبر الاستيراد من ملفات التصدير
3. تحقق من عدم وجود أخطاء TypeScript
4. اختبر التطبيق في المتصفح

### فحص الأخطاء الشائعة
```bash
# فحص أخطاء TypeScript
npx tsc --noEmit

# فحص الاستيرادات المكسورة  
npm run dev

# البحث عن مراجع مكسورة
grep -r "../components" client/src/
```

## 🚫 أشياء يجب تجنبها

## 🔍 فحص المشاكل المتقدمة

### تحذير WebSocket في بيئة التطوير
قد ترى هذا التحذير في المتصفح:
```
[vite] failed to connect to websocket (SecurityError: Failed to construct 'WebSocket': An insecure WebSocket connection may not be initiated from a page loaded over HTTPS.)
```
هذا تحذير طبيعي في بيئة التطوير المأمنة ولا يؤثر على وظائف التطبيق.

### ❌ لا تفعل هذا:
```typescript
// استيراد مباشر من المجلدات العميقة
import Component from '@/features/admin/components/deep/Component';

// خلط أنماط الاستيراد
import { ComponentA } from '@/features/admin';
import ComponentB from '@/features/admin/ComponentB';

// إنشاء مجلدات فرعية معقدة
client/src/features/admin/components/sub/deep/Component.tsx
```

### ✅ افعل هذا:
```typescript
// استيراد موحد من ملفات التصدير
import { ComponentA, ComponentB } from '@/features/admin';

// هيكل مسطح وواضح
client/src/features/admin/ComponentA.tsx
client/src/features/admin/ComponentB.tsx
```

## 🔧 أدوات المطور

### إضافات VS Code المفيدة
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Auto Rename Tag
- Bracket Pair Colorizer

### إعدادات مفيدة
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.suggest.autoImports": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

## 📚 مراجع سريعة

### مجلدات المشروع
- `features/admin/` - إدارة المستخدمين والنظام
- `features/trading/` - إشارات التداول والتحليل  
- `features/deployment/` - عمليات النشر
- `layouts/` - تخطيطات الصفحات
- `components/` - مكونات مشتركة عامة

### الملفات المهمة
- `App.tsx` - نقطة دخول التطبيق
- `replit.md` - معلومات المشروع
- `README.md` - دليل المشروع
- `package.json` - تبعيات المشروع

## 🐛 حل المشاكل الشائعة

### خطأ "Cannot resolve import"
```bash
# تحقق من وجود ملف index.ts
ls client/src/features/feature-name/

# تحقق من محتوى ملف التصدير
cat client/src/features/feature-name/index.ts

# تحقق من مسار الاستيراد
grep -n "feature-name" client/src/pages/PageName.tsx
```

### خطأ "Module not found"
```bash
# إعادة تشغيل الخادم
npm run dev

# مسح cache
rm -rf node_modules/.cache
npm install
```

---

**تذكر**: الهدف من هذا الهيكل هو جعل الكود منظماً وسهل الصيانة. اتبع هذه الإرشادات دائماً عند إضافة كود جديد.