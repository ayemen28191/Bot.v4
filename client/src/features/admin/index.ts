/**
 * ملف تصدير مكونات الإدارة (Admin Feature Barrel File)
 * جميع المكونات المتعلقة بالإدارة والتحكم
 */

export { AdminBottomNav } from './AdminBottomNav';
export { AdminSidebar } from './AdminSidebar';
export { AdminDashboardStats } from './AdminDashboardStats';

// تصدير تكوين التنقل الموحد
export { 
  adminNavItems, 
  getVisibleNavItems, 
  isNavItemActive, 
  getNavItemById, 
  getNavItemByHref, 
  getActiveNavItem 
} from './navConfig';

export type { AdminNavItem } from './navConfig';