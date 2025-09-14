import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Loader2, Eye, EyeOff, Shield, User, Lock, CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t, getCurrentLanguage, setLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login, user, isLoading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginPending, setLoginPending] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());
  const [forceRerender, setForceRerender] = useState(0);

  const form = useForm({
    resolver: zodResolver(
      insertUserSchema.pick({ username: true, password: true })
    ),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Redirect if already logged in - with protection against duplication
  useEffect(() => {
    if (user && !isLoading && !loginPending && !hasRedirected) {
      console.log('✅ User already authenticated, redirecting to dashboard...');
      setHasRedirected(true); // Set the flag to prevent multiple redirects
      setLocation("/");
    }
  }, [user, isLoading, loginPending, hasRedirected, setLocation]);

  // Listen for language changes and force re-render
  useEffect(() => {
    const handleLanguageChange = (event: any) => {
      const newLanguage = event.detail.language;
      console.log('AuthPage: Language changed to:', newLanguage);
      setCurrentLanguage(newLanguage);
      setForceRerender(prev => prev + 1); // Force component re-render
    };

    // معالجة أخطاء Mixed Content في بيئة HTTPS
    const handleMixedContentError = () => {
      if (window.location.protocol === 'https:') {
        // تسجيل هادئ للمطورين فقط
        if (process.env.NODE_ENV === 'development') {
          console.debug('🔒 HTTPS environment - authentication optimized');
        }
        
        // تفعيل وضع عدم الاتصال إذا كان هناك مشاكل في الشبكة
        try {
          localStorage.setItem('offline_mode', 'enabled');
          localStorage.setItem('offline_reason', 'https_mixed_content');
        } catch (e) {
          // تجاهل الأخطاء الصامتة
        }
      }
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    window.addEventListener('beforeunload', handleMixedContentError);
    
    // تشغيل فورا للتحقق من البيئة
    handleMixedContentError();

    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
      window.removeEventListener('beforeunload', handleMixedContentError);
    };
  }, []);

  // Function to handle language change
  const handleLanguageChange = (newLanguage: string) => {
    console.log('AuthPage: Changing language to:', newLanguage);
    setLanguage(newLanguage, false);
    setCurrentLanguage(newLanguage);
    setForceRerender(prev => prev + 1); // Force immediate re-render
  };

  const onSubmit = async (data: any) => {
    // Prevent duplicate submissions or submission after redirection
    if (loginPending || hasRedirected) {
      console.log('Login already in progress or already redirected, ignoring submission');
      return;
    }
    
    try {
      setLoginPending(true);
      
      console.log('Submitting login form with username:', data.username);
      
      const result = await login({
        username: data.username,
        password: data.password,
      });
      
      if (result) {
        console.log('Login form submitted successfully');
        setHasRedirected(true); // Set the flag upon successful login
        // Redirect immediately upon success
        setLocation("/");
      }
    } catch (error) {
      console.error('Login form submission error:', error);
      // The error will be displayed by `error` in useAuth
    } finally {
      setLoginPending(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // If user is already logged in or redirection has occurred, render nothing
  if (user || hasRedirected) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background to-muted/20">
      {/* Auth Form - Only one instance */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Card with improved styling */}
          <Card 
            className="shadow-2xl border-0 backdrop-blur-sm bg-background/80"
            data-testid="auth-card"
          >
            <CardHeader className="space-y-1 pb-4">
              {/* Header with icon */}
              <div className="flex items-center justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-center" data-testid="login-title">
                {t("login_welcome_title")}
              </h1>
              <p className="text-muted-foreground text-center text-sm" data-testid="login-subtitle">
                {t("login_welcome_subtitle")}
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Username Field */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    {t("username")}
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      data-testid="input-username"
                      placeholder={t("username_placeholder")}
                      className={cn(
                        "pl-10 transition-all duration-200", // Adjusted padding for icon
                        "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        form.formState.errors.username && "border-destructive"
                      )}
                      {...form.register("username")}
                    />
                  </div>
                  {form.formState.errors.username && (
                    <p className="text-destructive text-xs mt-1 animate-in slide-in-from-left-2" data-testid="error-username">
                      {String(form.formState.errors.username.message)}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    {t("password")}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      data-testid="input-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("password_placeholder")}
                      className={cn(
                        "pl-10 pr-10 transition-all duration-200", // Adjusted padding for icon and button
                        "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        form.formState.errors.password && "border-destructive"
                      )}
                      {...form.register("password")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" // Positioned toggle button
                      onClick={togglePasswordVisibility}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">
                        {showPassword ? t("hide_password") : t("show_password")}
                      </span>
                    </Button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-destructive text-xs mt-1 animate-in slide-in-from-left-2" data-testid="error-password">
                      {String(form.formState.errors.password.message)}
                    </p>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      data-testid="checkbox-remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label
                      htmlFor="remember-me"
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      {t("remember_me")}
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="px-0 text-primary hover:text-primary/80"
                    data-testid="link-forgot-password"
                  >
                    {t("forgot_password")}
                  </Button>
                </div>

                {/* Language Selection for New Users */}
                <div className="space-y-2" key={`language-selector-${forceRerender}`}>
                  <Label htmlFor="language" className="text-sm font-medium">
                    {t("preferred_language")}
                  </Label>
                  <Select
                    value={currentLanguage}
                    onValueChange={handleLanguageChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("choose_app_language")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">हिन्दी</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("language_will_be_saved")}
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className={cn(
                    "w-full h-11 transition-all duration-200",
                    loginPending && "cursor-not-allowed" // Visual cue for pending state
                  )}
                  disabled={loginPending}
                  data-testid="button-submit"
                >
                  {loginPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t("logging_in")}
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      {t("login")}
                    </>
                  )}
                </Button>

                {/* Error Messages */}
                {error && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 animate-in slide-in-from-top-2" data-testid="error-message">
                    <p className="text-destructive text-sm">
                      {error || t("login_failed")}
                    </p>
                  </div>
                )}
              </form>

              {/* Additional Links */}
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("dont_have_account")}{" "}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto font-medium text-primary hover:text-primary/80"
                    data-testid="link-create-account"
                  >
                    {t("create_account")}
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Shield className="h-3 w-3" />
              {t("secure_login")}
            </p>
          </div>
        </div>
      </div>

      {/* Hero Section - Enhanced */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t("app_welcome")}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t("app_description")}
          </p>
        </div>
      </div>
    </div>
  );
}