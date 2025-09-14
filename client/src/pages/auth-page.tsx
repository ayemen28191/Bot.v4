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
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login, user, isLoading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loginPending, setLoginPending] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const form = useForm({
    resolver: zodResolver(
      insertUserSchema.pick({ username: true, password: true })
    ),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Redirect if already logged in - مع حماية من التكرار
  useEffect(() => {
    if (user && !isLoading) {
      console.log('User authenticated, redirecting to home...');
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  // Handle animation effect on form submission
  useEffect(() => {
    if (loginPending) {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [loginPending]);

  const onSubmit = async (data: any) => {
    // منع الإرسال المتكرر
    if (loginPending) return;
    
    try {
      setLoginPending(true);
      setLoginSuccess(false);
      
      const result = await login({
        username: data.username,
        password: data.password,
      });
      
      if (result) {
        setLoginSuccess(true);
        // إعادة التوجيه بعد تأخير قصير لإظهار رسالة النجاح
        setTimeout(() => {
          setLocation("/");
        }, 1000);
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginSuccess(false);
      // الخطأ سيتم عرضه من خلال error في useAuth
    } finally {
      setLoginPending(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background to-muted/20">
      {/* Auth Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Card with improved styling */}
          <Card 
            className={cn(
              "shadow-2xl border-0 backdrop-blur-sm bg-background/80 transition-all duration-500",
              isAnimating && "scale-[0.98] shadow-xl"
            )}
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
                    <User className="auth-input-icon" />
                    <Input
                      id="username"
                      data-testid="input-username"
                      placeholder={t("username_placeholder")}
                      className={cn(
                        "auth-input-with-icon transition-all duration-200",
                        "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        form.formState.errors.username && "border-destructive focus:ring-destructive/20"
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
                    <Lock className="auth-input-icon" />
                    <Input
                      id="password"
                      data-testid="input-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("password_placeholder")}
                      className={cn(
                        "auth-input-with-icon transition-all duration-200",
                        "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        form.formState.errors.password && "border-destructive focus:ring-destructive/20"
                      )}
                      {...form.register("password")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="auth-password-toggle h-8 w-8 p-0 hover:bg-transparent"
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

                {/* Submit Button */}
                <Button
                  type="submit"
                  className={cn(
                    "w-full h-11 transition-all duration-200",
                    "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                    loginPending && "cursor-not-allowed"
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

                {/* Success/Error Messages */}
                {error && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 animate-in slide-in-from-top-2" data-testid="error-message">
                    <p className="text-destructive text-sm">
                      {error || t("login_failed")}
                    </p>
                  </div>
                )}

                {loginSuccess && (
                  <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 animate-in slide-in-from-top-2" data-testid="success-message">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <p className="text-green-600 text-sm">
                        {t("login_success")}
                      </p>
                    </div>
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
          
          {/* Feature highlights */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{t("secure_login")}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{t("app_name")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}