export type Tab = 'chats' | 'appointments' | 'payments' | 'profile';

export interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  isOnline: boolean;
}

export interface MessageFile {
  name: string;
  size: string;
}

export interface Message {
  id: string;
  text: string;
  sender: string;
  avatar: string;
  timestamp: number;
  isTyping?: boolean;
  file?: MessageFile;
}