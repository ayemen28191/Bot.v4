import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, User, Camera, Send, Users, Settings, File, Clock, LineChart, BarChart, DollarSign, MessageCircle, Bell, ArrowDownToLine, ArrowUpFromLine, Bot } from 'lucide-react';
import { useStore } from '@/store/chatStore';
import { t } from '@/lib/i18n';
import NotificationService from '@/lib/notifications';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/types';
import { useAuth } from '@/hooks/use-auth';

interface UserProfile {
  name: string;
  avatar: string;
}

export default function ChatPage() {
  const { 
    messages, 
    sendMessage, 
    initializeWebSocket, 
    isConnected, 
    isOfflineMode,
    enableOfflineMode,
    disableOfflineMode,
    onlineUsers,
    clearMessages 
  } = useStore();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [notificationsPermission, setNotificationsPermission] = useState<'granted' | 'denied' | 'default'>('default');
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : {
      name: t('new_user'),
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${Math.random()}`
    };
  });

  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [tempName, setTempName] = useState(userProfile.name);

  // حفظ اسم المستخدم الحالي في التخزين المحلي للتحقق مما إذا كانت الرسائل الواردة من نفس المستخدم
  useEffect(() => {
    localStorage.setItem('current_user', userProfile.name);
  }, [userProfile.name]);
  
  // التحقق من حالة إذن الإشعارات عند تحميل الصفحة
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsPermission(Notification.permission as 'granted' | 'denied' | 'default');
    }
  }, []);

  // تهيئة نظام محاكاة الاتصال
  useEffect(() => {
    if (!isConnected) {
      // تهيئة نظام الاتصال المحلي فقط إذا لم يكن متصلاً بالفعل
      initializeWebSocket();
      console.log(t('chat_simulation_initialized'));
    }
  }, [isConnected, initializeWebSocket]);

  useEffect(() => {
    if (newMessage) {
      setIsTyping(true);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      typingTimerRef.current = setTimeout(() => setIsTyping(false), 1000);
    } else {
      setIsTyping(false);
    }
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [newMessage]);

  const handleScroll = () => {
    if (!messageContainerRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = messageContainerRef.current;
    const isCloseToBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldScrollToBottom(isCloseToBottom);
  };

  useEffect(() => {
    const messageContainer = messageContainerRef.current;
    if (messageContainer) {
      messageContainer.addEventListener('scroll', handleScroll);
      return () => messageContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    }
  };

  // دائماً قم بالتمرير للأسفل عند إضافة رسائل جديدة
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);
  
  // استعادة التمرير التلقائي عند النقر على زر الإرسال
  useEffect(() => {
    if (!newMessage) {
      setShouldScrollToBottom(true);
    }
  }, [newMessage]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessage(newMessage, userProfile.name, userProfile.avatar);
    setNewMessage('');
    setShouldScrollToBottom(true);
  };

  const saveProfile = () => {
    const newProfile = {
      ...userProfile,
      name: tempName
    };
    setUserProfile(newProfile);
    localStorage.setItem('userProfile', JSON.stringify(newProfile));
    setIsProfileDialogOpen(false);
  };
  
  // تصدير المحادثة كملف JSON
  const exportChatHistory = () => {
    try {
      // إنشاء كائن للتصدير يحتوي على المحادثة والبيانات الوصفية
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        userName: userProfile.name,
        messages: messages
      };
      
      // تحويل الكائن إلى سلسلة JSON
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // إنشاء blob وتحميل الملف
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      // تعيين اسم ملف ديناميكي مع التاريخ الحالي
      const date = new Date();
      const fileName = `chat_history_${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}.json`;
      
      a.href = url;
      a.download = fileName;
      a.click();
      
      // تنظيف
      URL.revokeObjectURL(url);
      
      // إظهار رسالة نجاح
      toast({
        title: t('export_success'),
        description: `${t('export_success_desc')} ${fileName}`,
      });
    } catch (error) {
      console.error(t('error_exporting_chat'), error);
      toast({
        title: t('export_error'),
        description: t('export_error_desc'),
        variant: 'destructive',
      });
    }
  };
  
  // استيراد المحادثة من ملف JSON
  const importChatHistory = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const contents = e.target?.result as string;
          if (!contents) throw new Error(t('read_content_failed'));
          
          const importData = JSON.parse(contents);
          
          // التحقق من صحة الملف المستورد
          if (!importData.version || !importData.messages || !Array.isArray(importData.messages)) {
            throw new Error(t('invalid_file_format'));
          }
          
          // استخدام البيانات المستوردة (يمكن دمجها أو استبدالها بالبيانات الحالية)
          const importedMessages = importData.messages as Message[];
          
          // دمج الرسائل المستوردة مع الرسائل الحالية (إذا اختار المستخدم ذلك)
          // أو استخدام المستوردة فقط حسب الاختيار المطلوب
          clearMessages(); // مسح الرسائل الحالية
          
          // إضافة كل رسالة من الرسائل المستوردة
          importedMessages.forEach(msg => {
            sendMessage(msg.text, msg.sender, msg.avatar);
          });
          
          // عرض رسالة نجاح
          toast({
            title: t('import_success'),
            description: `${t('import_success_desc')} ${importedMessages.length}`,
          });
        } catch (parseError) {
          console.error(t('error_parsing_imported_chat'), parseError);
          toast({
            title: t('import_error'),
            description: t('import_error_desc'),
            variant: 'destructive',
          });
        }
      };
      
      reader.onerror = () => {
        toast({
          title: t('import_error'),
          description: t('import_error_desc'),
          variant: 'destructive',
        });
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error(t('error_importing_chat'), error);
      toast({
        title: t('import_error'),
        description: t('import_error_desc'),
        variant: 'destructive',
      });
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newProfile = {
          ...userProfile,
          avatar: reader.result as string
        };
        setUserProfile(newProfile);
        localStorage.setItem('userProfile', JSON.stringify(newProfile));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateNewAvatar = () => {
    const newProfile = {
      ...userProfile,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${Math.random()}`
    };
    setUserProfile(newProfile);
    localStorage.setItem('userProfile', JSON.stringify(newProfile));
  };
  
  // دالة لطلب إذن بإرسال الإشعارات
  const requestNotificationsPermission = async () => {
    try {
      const permissionResult = await NotificationService.requestPermission();
      setNotificationsPermission(Notification.permission as 'granted' | 'denied' | 'default');
      
      if (permissionResult) {
        toast({
          title: t('notifications_enabled'),
          description: t('notifications_enabled_desc'),
        });
      } else {
        toast({
          title: t('notifications_blocked'),
          description: t('notifications_blocked_desc') || 'يرجى تمكين الإشعارات في إعدادات المتصفح لتلقي تنبيهات الرسائل الجديدة',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(t('error_notifications_permission'), error);
      toast({
        title: t('error') || 'خطأ',
        description: t('notifications_error') || 'حدث خطأ أثناء محاولة تمكين الإشعارات',
        variant: 'destructive',
      });
    }
  };
  
  // التعامل مع تمكين وضع عدم الاتصال
  const handleToggleOfflineMode = () => {
    try {
      if (isOfflineMode) {
        disableOfflineMode();
        toast({
          title: t('online_mode_enabled') || 'تم تفعيل وضع الاتصال',
          description: t('online_mode_desc') || 'تم العودة للاتصال بالإنترنت. سيتم مزامنة الرسائل المخزنة محلياً.',
          variant: 'default',
        });
      } else {
        enableOfflineMode();
        toast({
          title: t('offline_mode_enabled') || 'تم تفعيل وضع عدم الاتصال',
          description: t('offline_mode_desc') || 'سيتم تخزين الرسائل محلياً ومزامنتها عند العودة للاتصال.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error(t('error_toggling_connection_mode'), error);
      toast({
        title: t('error') || 'خطأ',
        description: t('connection_mode_error') || 'حدث خطأ أثناء محاولة تغيير وضع الاتصال',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return t('yesterday');
    } else if (days < 7) {
      return date.toLocaleDateString(undefined, { weekday: 'long' });
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="chat-page flex flex-col min-h-screen bg-background text-foreground trading-app">
      <header className="fixed top-0 left-0 right-0 flex justify-between items-center p-3 border-b border-border/60 bg-background/90 backdrop-blur-md z-50 shadow-md">
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="p-1.5 rounded-full bg-card/80 border border-border/60">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="font-bold text-lg flex items-baseline gap-3">
            <span className="text-primary">{t('group_chat')}</span>
            {isConnected && <span className="text-green-400 text-sm">({t('connected')})</span>}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{onlineUsers.toLocaleString()} {t('online')}</span>
          </div>
        </div>
        <button
          onClick={() => setIsProfileDialogOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border hover:bg-card/80 transition-colors"
        >
          <img src={userProfile.avatar} alt="avatar" className="w-6 h-6 rounded-full" />
          <span className="text-sm">{userProfile.name}</span>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </button>
      </header>

      <main
        ref={messageContainerRef}
        className="flex-1 p-3 mt-16 pb-24 overflow-y-auto overflow-x-hidden scroll-smooth"
      >
        <div className="max-w-2xl mx-auto space-y-4">
          {/* تم إخفاء رسالة حالة الاتصال لأننا نستخدم محاكاة محلية */}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.sender === userProfile.name ? 'flex-row-reverse' : ''
              }`}
            >
              <img
                src={message.avatar}
                alt={message.sender}
                className="w-8 h-8 rounded-full border-2 border-border"
              />
              <div
                className={`flex flex-col max-w-[80%] ${
                  message.sender === userProfile.name ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    {message.sender}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(message.timestamp)}</span>
                  </div>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    message.sender === userProfile.name
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black'
                      : 'bg-gradient-to-r from-card to-muted border border-border'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  {message.file && (
                    <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-muted/20">
                      <File className="h-4 w-4" />
                      <div className="flex-1">
                        <p className="text-xs font-medium">{message.file.name}</p>
                        <p className="text-xs opacity-75">{message.file.size}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-pulse">{t('typing')}...</div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </main>

      {/* شريط وضع الاتصال */}
      <div className="fixed bottom-[120px] left-0 right-0 p-2 bg-card/95 backdrop-blur-md border-t border-border/60 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isOfflineMode ? (
              <>
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                <span>{t('offline_mode') || 'وضع عدم الاتصال'}</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span>{t('online_mode') || 'متصل بالإنترنت'}</span>
              </>
            )}
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleToggleOfflineMode}
            className={`text-xs border-gray-600 text-white ${
              isOfflineMode ? 'bg-green-800/60 hover:bg-green-700/70' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isOfflineMode ? (t('go_online') || 'العودة للاتصال') : (t('go_offline') || 'وضع عدم الاتصال')}
          </Button>
        </div>
      </div>

      {/* شريط للتذكير بتفعيل الإشعارات إذا لم تكن مفعلة بعد */}
      {notificationsPermission !== 'granted' && (
        <div className="fixed bottom-[80px] left-0 right-0 p-2 bg-card/95 backdrop-blur-md border-t border-border/60 z-40">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4 text-yellow-400" />
              <span>{t('enable_notifications') || 'تمكين إشعارات الرسائل الجديدة؟'}</span>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={requestNotificationsPermission}
              className="text-xs bg-muted hover:bg-muted/80 border-border text-foreground"
            >
              {t('enable') || 'تمكين'}
            </Button>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur-md border-t border-border/60">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={t('type_message')}
              className="w-full bg-card border border-border rounded-xl py-3 px-4 text-foreground placeholder-muted-foreground focus:outline-none focus:border-yellow-400"
            />
            <button
              onClick={handleSendMessage}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-500 hover:to-yellow-600 transition-all"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {isProfileDialogOpen && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl p-4 w-full max-w-sm border border-border">
            <h3 className="text-lg font-bold text-yellow-400 mb-4">{t('profile')}</h3>
            <div className="flex flex-col items-center mb-4">
              <div className="relative mb-2">
                <img
                  src={userProfile.avatar}
                  alt="avatar"
                  className="w-20 h-20 rounded-full object-cover border-4 border-border"
                />
                <div className="absolute bottom-0 right-0 flex gap-2">
                  <label className="p-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black cursor-pointer hover:from-yellow-500 hover:to-yellow-600 transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Camera className="h-4 w-4" />
                  </label>
                  <button
                    onClick={generateNewAvatar}
                    className="p-2 rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors"
                  >
                    <User className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg py-2 px-3 text-foreground text-center focus:outline-none focus:border-yellow-400"
              />
              
              {/* أزرار تصدير واستيراد المحادثة */}
              <div className="flex flex-col gap-2 w-full mt-3">
                <button
                  onClick={exportChatHistory}
                  className="w-full py-2 px-3 rounded-lg bg-gray-700 border border-gray-600 hover:bg-gray-600 flex items-center justify-center gap-2 text-sm"
                >
                  <ArrowDownToLine className="h-4 w-4 text-yellow-400" />
                  <span>{t('export_chat') || 'تصدير المحادثة'}</span>
                </button>
                
                <label className="w-full py-2 px-3 rounded-lg bg-gray-700 border border-gray-600 hover:bg-gray-600 flex items-center justify-center gap-2 text-sm cursor-pointer">
                  <ArrowUpFromLine className="h-4 w-4 text-yellow-400" />
                  <span>{t('import_chat') || 'استيراد المحادثة'}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importChatHistory}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setIsProfileDialogOpen(false)}
                className="flex-1 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={saveProfile}
                className="flex-1 py-2 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-medium hover:from-yellow-500 hover:to-yellow-600 transition-all"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* شريط التنقل السفلي */}
      <footer className="fixed bottom-16 left-0 right-0 border-t border-border/50 bg-background/90 backdrop-blur-md z-40 pt-1.5 pb-2 mobile-navbar">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {user?.isAdmin ? (
            <Link href="/admin" className="flex flex-col items-center text-gray-400 hover:text-yellow-400 mobile-nav-item">
              <Users className="h-5 w-5" />
              <span className="text-[10px] mt-1 font-medium">{t('users')}</span>
            </Link>
          ) : (
            <Link href="/bot-info" className="flex flex-col items-center text-gray-400 hover:text-yellow-400 mobile-nav-item">
              <Bot className="h-5 w-5" />
              <span className="text-[10px] mt-1 font-medium">{t('bot_info')}</span>
            </Link>
          )}

          <Link href="/indicators" className="flex flex-col items-center text-gray-400 hover:text-yellow-400 mobile-nav-item">
            <BarChart className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('indicators')}</span>
          </Link>

          <Link href="/" className="flex flex-col items-center text-gray-400 hover:text-yellow-400 mobile-nav-item">
            <div className="relative p-3 bg-yellow-400 text-black rounded-full -mt-5 shadow-lg border-4 border-background/90">
              <DollarSign className="h-6 w-6" />
            </div>
            <span className="text-[10px] mt-1 font-medium">{t('signal')}</span>
          </Link>

          <Link href="/group-chat" className="flex flex-col items-center text-yellow-400 mobile-nav-item active">
            <MessageCircle className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('group_chats')}</span>
          </Link>

          <Link href="/settings" className="flex flex-col items-center text-gray-400 hover:text-yellow-400 mobile-nav-item">
            <Settings className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">{t('settings')}</span>
          </Link>
        </div>
      </footer>
      
      <div className="h-16"></div>
    </div>
  );
}