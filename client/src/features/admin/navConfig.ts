import { LucideIcon } from 'lucide-react';
import { 
  LayoutDashboard,
  Users,
  KeyRound,
  Server,
  TestTube,
  FileText,
  Settings
} from 'lucide-react';

export interface AdminNavItem {
  id: string;
  href: string;
  icon: LucideIcon;
  labelKey: string;
  labelArabic: string;
  testId: string;
  isVisible: boolean;
  order: number;
}

// تكوين موحد لجميع عناصر التنقل في لوحة الإدارة
export const adminNavItems: AdminNavItem[] = [
  {
    id: 'dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    labelKey: 'dashboard',
    labelArabic: 'لوحة القيادة',
    testId: 'nav-dashboard',
    isVisible: true,
    order: 1
  },
  {
    id: 'users',
    href: '/admin/users',
    icon: Users,
    labelKey: 'users',
    labelArabic: 'المستخدمين',
    testId: 'nav-users',
    isVisible: true,
    order: 2
  },
  {
    id: 'api-keys',
    href: '/admin/api-keys',
    icon: KeyRound,
    labelKey: 'api_keys',
    labelArabic: 'مفاتيح API',
    testId: 'nav-api-keys',
    isVisible: true,
    order: 3
  },
  {
    id: 'deployment',
    href: '/admin/deployment',
    icon: Server,
    labelKey: 'deployment_servers',
    labelArabic: 'خوادم النشر',
    testId: 'nav-deployment',
    isVisible: true,
    order: 4
  },
  {
    id: 'system-test',
    href: '/admin/system-test',
    icon: TestTube,
    labelKey: 'system_tests',
    labelArabic: 'اختبارات النظام',
    testId: 'nav-system-test',
    isVisible: true,
    order: 5
  },
  {
    id: 'logs',
    href: '/admin/logs',
    icon: FileText,
    labelKey: 'system_logs',
    labelArabic: 'سجلات النظام',
    testId: 'nav-logs',
    isVisible: true,
    order: 6
  }
];

// دالة مساعدة للتحقق من النشاط
export const isNavItemActive = (currentPath: string, itemPath: string): boolean => {
  // الصفحة الرئيسية للإدارة
  if (itemPath === '/admin') {
    return currentPath === '/admin';
  }
  
  // الصفحات الفرعية
  return currentPath.startsWith(itemPath);
};

// دالة لفلترة العناصر المرئية وترتيبها
export const getVisibleNavItems = (): AdminNavItem[] => {
  return adminNavItems
    .filter(item => item.isVisible)
    .sort((a, b) => a.order - b.order);
};

// دالة للحصول على عنصر معين بـ ID
export const getNavItemById = (id: string): AdminNavItem | undefined => {
  return adminNavItems.find(item => item.id === id);
};

// دالة للحصول على عنصر معين بـ href
export const getNavItemByHref = (href: string): AdminNavItem | undefined => {
  return adminNavItems.find(item => item.href === href);
};

// دالة للحصول على العنصر النشط الحالي
export const getActiveNavItem = (currentPath: string): AdminNavItem | undefined => {
  return adminNavItems.find(item => isNavItemActive(currentPath, item.href));
};