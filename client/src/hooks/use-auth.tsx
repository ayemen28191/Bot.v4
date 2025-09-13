import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { initializeLanguageSystem, clearLanguageOnLogout } from "@/lib/i18n";
import { initializeThemeSystem, clearThemeOnLogout } from "@/lib/themeSystem";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Initialize language and theme systems when user data changes
  useEffect(() => {
    if (user) {
      initializeLanguageSystem(user);
      initializeThemeSystem(user);
    }
  }, [user]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      // Initialize language system immediately with user data
      console.log('Login successful, initializing language system with user:', user);
      initializeLanguageSystem(user);
      // Initialize theme system immediately with user data
      console.log('Login successful, initializing theme system with user:', user);
      initializeThemeSystem(user);
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: `مرحباً ${user.displayName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل تسجيل الدخول",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      // Initialize language system immediately with user data
      console.log('Registration successful, initializing language system with user:', user);
      initializeLanguageSystem(user);
      // Initialize theme system immediately with user data
      console.log('Registration successful, initializing theme system with user:', user);
      initializeThemeSystem(user);
      toast({
        title: "تم إنشاء الحساب بنجاح",
        description: `مرحباً ${user.displayName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل إنشاء الحساب",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      // Clear language data and reset to English on logout
      console.log('Logout successful, clearing language data and resetting to English');
      clearLanguageOnLogout();
      // Clear theme data and reset to system on logout
      console.log('Logout successful, clearing theme data and resetting to system');
      clearThemeOnLogout();
      toast({
        title: "تم تسجيل الخروج بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل تسجيل الخروج",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
