import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, Lock, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';

export default function AdminResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleResetPassword = async () => {
    if (password !== confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمات المرور غير متطابقة",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون أطول من 6 أحرف",
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
          title: "تم بنجاح",
          description: "تم إعادة تعيين كلمة مرور المسؤول بنجاح",
          variant: "default"
        });
        setPassword('');
        setConfirmPassword('');
      } else {
        throw new Error(data.error || 'فشل في إعادة تعيين كلمة المرور');
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور',
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
          العودة إلى لوحة التحكم
        </Link>
        <h1 className="text-2xl font-bold">إعادة تعيين كلمة مرور المسؤول</h1>
      </div>
      
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="ml-2" size={20} />
            إعادة تعيين كلمة المرور
          </CardTitle>
          <CardDescription>
            يمكنك تعيين كلمة مرور جديدة للمسؤول هنا. يرجى استخدام كلمة مرور قوية وآمنة.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
              />
              <button
                type="button"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "إخفاء" : "عرض"}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور"
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
                جاري إعادة التعيين...
              </>
            ) : "إعادة تعيين كلمة المرور"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}