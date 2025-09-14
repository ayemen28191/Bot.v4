import { useContext } from 'react';

// AuthContext will be created in App.tsx
let AuthContext: React.Context<any> | null = null;

// Set AuthContext after it's created
export const setAuthContext = (context: React.Context<any>) => {
  AuthContext = context;
};

export function useAuth() {
  if (!AuthContext) {
    console.warn('AuthContext not set, returning default values');
    return {
      user: null,
      isLoading: false,
      error: null,
      login: async () => { throw new Error('Authentication not initialized'); },
      logout: async () => { throw new Error('Authentication not initialized'); },
      register: async () => { throw new Error('Authentication not initialized'); },
      setUser: () => {},
    };
  }

  const context = useContext(AuthContext);

  if (!context) {
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