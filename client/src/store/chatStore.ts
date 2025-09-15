import { create } from 'zustand';
import { Message } from '@/types';
import NotificationService from '@/lib/notifications';
import { getWebSocketUrl } from '@/lib/queryClient';

// تحديد حجم المخزن المؤقت (كم عدد الرسائل التي سيتم تخزينها بحد أقصى)
const MAX_CACHED_MESSAGES = 100;
// مدة صلاحية البيانات المخزنة (بالمللي ثانية) - 7 أيام
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

// واجهة لمعلومات البيانات المخزنة
interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
}

interface ChatState {
  messages: Message[];
  socket: WebSocket | null;
  isConnected: boolean;
  onlineUsers: number;
  isOfflineMode: boolean;
  pendingMessages: Message[];
  lastSyncTimestamp: null | number;
  sendMessage: (text: string, sender: string, avatar: string) => void;
  initializeWebSocket: () => void;
  enableOfflineMode: () => void;
  disableOfflineMode: () => void;
  syncMessages: () => Promise<void>;
  clearMessages: () => void;
  wsFailedAttempts: number; // إضافة عداد للمحاولات الفاشلة
  handleConnectionFailure: (reason: string) => void; // دالة مساعدة للتعامل مع فشل الاتصال
  addMessage: (message: Message) => void; // دالة مساعدة لإضافة الرسائل
}

// دالة مساعدة لحفظ البيانات في التخزين المحلي مع معلومات الصلاحية
const saveToLocalStorage = <T>(key: string, data: T, version: string = '1.0.0'): boolean => {
  try {
    const cachedData: CachedData<T> = {
      data,
      timestamp: Date.now(),
      version
    };
    localStorage.setItem(key, JSON.stringify(cachedData));
    return true;
  } catch (error) {
    console.error(`Error saving data (${key}):`, error);
    return false;
  }
};

// دالة مساعدة لاسترجاع البيانات من التخزين المحلي مع التحقق من الصلاحية
const getFromLocalStorage = <T>(key: string, defaultValue: T, ttl: number = CACHE_EXPIRY): T => {
  try {
    const savedData = localStorage.getItem(key);
    if (!savedData) return defaultValue;

    const parsed = JSON.parse(savedData) as CachedData<T>;

    // التحقق من صلاحية البيانات
    const isValid = Date.now() - parsed.timestamp < ttl;
    if (!isValid) {
      localStorage.removeItem(key);
      return defaultValue;
    }

    return parsed.data;
  } catch (error) {
    console.error(`Error reading data (${key}):`, error);
    return defaultValue;
  }
};

export const useStore = create<ChatState>((set, get) => {
  // **حماية مبكرة من حلقة إعادة التحميل**
  if (typeof window !== 'undefined') {
    // فحص فوري للبيئة الآمنة
    const isSecure = window.location.protocol === 'https:';
    const isReplitApp = window.location.hostname.includes('replit') || 
                        window.location.hostname.endsWith('.repl.co');
    
    // تفعيل الحماية المبكرة فوراً
    if (isSecure && isReplitApp) {
      const currentOfflineState = localStorage.getItem('offlineMode') === 'enabled' ||
                                  localStorage.getItem('offline_mode') === 'enabled' ||
                                  localStorage.getItem('replit_https_protection') === 'enabled';
      
      if (!currentOfflineState) {
        console.log('🛡️ تفعيل الحماية المبكرة من حلقة إعادة التحميل');
        console.log('ℹ️ This protection prevents WebSocket issues in HTTPS environment - normal behavior');
        localStorage.setItem('offline_mode', 'enabled');
        localStorage.setItem('replit_https_protection', 'enabled');
      }
    }

    // إعداد مستمع الأحداث لتفعيل وضع عدم الاتصال من خارج المخزن
    window.addEventListener('enableOfflineMode', (event: any) => {
      const store = get();
      if (!store.isOfflineMode) {
        console.log('Offline mode enabled by external event', event?.detail);
        store.enableOfflineMode();
      }
    });
  }

  return {
    messages: (() => {
      try {
        if (typeof window === 'undefined') return [];

        // التحقق إذا كان وضع عدم الاتصال مفعل مسبقا
        const offlineMode = localStorage.getItem('offline_mode') === 'enabled';

        // محاولة قراءة البيانات بالتنسيق الجديد أولاً
        const messagesData = getFromLocalStorage<Message[]>('chat_data', []);
        if (messagesData && messagesData.length > 0) {
          return messagesData;
        }

        // الرجوع للتنسيق القديم كاحتياط
        const saved = localStorage.getItem('chat_messages');
        if (saved) {
          const parsedMessages = JSON.parse(saved);
          // حفظ البيانات بالتنسيق الجديد للاستخدام في المستقبل
          saveToLocalStorage('chat_data', parsedMessages);
          return parsedMessages;
        }

        return [];
      } catch (e) {
        console.error('Error reading messages from local storage:', e);
        return [];
      }
    })(),
    socket: null,
    isConnected: false,
    onlineUsers: 1000,
    // قراءة حالة وضع عدم الاتصال من التخزين المحلي
    isOfflineMode: typeof window !== 'undefined' && (
      localStorage.getItem('offlineMode') === 'enabled' ||
      localStorage.getItem('offline_mode') === 'enabled'
    ),
    pendingMessages: [],
    lastSyncTimestamp: null,
    wsFailedAttempts: 0, // تهيئة عداد المحاولات الفاشلة

    // دالة مساعدة لإضافة الرسائل إلى الحالة
    addMessage: (message: Message) => {
      set(state => {
        // تجنب تكرار الرسائل عن طريق فحص المعرف الفريد
        const isDuplicate = state.messages.some(msg => msg.id === message.id);
        if (isDuplicate) {
          return state; // لا تغيير إذا كانت الرسالة مكررة
        }

        const newMessages = [...state.messages, message];

        // حفظ الرسائل في التخزين المحلي بكلا التنسيقين
        try {
          localStorage.setItem('chat_messages', JSON.stringify(newMessages));
          saveToLocalStorage('chat_data', newMessages);
        } catch (error) {
          console.warn('Failed to save messages to local storage:', error);
        }

        // إرسال إشعار للمستخدم إذا كانت الرسالة من شخص آخر (ليست رسالة المستخدم نفسه)
        try {
          const currentUser = localStorage.getItem('current_user');
          const isSelfMessage = currentUser && message.sender === currentUser;

          // إرسال إشعار فقط إذا كانت الرسالة من شخص آخر وليست من نفس المستخدم
          if (!isSelfMessage && message.sender !== 'System' && !document.hasFocus()) {
            NotificationService.sendChatMessage({
              sender: message.sender,
              text: message.text
            });
          }
        } catch (notifyError) {
          console.warn('Could not send notification for new message:', notifyError);
        }

        return { messages: newMessages };
      });
    },

    initializeWebSocket: () => {
      try {
        const isOfflineMode = get().isOfflineMode;
        if (isOfflineMode) {
          console.log('🔄 وضع عدم الاتصال مفعل، تخطي إنشاء WebSocket');
          set({ isConnected: false, socket: null });
          return;
        }

        // إغلاق الاتصال السابق إن وُجد
        const existingSocket = get().socket;
        if (existingSocket && existingSocket.readyState !== WebSocket.CLOSED) {
          console.log('إغلاق اتصال WebSocket السابق...');
          existingSocket.close();
        }

        console.log('تهيئة اتصال WebSocket جديد...');
        const wsUrl = getWebSocketUrl('/ws');

        // التحقق من صحة URL قبل إنشاء الاتصال
        if (wsUrl.includes('offline') || wsUrl.includes('replit-https-offline')) {
          console.log('🔄 تم اكتشاف وضع عدم الاتصال من URL، تفعيل وضع عدم الاتصال');
          get().enableOfflineMode();
          return;
        }

        console.log('🔗 محاولة الاتصال بـ:', wsUrl);
        const ws = new WebSocket(wsUrl);

        // تعيين timeout للاتصال
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            console.warn('⏰ انتهت مهلة الاتصال بـ WebSocket');
            ws.close();
            get().handleConnectionFailure('timeout');
          }
        }, 10000); // 10 ثواني timeout

        ws.onopen = () => {
          console.log('✅ تم الاتصال بـ WebSocket بنجاح');
          clearTimeout(connectionTimeout);
          set({ isConnected: true, socket: ws, wsFailedAttempts: 0 });

          // زيادة عدد المستخدمين المتصلين (محاكاة)
          set(state => ({ onlineUsers: state.onlineUsers + Math.floor(Math.random() * 3) + 1 }));
        };

        ws.onmessage = (event) => {
          console.log('📨 رسالة واردة عبر WebSocket:', event.data);
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'message') {
              get().addMessage(data.message);
            }
          } catch (error) {
            console.error('خطأ في تحليل رسالة WebSocket:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ خطأ في WebSocket:', error);
          clearTimeout(connectionTimeout);
          get().handleConnectionFailure('error');
        };

        ws.onclose = (event) => {
          console.log('❌ تم إغلاق اتصال WebSocket:', event.code, event.reason);
          clearTimeout(connectionTimeout);
          set({ isConnected: false, socket: null });

          // تقليل عدد المستخدمين المتصلين
          set(state => ({
            onlineUsers: Math.max(1, state.onlineUsers - Math.floor(Math.random() * 2) - 1)
          }));

          // التعامل مع رموز الأخطاء المختلفة
          if (event.code === 1006 || event.code === 502) {
            console.warn('🚫 خطأ 502 أو فشل الاتصال - قد تكون مشكلة في بيئة HTTPS');
            get().handleConnectionFailure('502_or_connection_failed');
          } else if (!get().isOfflineMode) {
            get().handleConnectionFailure('normal_close');
          }
        };

        set({ socket: ws });
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        get().handleConnectionFailure('exception');
      }
    },

    // دالة مساعدة للتعامل مع فشل الاتصال
    handleConnectionFailure: (reason: string) => {
      const currentAttempts = get().wsFailedAttempts || 0;
      const newAttempts = currentAttempts + 1;
      set({ wsFailedAttempts: newAttempts });

      console.log(`🔄 فشل الاتصال (${reason}), المحاولة: ${newAttempts}`);

      // إذا فشل الاتصال أكثر من 3 مرات أو كان السبب 502، قم بتفعيل وضع عدم الاتصال
      if (newAttempts >= 3 || reason === '502_or_connection_failed' || reason === 'timeout') {
        console.log('🔄 تفعيل وضع عدم الاتصال بسبب فشل الاتصال المتكرر');

        try {
          const { toast } = require('@/hooks/use-toast');
          toast({
            title: "Connection Issues Detected",
            description: "Switching to offline mode for better stability. You can switch back to online mode later.",
            variant: "default",
            duration: 5000
          });
        } catch (toastError) {
          console.warn('Failed to display offline mode notification:', toastError);
        }

        get().enableOfflineMode();
        return;
      }

      // إعادة المحاولة مع تأخير تدريجي
      if (!get().isOfflineMode) {
        const delay = Math.min(2000 * Math.pow(1.5, newAttempts), 15000);
        console.log(`🔄 إعادة محاولة الاتصال خلال ${delay}ms`);

        try {
          const { toast } = require('@/hooks/use-toast');
          toast({
            title: "Connection Interrupted",
            description: `Reconnecting in ${Math.round(delay/1000)} seconds... (Attempt ${newAttempts})`,
            variant: "default",
            duration: 3000
          });
        } catch (toastError) {
          console.warn('Failed to display reconnection notification:', toastError);
        }

        setTimeout(() => {
          if (!get().isConnected && !get().isOfflineMode) {
            get().initializeWebSocket();
          }
        }, delay);
      }
    },

    sendMessage: (text: string, sender: string, avatar: string) => {
      // إنشاء كائن الرسالة بشكل أكثر أماناً مع الختم الزمني الموحد
      const timestamp = Date.now();
      const message: Message = {
        id: `msg_${timestamp}_${Math.floor(Math.random() * 10000)}`,
        text,
        sender,
        avatar,
        timestamp
      };

      // الحصول على حالة الاتصال والوضع من المخزن
      const { socket, isConnected, isOfflineMode, pendingMessages } = get();

      // إذا كان في وضع عدم الاتصال، نخزن الرسالة للمزامنة لاحقاً
      if (isOfflineMode) {
        console.log('Message sent in offline mode, will be saved for later sync');

        // إضافة الرسالة إلى قائمة الرسائل المعلقة
        set(state => ({
          pendingMessages: [...state.pendingMessages, message]
        }));

        // حفظ الرسائل المعلقة في التخزين المحلي
        try {
          const allPendingMessages = [...pendingMessages, message];
          saveToLocalStorage('pending_messages', allPendingMessages);
        } catch (storageError) {
          console.warn('Failed to save pending messages to local storage:', storageError);
        }
      }
      // محاولة الإرسال عبر WebSocket إذا كان الاتصال متاحاً
      else if (isConnected && socket && 'send' in socket && typeof socket.send === 'function') {
        try {
          // إعداد كائن رسالة للإرسال عبر WebSocket مع تشفير بسيط (base64)
          const wsMessage = {
            type: 'message',
            message: {
              ...message,
              // تشفير بسيط للعرض فقط
              encrypted: true,
              text: btoa(encodeURIComponent(text)) // تشفير بسيط للعرض فقط
            }
          };

          // إرسال الرسالة إلى الخادم
          socket.send(JSON.stringify(wsMessage));
          console.log('Message sent to server via WebSocket');
        } catch (wsError) {
          console.error('Error sending message via WebSocket, saving locally only:', wsError);

          // إضافة الرسالة للمعلقة في حالة فشل الإرسال
          set(state => ({
            pendingMessages: [...state.pendingMessages, message]
          }));
        }
      } else {
        console.log('No active WebSocket connection, saving message locally only');
      }

      // في جميع الحالات، نضيف الرسالة إلى الرسائل المحلية للعرض الفوري
      set(state => {
        const newMessages = [...state.messages, message];

        // حفظ الرسائل في التخزين المحلي (بالتنسيق القديم والجديد)
        try {
          localStorage.setItem('chat_messages', JSON.stringify(newMessages));
          saveToLocalStorage('chat_data', newMessages);
        } catch (storageError) {
          console.warn('Failed to save messages to local storage:', storageError);
        }

        return { messages: newMessages };
      });

      // تسجيل في وحدة التحكم للتصحيح
      console.log('New message sent and saved locally:', message);

      // إذا كنا في وضع المحاكاة المحلية أو وضع عدم الاتصال، نستمر في إنشاء ردود افتراضية
      if (isOfflineMode || !socket || !('send' in socket) || typeof socket.send !== 'function') {
        // محاكاة الحصول على رسالة رد من مستخدم آخر (فقط للعرض)
        setTimeout(() => {
          if (Math.random() > 0.7) { // 30% فرصة للرد التلقائي
            const autoResponse: Message = {
              id: `auto_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
              text: `Auto-reply to: "${text.substring(0, 15)}${text.length > 15 ? '...' : ''}"`,
              sender: 'Another User',
              avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${Math.random()}`,
              timestamp: Date.now() + 1000
            };

            // إضافة الرسالة إلى الحالة
            set(state => {
              const newMessages = [...state.messages, autoResponse];
              try {
                localStorage.setItem('chat_messages', JSON.stringify(newMessages));
                saveToLocalStorage('chat_data', newMessages);
              } catch (error) {
                console.warn('Failed to save auto-reply to local storage:', error);
              }
              return { messages: newMessages };
            });

            // إرسال إشعار للرد التلقائي إذا كانت الصفحة غير نشطة
            try {
              if (!document.hasFocus()) {
                NotificationService.sendChatMessage({
                  sender: autoResponse.sender,
                  text: autoResponse.text
                });
              }
            } catch (notifyError) {
              console.warn('Could not send notification for auto-reply:', notifyError);
            }
          }
        }, 1500 + Math.random() * 2000); // رد عشوائي بين 1.5 و 3.5 ثوانٍ
      }
    },

    // تمكين وضع عدم الاتصال بالإنترنت
    enableOfflineMode: () => {
      try {
        if (typeof window === 'undefined') return;

        // التحقق مما إذا كان الوضع مفعل بالفعل
        if (get().isOfflineMode) {
          console.log('Offline mode already enabled');
          return;
        }

        // إعادة تعيين عداد المحاولات الفاشلة
        localStorage.removeItem('ws_failed_attempts');

        // تخزين الرسائل الحالية قبل تمكين وضع عدم الاتصال
        const messages = get().messages;
        saveToLocalStorage('chat_data_offline', messages);

        // قطع اتصال WebSocket إذا كان موجوداً
        const socket = get().socket;
        if (socket && 'close' in socket && typeof socket.close === 'function') {
          socket.close();
        }

        set({
          isOfflineMode: true,
          isConnected: false,
          socket: null
        });

        console.log('Offline mode enabled. Messages will be stored locally only.');

        // إظهار إشعار للمستخدم
        try {
          const { toast } = require('@/hooks/use-toast');
          toast({
            title: "Offline Mode Activated",
            description: "Data will be stored locally. You can return to live mode later.",
            variant: "default",
            duration: 5000
          });
        } catch (toastError) {
          console.warn('Failed to display offline mode activation notification:', toastError);
        }

        // تخزين حالة وضع عدم الاتصال
        localStorage.setItem('offlineMode', 'enabled');
      } catch (error) {
        console.error('Error enabling offline mode:', error);
      }
    },

    // تعطيل وضع عدم الاتصال بالإنترنت والعودة للوضع الطبيعي
    disableOfflineMode: () => {
      try {
        if (typeof window === 'undefined') return;

        set({ isOfflineMode: false });
        // إزالة كلا المفتاحين للتوافق مع الإصدارات السابقة
        localStorage.removeItem('offlineMode');
        localStorage.removeItem('offline_mode');
        localStorage.removeItem('ws_failed_attempts');

        // إظهار إشعار للمستخدم
        try {
          const { toast } = require('@/hooks/use-toast');
          toast({
            title: "Connecting to Server",
            description: "Attempting to connect and sync data...",
            variant: "default",
            duration: 3000
          });
        } catch (toastError) {
          console.warn('Failed to display offline mode deactivation notification:', toastError);
        }

        // إعادة تهيئة اتصال WebSocket
        get().initializeWebSocket();

        // مزامنة الرسائل المخزنة محلياً بعد تأخير قصير (لضمان إنشاء الاتصال أولاً)
        setTimeout(() => {
          get().syncMessages();
        }, 2000);

        console.log('Offline mode disabled, attempting to reconnect.');
      } catch (error) {
        console.error('Error disabling offline mode:', error);
      }
    },

    // مزامنة الرسائل المخزنة محلياً مع الخادم
    syncMessages: async () => {
      try {
        if (typeof window === 'undefined') return;

        const { socket, pendingMessages, messages, isConnected } = get();

        // التحقق من وجود اتصال نشط
        if (!isConnected || !socket || !('send' in socket) || typeof socket.send === 'function') {
          console.warn('Cannot sync messages: no active server connection');
          return;
        }

        // تحضير الرسائل للمزامنة - استخدام الرسائل المعلقة أو استعادة من التخزين المحلي
        let messagesToSync: Message[] = [...pendingMessages];

        // إذا لم يكن هناك رسائل معلقة في الذاكرة، نحاول استعادتها من التخزين المحلي
        if (messagesToSync.length === 0) {
          const savedPending = getFromLocalStorage<Message[]>('pending_messages', []);
          messagesToSync = savedPending;
        }

        // إذا لم نجد أي رسائل معلقة للمزامنة، نخرج
        if (messagesToSync.length === 0) {
          console.log('No pending messages to sync');
          return;
        }

        console.log(`Syncing ${messagesToSync.length} messages with the server...`);

        // إرسال الرسائل للمزامنة بشكل متعاقب
        for (const message of messagesToSync) {
          try {
            const wsMessage = {
              type: 'message',
              message,
              isSync: true
            };

            socket.send(JSON.stringify(wsMessage));
            await new Promise(resolve => setTimeout(resolve, 100)); // انتظار قصير بين كل رسالة
          } catch (sendError) {
            console.error('Error syncing message:', sendError);
            // تسجيل الرسالة كمعلقة
            set(state => ({
              pendingMessages: [...state.pendingMessages, message]
            }));
          }
        }

        // تحديث وقت آخر مزامنة وحفظه
        const syncTime = Date.now();
        set({ lastSyncTimestamp: syncTime, pendingMessages: [] });
        localStorage.setItem('last_sync_timestamp', syncTime.toString());

        console.log('Messages synced successfully');

        // تحديث التخزين المؤقت بالبيانات المحدثة
        saveToLocalStorage('chat_data', get().messages);
      } catch (error) {
        console.error('Error syncing messages:', error);
      }
    },

    // مسح جميع الرسائل من المخزن المؤقت
    clearMessages: () => {
      try {
        if (typeof window === 'undefined') return;

        set({ messages: [] });
        localStorage.removeItem('chat_messages');
        localStorage.removeItem('chat_data');
        console.log('All messages cleared from cache');
      } catch (error) {
        console.error('Error clearing messages:', error);
      }
    }
  };
});