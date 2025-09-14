import { useContext } from 'react';
import React from 'react';

// AuthContext definition
const AuthContext = React.createContext<any>(null);

export { AuthContext };

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    // في حالة عدم وجود السياق، نُرجع قيماً افتراضية بدلاً من رمي خطأ
    console.warn('useAuth called outside AuthProvider, returning default values');
    return {
      user: null,
      isLoading: false,
      error: null,
      login: async () => { throw new Error('Not authenticated'); },
      logout: async () => { throw new Error('Not authenticated'); },
      register: async () => { throw new Error('Not authenticated'); },
      setUser: () => {},
    };
  }

  return context;
}

// معلومات المستخدم الافتراضية للاختبار
export const mockUser = {
  id: 1,
  username: 'testuser',
  displayName: 'مستخدم تجريبي',
  email: 'test@example.com',
  role: 'user',
  preferredLanguage: 'ar'
};

// دالة مساعدة لتسجيل الدخول التجريبي
export const loginWithMockUser = () => {
  console.log('Mock login with:', mockUser);
  return mockUser;
};