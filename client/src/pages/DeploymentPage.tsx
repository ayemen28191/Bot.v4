import { useAuth } from "@/hooks/use-auth";
import { t } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertCircle, ArrowUpDown, Check, Copy, Edit, Eye, EyeOff, 
  Loader2, MoreVertical, Plus, Server, Terminal, Trash, X 
} from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentLanguage } from "@/lib/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLayout } from "@/layouts";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

// نموذج Zod للتحقق من بيانات الخادم
const serverFormSchema = z.object({
  name: z.string().min(2, { message: "اسم الخادم يجب أن يكون حرفين على الأقل" }),
  host: z.string().min(4, { message: "يرجى إدخال عنوان مضيف صالح" }),
  username: z.string().min(2, { message: "اسم المستخدم يجب أن يكون حرفين على الأقل" }),
  authType: z.enum(["password", "key"]).default("password"),
  password: z.string().optional(),
  privateKey: z.string().optional(),
  port: z.coerce.number().int().min(1, { message: "يرجى إدخال رقم منفذ صالح" }).max(65535),
  deployPath: z.string().min(1, { message: "يرجى إدخال مسار النشر" }),
  isActive: z.boolean().default(true)
});

// التحقق من وجود كلمة مرور أو مفتاح خاص
const serverValidationSchema = serverFormSchema.refine(
  (data) => data.password || data.privateKey, 
  {
    message: "يجب إدخال كلمة مرور أو مفتاح خاص",
    path: ["password"]
  }
);

type ServerFormValues = z.infer<typeof serverFormSchema>;

// واجهة الخادم
interface DeploymentServer {
  id: number;
  name: string;
  host: string;
  username: string;
  port: number;
  deployPath: string;
  isActive: boolean;
  authType?: "password" | "key";
  password?: string | null;
  privateKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

// واجهة سجلات النشر
interface DeploymentLog {
  id: number;
  serverId: number;
  status: string;
  message: string;
  details?: string;
  startTime: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
}

export default function DeploymentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isRTL = getCurrentLanguage() === 'ar';
  const [servers, setServers] = useState<DeploymentServer[]>([]);
  const [deploymentLogs, setDeploymentLogs] = useState<DeploymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testingServer, setTestingServer] = useState<number | null>(null);
  const [editingServer, setEditingServer] = useState<DeploymentServer | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<DeploymentServer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("servers");
  const [isDeploying, setIsDeploying] = useState<number | null>(null);

  // نموذج إضافة/تحرير خادم
  const form = useForm<ServerFormValues>({
    resolver: zodResolver(serverValidationSchema),
    defaultValues: {
      name: "",
      host: "",
      username: "",
      password: "",
      privateKey: "",
      port: 22,
      deployPath: "/var/www/html",
      isActive: true
    }
  });

  // جلب قائمة الخوادم
  const fetchServers = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(
        'GET',
        '/api/deployment/servers'
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched servers:", data);
        setServers(data);
      } else {
        console.error("Error fetching servers:", response.statusText);
        toast({
          title: "خطأ",
          description: "فشل في جلب قائمة الخوادم",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching servers:", error);
      toast({
        title: "خطأ",
        description: "فشل في جلب قائمة الخوادم",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // جلب سجلات النشر
  const fetchDeploymentLogs = async () => {
    try {
      const response = await apiRequest(
        'GET',
        '/api/deployment/logs'
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched deployment logs:", data);
        setDeploymentLogs(data);
      } else {
        console.error("Error fetching logs:", response.statusText);
        toast({
          title: "خطأ",
          description: "فشل في جلب سجلات النشر",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching deployment logs:", error);
      toast({
        title: "خطأ",
        description: "فشل في جلب سجلات النشر",
        variant: "destructive"
      });
    }
  };

  // إضافة خادم جديد
  const handleAddServer = async (data: ServerFormValues) => {
    try {
      setIsSubmitting(true);
      const response = await apiRequest(
        'POST',
        '/api/deployment/servers',
        data
      );

      const newServer = await response.json();
      console.log("Added server:", newServer);

      toast({
        title: "تم بنجاح",
        description: "تم إضافة الخادم بنجاح",
      });

      // تحديث قائمة الخوادم
      setServers(prev => [...prev, newServer]);
      setDialogOpen(false);
      form.reset();

    } catch (error: any) {
      console.error("Error adding server:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في إضافة الخادم",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // تحديث معلومات خادم
  const handleUpdateServer = async (data: ServerFormValues) => {
    if (!editingServer) return;

    // إذا كان الحقل فارغًا، لا ترسله في الطلب
    if (!data.password) delete data.password;
    if (!data.privateKey) delete data.privateKey;

    try {
      setIsSubmitting(true);
      const response = await apiRequest(
        'PUT',
        `/api/deployment/servers/${editingServer.id}`,
        data
      );

      const updatedServer = await response.json();
      console.log("Updated server:", updatedServer);

      toast({
        title: "تم بنجاح",
        description: "تم تحديث معلومات الخادم بنجاح",
      });

      // تحديث قائمة الخوادم
      setServers(prev => prev.map(server => server.id === editingServer.id ? updatedServer : server));
      setDialogOpen(false);
      setEditingServer(null);
      form.reset();

    } catch (error: any) {
      console.error("Error updating server:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث معلومات الخادم",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // حذف خادم
  const handleDeleteServer = async () => {
    if (!serverToDelete) return;
    
    try {
      setIsSubmitting(true);
      await apiRequest(
        'DELETE',
        `/api/deployment/servers/${serverToDelete.id}`
      );

      toast({
        title: "تم بنجاح",
        description: "تم حذف الخادم بنجاح",
      });

      // تحديث قائمة الخوادم
      setServers(prev => prev.filter(server => server.id !== serverToDelete.id));
      setConfirmDeleteOpen(false);
      setServerToDelete(null);

    } catch (error: any) {
      console.error("Error deleting server:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف الخادم",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // اختبار الاتصال بالخادم
  const testServerConnection = async (serverId: number) => {
    setTestingServer(serverId);
    
    try {
      console.log("Testing connection to server ID:", serverId);
      const response = await apiRequest(
        'POST',
        `/api/deployment/test-connection/${serverId}`
      );
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("Connection test result:", result);
      
      if (result.success) {
        toast({
          title: "تم الاتصال بنجاح",
          description: "تم الاتصال بالخادم بنجاح",
        });
      } else {
        toast({
          title: "فشل الاتصال",
          description: result.message || "فشل في الاتصال بالخادم",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error testing connection:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في اختبار الاتصال",
        variant: "destructive"
      });
    } finally {
      setTestingServer(null);
    }
  };

  // النشر إلى الخادم
  const deployToServer = async (serverId: number) => {
    setIsDeploying(serverId);
    
    try {
      console.log("Deploying to server ID:", serverId);
      const response = await apiRequest(
        'POST',
        `/api/deployment/deploy/${serverId}`
      );
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("Deployment result:", result);
      
      if (result.success) {
        toast({
          title: "تم النشر بنجاح",
          description: "تم نشر التطبيق بنجاح",
        });
        // تحديث سجلات النشر بعد النشر
        fetchDeploymentLogs();
      } else {
        toast({
          title: "فشل النشر",
          description: result.message || "فشل في نشر التطبيق",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error deploying:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في عملية النشر",
        variant: "destructive"
      });
    } finally {
      setIsDeploying(null);
    }
  };

  // فتح نافذة تحرير خادم
  const openEditDialog = (server: DeploymentServer) => {
    setEditingServer(server);
    
    // تعيين نوع المصادقة المناسب بناءً على البيانات المتاحة
    const authType = server.authType || "password";
    
    form.reset({
      name: server.name,
      host: server.host,
      username: server.username,
      authType: (authType === "key" ? "key" : "password"), // تعيين نوع المصادقة المناسب
      password: "", // لا نستطيع استعادة كلمة المرور
      privateKey: "", // لا نستطيع استعادة المفتاح الخاص
      port: server.port,
      deployPath: server.deployPath,
      isActive: server.isActive
    });
    setDialogOpen(true);
  };

  // فتح نافذة إضافة خادم جديد
  const openAddDialog = () => {
    setEditingServer(null);
    form.reset({
      name: "",
      host: "",
      username: "",
      authType: "password",
      password: "",
      privateKey: "",
      port: 22,
      deployPath: "/var/www/html",
      isActive: true
    });
    setDialogOpen(true);
  };

  // فتح نافذة تأكيد الحذف
  const openDeleteConfirm = (server: DeploymentServer) => {
    setServerToDelete(server);
    setConfirmDeleteOpen(true);
  };

  // جلب البيانات عند تحميل الصفحة
  useEffect(() => {
    fetchServers();
    fetchDeploymentLogs();
  }, []);

  // نسخ النص للحافظة
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "تم النسخ",
      description: "تم نسخ النص إلى الحافظة",
    });
  };

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ar-SA');
  };

  // لون حالة النشر
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'in_progress':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <AdminLayout title="إدارة النشر">
      <div className="space-y-6">
        {/* التبويبات الرئيسية */}
        <div className="mb-6">
          <Tabs defaultValue="servers" onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-gray-800/60 border border-gray-700/60 grid w-full grid-cols-2 mb-4">
              <TabsTrigger
                value="servers"
                className="data-[state=active]:bg-gray-700 data-[state=active]:text-yellow-400"
              >
                <Server className="h-4 w-4 mr-2" /> إدارة الخوادم
              </TabsTrigger>
              <TabsTrigger
                value="logs"
                className="data-[state=active]:bg-gray-700 data-[state=active]:text-yellow-400"
              >
                <Terminal className="h-4 w-4 mr-2" /> سجلات النشر
              </TabsTrigger>
            </TabsList>

            {/* المحتوى - قسم الخوادم */}
            <TabsContent value="servers">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/60 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-yellow-400">إدارة خوادم النشر</h2>
                  <Button 
                    size="sm" 
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    onClick={openAddDialog}
                  >
                    <Plus className="h-4 w-4 mr-1" /> إضافة خادم
                  </Button>
                </div>
                
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 text-yellow-400 animate-spin" />
                  </div>
                ) : servers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    لا توجد خوادم مضافة حاليًا
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow className="border-gray-700">
                          <TableHead className="text-gray-300">الاسم</TableHead>
                          <TableHead className="text-gray-300">المضيف</TableHead>
                          <TableHead className="text-gray-300">المستخدم</TableHead>
                          <TableHead className="text-gray-300">المنفذ</TableHead>
                          <TableHead className="text-gray-300">مسار النشر</TableHead>
                          <TableHead className="text-gray-300">الحالة</TableHead>
                          <TableHead className="text-gray-300">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {servers.map((server) => (
                          <TableRow key={server.id} className="border-gray-700/50">
                            <TableCell className="font-medium">{server.name}</TableCell>
                            <TableCell className="flex items-center gap-1">
                              {server.host}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-gray-400 hover:text-white"
                                onClick={() => copyToClipboard(server.host)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TableCell>
                            <TableCell>{server.username}</TableCell>
                            <TableCell>{server.port}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{server.deployPath}</TableCell>
                            <TableCell>
                              {server.isActive ? (
                                <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-300 border border-green-500/30">
                                  نشط
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded text-xs bg-gray-600/30 text-gray-300 border border-gray-600/30">
                                  غير نشط
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                  onClick={() => testServerConnection(server.id)}
                                  disabled={testingServer === server.id}
                                >
                                  {testingServer === server.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-400 hover:text-green-300 hover:bg-green-900/20"
                                  onClick={() => deployToServer(server.id)}
                                  disabled={isDeploying === server.id || !server.isActive}
                                >
                                  {isDeploying === server.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <ArrowUpDown className="h-4 w-4" />
                                  )}
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align={isRTL ? "start" : "end"} className="bg-gray-800 border-gray-700 text-white">
                                    <DropdownMenuItem 
                                      className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700"
                                      onClick={() => openEditDialog(server)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" /> تعديل
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-900/20 focus:bg-red-900/20"
                                      onClick={() => openDeleteConfirm(server)}
                                    >
                                      <Trash className="h-4 w-4 mr-2" /> حذف
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* المحتوى - سجلات النشر */}
            <TabsContent value="logs">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/60 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-yellow-400">سجلات النشر</h2>
                  <Button 
                    size="sm" 
                    className="bg-gray-700 hover:bg-gray-600 text-white"
                    onClick={fetchDeploymentLogs}
                  >
                    <Loader2 className="h-4 w-4 mr-1" /> تحديث
                  </Button>
                </div>
                
                {deploymentLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    لا توجد سجلات نشر حاليًا
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deploymentLogs.map((log) => {
                      const server = servers.find(s => s.id === log.serverId);
                      return (
                        <div key={log.id} className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{server?.name || `خادم #${log.serverId}`}</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(log.status)} border border-current`}>
                                {log.status === 'success' ? 'ناجح' : log.status === 'failed' ? 'فاشل' : 'قيد التنفيذ'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">{formatDate(log.startTime)}</span>
                          </div>
                          <p className="text-gray-300 text-sm mb-2">{log.message}</p>
                          {log.details && (
                            <div className="bg-gray-950 border border-gray-800 rounded p-2 mt-2 text-xs font-mono overflow-x-auto">
                              <pre className="whitespace-pre-wrap text-gray-400">{log.details}</pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* نافذة إضافة/تحرير خادم */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-center text-yellow-400">
              {editingServer ? "تعديل الخادم" : "إضافة خادم"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(editingServer ? handleUpdateServer : handleAddServer)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الخادم</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="أدخل اسم الخادم" 
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
                name="host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المضيف (IP/الدومين)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="أدخل عنوان المضيف" 
                        {...field} 
                        className="bg-gray-700 border-gray-600"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المستخدم</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="أدخل اسم المستخدم" 
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
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المنفذ</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="أدخل رقم المنفذ" 
                          {...field} 
                          className="bg-gray-700 border-gray-600"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* طريقة المصادقة */}
              <FormField
                control={form.control}
                name="authType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>طريقة المصادقة</FormLabel>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2 ml-2">
                        <input
                          type="radio"
                          id="password-auth"
                          value="password"
                          checked={field.value === "password"}
                          onChange={() => field.onChange("password")}
                          className="h-4 w-4 text-yellow-500 bg-gray-700 border-gray-600 focus:ring-yellow-400"
                        />
                        <label htmlFor="password-auth" className="text-sm font-medium text-gray-300 mr-2">
                          كلمة المرور
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="key-auth"
                          value="key"
                          checked={field.value === "key"}
                          onChange={() => field.onChange("key")}
                          className="h-4 w-4 text-yellow-500 bg-gray-700 border-gray-600 focus:ring-yellow-400"
                        />
                        <label htmlFor="key-auth" className="text-sm font-medium text-gray-300 mr-2">
                          المفتاح الخاص (SSH)
                        </label>
                      </div>
                    </div>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              
              {/* حقل كلمة المرور - يظهر عند اختيار كلمة المرور كطريقة مصادقة */}
              {form.watch("authType") === "password" && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>كلمة المرور {editingServer && "(اتركها فارغة إذا لم ترغب في تغييرها)"}</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="أدخل كلمة المرور" 
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
              )}
              
              {/* حقل المفتاح الخاص - يظهر عند اختيار المفتاح الخاص كطريقة مصادقة */}
              {form.watch("authType") === "key" && (
                <FormField
                  control={form.control}
                  name="privateKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المفتاح الخاص (SSH) {editingServer && "(اتركه فارغًا إذا لم ترغب في تغييره)"}</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Textarea 
                            placeholder="أدخل المفتاح الخاص" 
                            {...field} 
                            rows={3}
                            className="bg-gray-700 border-gray-600 font-mono text-xs resize-none"
                          />
                        </FormControl>
                        <button 
                          type="button"
                          className="absolute top-0 right-0 pr-3 pt-2 flex items-center"
                          onClick={() => setShowPrivateKey(!showPrivateKey)}
                        >
                          {showPrivateKey ? (
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
              )}
              
              <FormField
                control={form.control}
                name="deployPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مسار النشر</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="أدخل مسار النشر" 
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
                name="isActive"
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
                      نشط (متاح للنشر)
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
                  إلغاء
                </Button>
                <Button 
                  type="submit" 
                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingServer ? "تحديث" : "إضافة"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد الحذف */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="bg-gray-800 text-white border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-yellow-400">
              تأكيد الحذف
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-3">
            <p className="text-gray-300 text-center mb-2">
              هل أنت متأكد من رغبتك في حذف هذا الخادم؟
            </p>
            <p className="text-yellow-400 text-center font-semibold">
              {serverToDelete?.name}
            </p>
            <p className="text-red-400 text-center text-sm mt-4">
              تحذير: لا يمكن التراجع عن هذا الإجراء.
            </p>
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button 
              onClick={() => setConfirmDeleteOpen(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 flex-1 mr-2"
            >
              <X className="h-4 w-4 mr-2" />
              إلغاء
            </Button>
            <Button 
              onClick={handleDeleteServer}
              className="bg-red-600 hover:bg-red-700 text-white flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash className="h-4 w-4 mr-2" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}