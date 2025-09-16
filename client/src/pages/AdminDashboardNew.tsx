import { useAuth } from "@/hooks/use-auth";
import { t } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertCircle, ArrowLeft, BarChart, Check, DollarSign, Edit, Eye, EyeOff, KeyRound,
  Loader2, Lock, MessageCircle, MoreVertical, Plus, RefreshCw, Settings, Trash, Users, X 
} from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { getCurrentLanguage } from "@/lib/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import SystemUpdater from "@/components/SystemUpdater";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminDashboardStats } from "@/features/admin";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLayout } from "@/layouts/AdminLayout";


// نموذج Zod للتحقق من بيانات المستخدم
const userFormSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  displayName: z.string().min(2, { message: "Display name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  isAdmin: z.boolean().default(false)
});

// نموذج تحديث المستخدم (بدون كلمة مرور)
const userUpdateSchema = userFormSchema.omit({ password: true }).partial();

type UserFormValues = z.infer<typeof userFormSchema>;
type UserUpdateValues = z.infer<typeof userUpdateSchema>;

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isRTL = getCurrentLanguage() === 'ar';
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // نموذج إضافة مستخدم جديد
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      displayName: "",
      email: "",
      password: "",
      isAdmin: false
    }
  });

  // نموذج تحديث معلومات مستخدم
  const updateForm = useForm<UserUpdateValues>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      username: "",
      displayName: "",
      email: "",
      isAdmin: false
    }
  });

  // جلب قائمة المستخدمين
  const fetchUsers = async () => {
    try {
      setLoading(true);
      // استخدام apiRequest بشكل صحيح
      const response = await apiRequest(
        'GET',
        '/api/users'
      );
      
      const data = await response.json();
      console.log("Fetched users:", data);
      setUsers(data);
      
      // حساب عدد المشرفين
      const admins = data.filter((user: User) => user.isAdmin);
      setAdminCount(admins.length);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: t('error'),
        description: t('failed_to_fetch_users'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // إضافة مستخدم جديد
  const handleAddUser = async (data: UserFormValues) => {
    try {
      setIsSubmitting(true);
      // استخدام apiRequest بشكل صحيح
      const response = await apiRequest(
        'POST',
        '/api/users',
        data
      );

      const newUser = await response.json();
      console.log("Added user:", newUser);

      toast({
        title: t('success'),
        description: t('user_added_successfully'),
      });

      // تحديث قائمة المستخدمين
      setUsers(prev => [...prev, newUser]);
      setDialogOpen(false);
      form.reset();

    } catch (error: any) {
      console.error("Error adding user:", error);
      toast({
        title: t('error'),
        description: error.message || t('failed_to_add_user'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // تحديث معلومات مستخدم
  const handleUpdateUser = async (data: UserUpdateValues) => {
    if (!editingUser) return;

    try {
      setIsSubmitting(true);
      // استخدام apiRequest بشكل صحيح
      const response = await apiRequest(
        'PUT',
        `/api/users/${editingUser.id}`,
        data
      );

      const updatedUser = await response.json();
      console.log("Updated user:", updatedUser);

      toast({
        title: t('success'),
        description: t('user_updated_successfully'),
      });

      // تحديث قائمة المستخدمين
      setUsers(prev => prev.map(user => user.id === editingUser.id ? updatedUser : user));
      setDialogOpen(false);
      setEditingUser(null);
      updateForm.reset();

    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: t('error'),
        description: error.message || t('failed_to_update_user'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // حذف مستخدم
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setIsSubmitting(true);
      // استخدام apiRequest بشكل صحيح
      await apiRequest(
        'DELETE',
        `/api/users/${userToDelete.id}`
      );

      toast({
        title: t('success'),
        description: t('user_deleted_successfully'),
      });

      // تحديث قائمة المستخدمين
      setUsers(prev => prev.filter(user => user.id !== userToDelete.id));
      setConfirmDeleteOpen(false);
      setUserToDelete(null);

    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: t('error'),
        description: error.message || t('failed_to_delete_user'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // فتح نافذة تحديث المستخدم
  const openEditDialog = (user: User) => {
    setEditingUser(user);
    updateForm.reset({
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      isAdmin: Boolean(user.isAdmin)
    });
    setDialogOpen(true);
  };

  // فتح نافذة إضافة مستخدم جديد
  const openAddDialog = () => {
    setEditingUser(null);
    form.reset();
    setDialogOpen(true);
  };

  // فتح نافذة تأكيد الحذف
  const openDeleteConfirm = (user: User) => {
    setUserToDelete(user);
    setConfirmDeleteOpen(true);
  };

  // جلب قائمة المستخدمين عند تحميل الصفحة
  useEffect(() => {
    fetchUsers();
  }, []);

  // حالات إضافية للإحصائيات
  const [apiKeyCount, setApiKeyCount] = useState(0);
  const [serverCount, setServerCount] = useState(0);
  const [activeTab, setActiveTab] = useState("users");
  
  // إحصائيات مفصلة جديدة
  const [adminCount, setAdminCount] = useState(0);
  const [activeApiKeys, setActiveApiKeys] = useState(0);
  const [failedApiKeys, setFailedApiKeys] = useState(0);
  const [activeServers, setActiveServers] = useState(0);
  const [recentDeployments, setRecentDeployments] = useState(0);
  const [apiUsageToday, setApiUsageToday] = useState(0);
  const [totalApiQuota, setTotalApiQuota] = useState(1000);

  // جلب بيانات مفاتيح API
  const fetchApiKeys = async () => {
    try {
      const response = await apiRequest('GET', '/api/config-keys/all');
      const data = await response.json();
      setApiKeyCount(data.length);
      
      // حساب المفاتيح النشطة والمعطلة
      const activeKeys = data.filter((key: any) => !key.failedUntil || new Date(key.failedUntil) < new Date());
      const failedKeys = data.filter((key: any) => key.failedUntil && new Date(key.failedUntil) > new Date());
      setActiveApiKeys(activeKeys.length);
      setFailedApiKeys(failedKeys.length);
      
      // حساب إجمالي الاستخدام اليومي والحد الأقصى
      const totalUsage = data.reduce((sum: number, key: any) => sum + (key.usageToday || 0), 0);
      const totalQuota = data.reduce((sum: number, key: any) => sum + (key.dailyQuota || 0), 0);
      setApiUsageToday(totalUsage);
      setTotalApiQuota(totalQuota > 0 ? totalQuota : 1000);
    } catch (error) {
      console.error("Error fetching API keys count:", error);
      setApiKeyCount(0);
      setActiveApiKeys(0);
      setFailedApiKeys(0);
      setApiUsageToday(0);
    }
  };

  // جلب بيانات الخوادم
  const fetchServers = async () => {
    try {
      const response = await apiRequest('GET', '/api/deployment/servers');
      const data = await response.json();
      setServerCount(data.length);
      
      // حساب الخوادم النشطة
      const activeServersData = data.filter((server: any) => server.isActive);
      setActiveServers(activeServersData.length);
    } catch (error) {
      console.error("Error fetching servers count:", error);
      setServerCount(0);
      setActiveServers(0);
    }
  };
  
  // جلب بيانات عمليات النشر الحديثة
  const fetchRecentDeployments = async () => {
    try {
      const response = await apiRequest('GET', '/api/deployment/logs?limit=20');
      const data = await response.json();
      
      // حساب عمليات النشر في آخر 24 ساعة
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentDeploys = data.filter((log: any) => {
        return log.createdAt && new Date(log.createdAt) > oneDayAgo;
      });
      setRecentDeployments(recentDeploys.length);
    } catch (error) {
      console.error("Error fetching recent deployments:", error);
      setRecentDeployments(0);
    }
  };

  // جلب كافة البيانات الإحصائية عند تحميل الصفحة
  useEffect(() => {
    fetchApiKeys();
    fetchServers();
    fetchRecentDeployments();
  }, []);

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <AdminLayout title={t('dashboard')}>
      <div className="space-y-6">
        {/* الإحصائيات وعرض البيانات العامة */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-primary mb-4">{t('dashboard')}</h2>
          <AdminDashboardStats 
            userCount={users.length}
            apiKeyCount={apiKeyCount}
            serverCount={serverCount}
            loading={loading}
            adminCount={adminCount}
            activeApiKeys={activeApiKeys}
            failedApiKeys={failedApiKeys}
            activeServers={activeServers}
            recentDeployments={recentDeployments}
            apiUsageToday={apiUsageToday}
            totalApiQuota={totalApiQuota}
          />
        </div>

        {/* التبويبات الرئيسية */}
        <div className="mb-6">
          <Tabs defaultValue="users" onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-card/60 border border-border/60 grid w-full grid-cols-3 mb-4">
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-muted data-[state=active]:text-primary"
              >
                <Users className="h-4 w-4 mr-2" /> {t('users')}
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="data-[state=active]:bg-muted data-[state=active]:text-primary"
              >
                <RefreshCw className="h-4 w-4 mr-2" /> تحديث النظام
              </TabsTrigger>
              <TabsTrigger
                value="info"
                className="data-[state=active]:bg-muted data-[state=active]:text-primary"
              >
                <AlertCircle className="h-4 w-4 mr-2" /> معلومات النظام
              </TabsTrigger>
            </TabsList>

            {/* المحتوى - قسم المستخدمين */}
            <TabsContent value="users">
              <div className="bg-card/50 backdrop-blur-sm border border-border/60 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-primary">{t('user_management')}</h2>
                  <Button 
                    size="sm" 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={openAddDialog}
                  >
                    <Plus className="h-4 w-4 mr-1" /> {t('add_user')}
                  </Button>
                </div>
                
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('no_users_found')}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="text-muted-foreground">#</TableHead>
                          <TableHead className="text-muted-foreground">{t('username')}</TableHead>
                          <TableHead className="text-muted-foreground">{t('display_name')}</TableHead>
                          <TableHead className="text-muted-foreground">{t('email')}</TableHead>
                          <TableHead className="text-muted-foreground">{t('role')}</TableHead>
                          <TableHead className="text-muted-foreground"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id} className="border-border/50">
                            <TableCell className="font-medium">{user.id}</TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.displayName}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{user.email}</TableCell>
                            <TableCell>
                              {user.isAdmin ? (
                                <span className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-500/30">
                                  {t('admin')}
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded text-xs bg-muted text-muted-foreground border border-border">
                                  {t('user')}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isRTL ? "start" : "end"} className="bg-card border-border text-foreground">
                                  <DropdownMenuItem 
                                    className="cursor-pointer hover:bg-muted focus:bg-muted"
                                    onClick={() => openEditDialog(user)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" /> {t('edit')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="cursor-pointer text-red-600 hover:text-red-500 hover:bg-red-50 focus:bg-red-50"
                                    onClick={() => openDeleteConfirm(user)}
                                    disabled={user.id === 1} // لا يمكن حذف المشرف الرئيسي
                                  >
                                    <Trash className="h-4 w-4 mr-2" /> {t('delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* المحتوى - تحديث النظام */}
            <TabsContent value="system">
              <div className="bg-card/50 backdrop-blur-sm border border-border/60 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-primary">إدارة التحديثات</h2>
                </div>
                
                <SystemUpdater />
              </div>
            </TabsContent>

            {/* المحتوى - معلومات النظام */}
            <TabsContent value="info">
              <div className="bg-card/50 backdrop-blur-sm border border-border/60 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-primary">معلومات النظام</h2>
                </div>
                
                <Alert className="bg-blue-50 border-blue-200 mb-3">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <AlertTitle className="text-blue-700">معلومات التطبيق</AlertTitle>
                  <AlertDescription className="text-blue-600">
                    بينار جوين للتحليل - منصة تداول متكاملة مع دعم للعملات المشفرة والأسهم والفوركس.
                  </AlertDescription>
                </Alert>

                <div className="bg-muted/50 rounded-lg p-4 border border-border mb-4">
                  <h3 className="text-lg font-medium text-primary mb-2">إدارة الحساب</h3>
                  <p className="text-muted-foreground mb-3">
                    يمكنك إدارة إعدادات الحساب من هنا، بما في ذلك إعادة تعيين كلمة المرور.
                  </p>
                  <Link href="/admin/reset-password">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Lock className="h-4 w-4 ml-2" />
                      إعادة تعيين كلمة مرور المسؤول
                    </Button>
                  </Link>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* نافذة إضافة/تحرير مستخدم */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-center text-primary">
              {editingUser ? t('edit_user') : t('add_user')}
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              {editingUser ? 'تحديث معلومات المستخدم في النظام' : 'إضافة مستخدم جديد إلى النظام'}
            </DialogDescription>
          </DialogHeader>
          
          {editingUser ? (
            <Form {...updateForm}>
              <form onSubmit={updateForm.handleSubmit(handleUpdateUser)} className="space-y-4">
                <FormField
                  control={updateForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('username')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={t('enter_username')} 
                          {...field} 
                          className="bg-background border-border"
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={updateForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('display_name')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={t('enter_display_name')} 
                          {...field} 
                          className="bg-background border-border"
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={updateForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder={t('enter_email')} 
                          {...field} 
                          className="bg-background border-border"
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={updateForm.control}
                  name="isAdmin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0 rtl:space-x-reverse">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={editingUser?.id === 1} // لا يمكن تغيير صلاحيات المشرف الرئيسي
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {t('is_admin')}
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    className="border-border text-muted-foreground hover:bg-muted"
                  >
                    {t('cancel')}
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('save')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddUser)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('username')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={t('enter_username')} 
                          {...field} 
                          className="bg-background border-border"
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('display_name')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={t('enter_display_name')} 
                          {...field} 
                          className="bg-background border-border"
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder={t('enter_email')} 
                          {...field} 
                          className="bg-background border-border"
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('password')}</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder={t('enter_password')} 
                            {...field} 
                            className="bg-background border-border pr-10"
                          />
                        </FormControl>
                        <button 
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isAdmin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0 rtl:space-x-reverse">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {t('is_admin')}
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    className="border-border text-muted-foreground hover:bg-muted"
                  >
                    {t('cancel')}
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('save')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد الحذف */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="bg-card text-foreground border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-red-600">
              {t('confirm_delete')}
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              تأكيد حذف المستخدم من النظام نهائياً
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 text-center">
            <p className="mb-2">{t('confirm_delete_message')}</p>
            {userToDelete && (
              <p className="font-bold text-lg mb-4 text-primary">
                {userToDelete.displayName} ({userToDelete.username})
              </p>
            )}
            <p className="text-sm text-red-600">{t('delete_irreversible')}</p>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row justify-center gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setConfirmDeleteOpen(false)}
              className="border-border text-muted-foreground hover:bg-muted flex-1"
            >
              {t('cancel')}
            </Button>
            <Button 
              type="button" 
              className="bg-red-500 hover:bg-red-600 text-white flex-1"
              disabled={isSubmitting}
              onClick={handleDeleteUser}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}