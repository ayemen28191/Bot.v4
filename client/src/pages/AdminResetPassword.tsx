import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, Lock, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import { t } from '@/lib/i18n';

export default function AdminResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleResetPassword = async () => {
    if (password !== confirmPassword) {
      toast({
        title: t('error'),
        description: t('passwords_do_not_match'),
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: t('error'),
        description: t('password_must_be_longer_than_6_characters'),
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: t('success'),
          description: t('admin_password_reset_successfully'),
          variant: "default"
        });
        setPassword('');
        setConfirmPassword('');
      } else {
        throw new Error(data.error || t('failed_to_reset_password'));
      }
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message || t('error_occurred_while_resetting_password'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Link href="/admin" className="inline-flex items-center mr-4 text-primary hover:underline">
          <ArrowLeft size={16} className="ml-2" />
          {t('back_to_dashboard')}
        </Link>
        <h1 className="text-2xl font-bold">{t('admin_reset_password_title')}</h1>
      </div>
      
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="ml-2" size={20} />
            {t('admin_reset_password_title')}
          </CardTitle>
          <CardDescription>
            {t('admin_reset_password_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t('new_password')}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('enter_new_password')}
              />
              <button
                type="button"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? t('hide') : t('show')}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirm_password')}</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('re_enter_password')}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleResetPassword} 
            disabled={isLoading} 
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                {t('resetting')}
              </>
            ) : t('reset_password_btn')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}