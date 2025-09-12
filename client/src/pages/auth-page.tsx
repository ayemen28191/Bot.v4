import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { loginMutation, user } = useAuth();

  const form = useForm({
    resolver: zodResolver(
      insertUserSchema.pick({ username: true, password: true })
    ),
  });

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const onSubmit = async (data: any) => {
    await loginMutation.mutateAsync({
      username: data.username,
      password: data.password,
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Auth Form */}
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md p-8 m-4">
          <h1 className="text-3xl font-bold mb-6 text-center">
            {t("login")}
          </h1>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="username">{t("username")}</Label>
              <Input
                id="username"
                {...form.register("username")}
                className="mt-1"
              />
              {form.formState.errors.username && (
                <p className="text-destructive text-sm mt-1">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                {...form.register("password")}
                className="mt-1"
              />
              {form.formState.errors.password && (
                <p className="text-destructive text-sm mt-1">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {t("login")}
            </Button>
          </form>
        </Card>
      </div>

      {/* Hero Section */}
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-8">
        <div className="max-w-lg">
          <h2 className="text-4xl font-bold mb-4">
            {t("app_welcome")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("app_description")}
          </p>
        </div>
      </div>
    </div>
  );
}