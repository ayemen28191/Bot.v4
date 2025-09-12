import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { t } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Users, Trash, Edit, EyeOff, Eye, X, Check, 
  DollarSign, KeyRound, Settings, Search, Filter, UserPlus 
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// مخططات Zod للتحقق من صحة النماذج
const userFormSchema = z.object({
  username: z.string().min(3, t('username_validation')),
  displayName: z.string().min(2, t('displayname_validation')),
  email: z.string().email(t('email_validation')),
  password: z.string().min(6, t('password_validation')),
  isAdmin: z.boolean().default(false),
});

const userUpdateSchema = z.object({
  username: z.string().min(3, t('username_validation')),
  displayName: z.string().min(2, t('displayname_validation')),
  email: z.string().email(t('email_validation')),
  isAdmin: z.boolean().default(false),
  password: z.string().min(6, t('password_validation')).optional(),
  changePassword: z.boolean().default(false),
});

type UserFormValues = z.infer<typeof userFormSchema>;
type UserUpdateValues = z.infer<typeof userUpdateSchema>;

// استيراد مكون التخطيط الإداري
import { AdminLayout } from "@/layouts";

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // حالات الواجهة
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showAdminsOnly, setShowAdminsOnly] = useState<boolean>(false);

  // نماذج إدخال المستخدم
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      displayName: "",
      email: "",
      password: "",
      isAdmin: false,
    },
  });

  const updateForm = useForm<UserUpdateValues>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      username: "",
      displayName: "",
      email: "",
      isAdmin: false,
      password: "",
      changePassword: false,
    },
  });

  // استرجاع المستخدمين عند تحميل الصفحة
  useEffect(() => {
    fetchUsers();
  }, []);

  // جلب قائمة المستخدمين
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("GET", "/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast({
          title: t('error'),
          description: t('failed_to_load_users'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('network_error'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // إضافة مستخدم جديد
  const handleAddUser = async (data: UserFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/users", data);

      if (response.ok) {
        toast({
          title: t('success'),
          description: t('user_added_successfully'),
        });
        setDialogOpen(false);
        form.reset();
        fetchUsers();
      } else {
        const errorData = await response.json();
        toast({
          title: t('error'),
          description: errorData.message || t('failed_to_add_user'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('network_error'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // تحديث مستخدم
  const handleUpdateUser = async (data: UserUpdateValues) => {
    if (!editingUser) return;
    
    setIsSubmitting(true);
    try {
      // إذا لم يتم تفعيل تغيير كلمة المرور، نزيل حقل كلمة المرور من البيانات المرسلة
      const updateData = {...data};
      
      if (!updateData.changePassword) {
        // لا نرسل كلمة المرور إذا لم يتم تفعيل خيار تغييرها
        delete updateData.password;
      }
      
      // نزيل حقل changePassword لأنه ليس جزءًا من نموذج البيانات في الخادم
      if ('changePassword' in updateData) {
        delete updateData.changePassword;
      }
      
      const response = await apiRequest("PATCH", `/api/users/${editingUser.id}`, updateData);

      if (response.ok) {
        toast({
          title: t('success'),
          description: t('user_updated_successfully'),
        });
        setDialogOpen(false);
        updateForm.reset();
        setEditingUser(null);
        fetchUsers();
      } else {
        const errorData = await response.json();
        toast({
          title: t('error'),
          description: errorData.message || t('failed_to_update_user'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('network_error'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // حذف مستخدم
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsSubmitting(true);
    try {
      const response = await apiRequest("DELETE", `/api/users/${userToDelete.id}`);

      if (response.ok) {
        toast({
          title: t('success'),
          description: t('user_deleted_successfully'),
        });
        setConfirmDeleteOpen(false);
        setUserToDelete(null);
        // تحديث قائمة المستخدمين بعد الحذف
        setUsers(users.filter(user => user.id !== userToDelete.id));
      } else {
        const errorData = await response.json();
        toast({
          title: t('error'),
          description: errorData.message || t('failed_to_delete_user'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('network_error'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // فتح نافذة تحرير المستخدم
  const openEditDialog = (user: any) => {
    setEditingUser(user);
    updateForm.reset({
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      isAdmin: Boolean(user.isAdmin),
      password: "",
      changePassword: false, // تعيين تغيير كلمة المرور إلى غير مفعل افتراضيًا
    });
    setShowPassword(false); // إعادة تعيين حالة إظهار كلمة المرور
    setDialogOpen(true);
  };

  // فتح نافذة تأكيد الحذف
  const openDeleteConfirm = (user: any) => {
    setUserToDelete(user);
    setConfirmDeleteOpen(true);
  };

  // تصفية المستخدمين حسب معيار البحث
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (showAdminsOnly) {
      return matchesSearch && user.isAdmin;
    }
    
    return matchesSearch;
  });

  return (
    <AdminLayout title={t('user_management')}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-yellow-400">{t('user_management')}</h2>
        <Button 
          size="sm" 
          className="bg-yellow-500 hover:bg-yellow-600 text-black"
          onClick={() => {
            setEditingUser(null);
            form.reset();
            setDialogOpen(true);
          }}
        >
          <UserPlus className="h-4 w-4 mr-1" />
          {t('add_user')}
        </Button>
      </div>
      
      <div className="space-y-6">
          {/* أدوات البحث والتصفية */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder={t('search_users')}
                className="pl-10 bg-gray-800 border-gray-700 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-admins"
                checked={showAdminsOnly}
                onCheckedChange={() => setShowAdminsOnly(!showAdminsOnly)}
                className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
              />
              <label htmlFor="show-admins" className="cursor-pointer">
                {t('admins_only')}
              </label>
            </div>
          </div>
          
          {/* قائمة المستخدمين */}
          <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>{searchTerm ? t('no_users_found') : t('no_users')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium">{t('username')}</th>
                      <th className="px-4 py-3 text-right font-medium">{t('display_name')}</th>
                      <th className="px-4 py-3 text-right font-medium">{t('email')}</th>
                      <th className="px-4 py-3 text-right font-medium">{t('role')}</th>
                      <th className="px-4 py-3 text-right font-medium">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-gray-700/30">
                        <td className="px-4 py-3">{user.username}</td>
                        <td className="px-4 py-3">{user.displayName}</td>
                        <td className="px-4 py-3 text-gray-300">{user.email}</td>
                        <td className="px-4 py-3">
                          {user.isAdmin ? (
                            <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">
                              {t('admin')}
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">
                              {t('user')}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 border-gray-600">
                                <Filter className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-gray-800 border-gray-700">
                              <DropdownMenuItem
                                className="cursor-pointer text-gray-200 focus:bg-gray-700 focus:text-gray-200"
                                onClick={() => openEditDialog(user)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                <span>{t('edit')}</span>
                              </DropdownMenuItem>
                              
                              {user.id !== 1 && ( // لا تسمح بحذف المشرف الرئيسي
                                <DropdownMenuItem
                                  className="cursor-pointer text-red-400 focus:bg-red-900/20 focus:text-red-400"
                                  onClick={() => openDeleteConfirm(user)}
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  <span>{t('delete')}</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      {/* نافذة إضافة/تحرير مستخدم */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-center text-yellow-400">
              {editingUser ? t('edit_user') : t('add_user')}
            </DialogTitle>
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
                          className="bg-gray-700 border-gray-600"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
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
                          className="bg-gray-700 border-gray-600"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
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
                          className="bg-gray-700 border-gray-600"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
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
                          className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {t('is_admin')}
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                {/* حقل تبديل تغيير كلمة المرور */}
                <FormField
                  control={updateForm.control}
                  name="changePassword"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0 rtl:space-x-reverse">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            // إظهار/إخفاء حقل كلمة المرور حسب الاختيار
                            if (!checked) {
                              updateForm.setValue("password", "");
                            }
                          }}
                          className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {t('change_password')}
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                {/* حقل كلمة المرور (يظهر فقط عند تفعيل تغيير كلمة المرور) */}
                {updateForm.watch("changePassword") && (
                  <FormField
                    control={updateForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('password')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder={t('enter_password')} 
                              {...field} 
                              className="bg-gray-700 border-gray-600 pr-10"
                            />
                            <button 
                              type="button"
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300"
                              onClick={() => setShowPassword(!showPassword)}
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                )}
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    {t('cancel')}
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
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
                          className="bg-gray-700 border-gray-600"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
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
                          className="bg-gray-700 border-gray-600"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
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
                          className="bg-gray-700 border-gray-600"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
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
                            className="bg-gray-700 border-gray-600 pr-10"
                          />
                        </FormControl>
                        <button 
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <FormMessage className="text-red-400" />
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
                          className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
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
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    {t('cancel')}
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('add')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد الحذف */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent className="bg-gray-800 text-white border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-yellow-400">{t('confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-gray-300">
              {t('confirm_delete_user_message')} <strong className="text-white">{userToDelete?.username}</strong>؟
              <div className="text-red-400 text-sm mt-2">{t('this_action_cannot_be_undone')}</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex sm:justify-between">
            <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700 flex-1 mr-2">
              <X className="h-4 w-4 mr-2" /> {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash className="h-4 w-4 mr-2" />}
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}