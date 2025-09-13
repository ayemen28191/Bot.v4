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
  lastSyncTimestamp: number | null;
  sendMessage: (text: string, sender: string, avatar: string) => void;
  initializeWebSocket: () => void;
  enableOfflineMode: () => void;
  disableOfflineMode: () => void;
  syncMessages: () => Promise<void>;
  clearMessages: () => void;
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
  // إعداد مستمع الأحداث لتفعيل وضع عدم الاتصال من خارج المخزن (مثل queryClient)
  if (typeof window !== 'undefined') {
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

    initializeWebSocket: () => {
      // إذا كان وضع عدم الاتصال مفعلاً، لا نحاول فتح اتصال
      if (get().isOfflineMode || typeof window === 'undefined') {
        console.log('In offline mode, skipping WebSocket connection');
        return;
      }

      try {
        // تفعيل وضع عدم الاتصال تلقائياً في بيئة Replit HTTPS
        if (window.location.protocol === 'https:') {
          console.log('HTTPS connection detected - checking security for WebSocket');

          // في بيئة Replit، التحول تلقائياً لوضع عدم الاتصال لتجنب أخطاء WebSocket
          const isReplitApp = window.location.hostname.endsWith('.replit.app') ||
                              window.location.hostname.endsWith('.repl.co') ||
                              window.location.hostname === 'replit.com';

          if (isReplitApp) {
            console.log('Replit HTTPS environment detected - enabling offline mode automatically');
            // تفعيل وضع عدم الاتصال لتجنب أخطاء أمنية مع WebSocket
            get().enableOfflineMode();

            // إنشاء حدث نظام
            try {
              const { toast } = require('@/hooks/use-toast');
              toast({
                title: "Offline Mode Enabled",
                description: "WebSocket cannot be used from HTTPS in Replit. Offline mode has been enabled automatically.",
                variant: "default",
                duration: 5000
              });
            } catch (toastError) {
              console.warn('Failed to display offline mode notification:', toastError);
            }

            return;
          }

          // للبيئات الأخرى، نستمر بالمنطق العادي
          const useOfflineMode = localStorage.getItem('ws_failed_attempts') &&
                                parseInt(localStorage.getItem('ws_failed_attempts') || '0') > 1;

          if (useOfflineMode) {
            console.log('Previous failed connection attempts detected - enabling offline mode');
            get().enableOfflineMode();
            return;
          }
        }

        // الحصول على عنوان URL آمن للـ WebSocket باستخدام الدالة المساعدة
        const wsUrl = getWebSocketUrl('/ws');
        console.log(`Attempting to connect to WebSocket at: ${wsUrl}`);

        // محاولة إنشاء اتصال WebSocket
        const ws = new WebSocket(wsUrl);

        // إعداد مهلة زمنية للاتصال
        const connectionTimeout = setTimeout(() => {
          // إذا لم يتم الاتصال خلال 5 ثوانٍ، نعتبر أن هناك مشكلة
          if (ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket connection timeout after 5 seconds');
            ws.close();
            // عدم تعيين حالة الاتصال على true
            set({ isConnected: false });

            // تفعيل وضع عدم الاتصال تلقائياً عند فشل محاولة الاتصال
            get().enableOfflineMode();
          }
        }, 5000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket connection established');
          set({ isConnected: true, socket: ws });
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // Handle message types...
            if (data.type === 'message') {
              let processedMessage = data.message;

              // فك تشفير الرسالة إذا كانت مشفرة
              if (data.message.encrypted) {
                try {
                  const decryptedText = decodeURIComponent(atob(data.message.text));
                  processedMessage = {
                    ...data.message,
                    text: decryptedText,
                    encrypted: false
                  };
                } catch (decryptError) {
                  console.warn('Error decrypting message:', decryptError);
                  // استخدام النص الأصلي في حالة فشل فك التشفير
                }
              }

              // إرسال إشعار للمستخدم إذا كانت الرسالة من شخص آخر (ليست رسالة المستخدم نفسه)
              try {
                const currentUser = localStorage.getItem('current_user');
                const isSelfMessage = currentUser && processedMessage.sender === currentUser;

                // إرسال إشعار فقط إذا كانت الرسالة من شخص آخر وليست من نفس المستخدم
                if (!isSelfMessage && processedMessage.sender !== 'System') {
                  // محاولة إرسال إشعار إذا كانت الصفحة غير نشطة أو في الخلفية
                  if (!document.hasFocus()) {
                    NotificationService.sendChatMessage({
                      sender: processedMessage.sender,
                      text: processedMessage.text
                    });
                  }
                }
              } catch (notifyError) {
                console.warn('Could not send notification for new message:', notifyError);
              }

              // منع تكرار الرسائل عن طريق فحص معرف الرسالة
              set(state => {
                // تجنب تكرار الرسائل عن طريق فحص المعرف الفريد
                const isDuplicate = state.messages.some(msg => msg.id === processedMessage.id);
                if (isDuplicate) {
                  return state; // لا تغيير إذا كانت الرسالة مكررة
                }

                const newMessages = [...state.messages, processedMessage];

                // حفظ الرسائل في التخزين المحلي بكلا التنسيقين
                try {
                  localStorage.setItem('chat_messages', JSON.stringify(newMessages));
                  saveToLocalStorage('chat_data', newMessages);
                } catch (error) {
                  console.warn('Failed to save messages to local storage:', error);
                }

                return { messages: newMessages };
              });
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          set({ isConnected: false, socket: null });

          // عرض تنبيه للمستخدم حول خطأ الاتصال
          try {
            const { toast } = require('@/hooks/use-toast');
            toast({
              title: "Connection Error",
              description: "Failed to connect to the server. Offline mode will be enabled automatically.",
              variant: "destructive",
              duration: 5000
            });
          } catch (toastError) {
            console.warn('Failed to display error notification:', toastError);
          }

          // تفعيل وضع عدم الاتصال تلقائياً بعد 3 محاولات فاشلة
          const failedAttempts = parseInt(localStorage.getItem('ws_failed_attempts') || '0');
          localStorage.setItem('ws_failed_attempts', (failedAttempts + 1).toString());

          if (failedAttempts >= 2) { // بعد 3 محاولات (0, 1, 2)
            console.log('3 connection attempts failed, enabling offline mode automatically');
            get().enableOfflineMode();
          }
        };

        ws.onclose = () => {
          console.log('WebSocket connection closed');
          set({ isConnected: false, socket: null });

          // تحقق إذا كان الإغلاق بسبب خطأ في الاتصال
          if (!get().isOfflineMode) {
            // إظهار إشعار فقط إذا كان الاتصال قد تم بالفعل من قبل
            try {
              const { toast } = require('@/hooks/use-toast');
              toast({
                title: "Connection Interrupted",
                description: "The connection to the server has been closed. Attempting to reconnect...",
                variant: "default",
                duration: 3000
              });
            } catch (toastError) {
              console.warn('Failed to display connection interrupted notification:', toastError);
            }

            // محاولة إعادة الاتصال بعد تأخير
            setTimeout(() => {
              if (!get().isConnected && !get().isOfflineMode) {
                get().initializeWebSocket();
              }
            }, 5000);
          }
        };

      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        set({ isConnected: false, socket: null });
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
              // تشفير بسيط للنص (ليس آمناً للغاية ولكنه يضيف طبقة بسيطة من الأمان)
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
        if (!isConnected || !socket || !('send' in socket) || typeof socket.send !== 'function') {
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