import { create } from 'zustand';
import { apiRequest } from '@/lib/queryClient';
import { useAuthStore } from './authStore';

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  type: 'text' | 'voice';
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  id: number;
  name: string;
  role: string;
  lastMessage: Message;
  unreadCount: number;
}

interface MessageState {
  messages: Message[];
  conversations: Conversation[];
  selectedUserId: number | null;
  isLoading: boolean;
  isLoadingConversation: boolean;
  currentConversation: Message[];
  error: string | null;
  
  fetchMessages: () => Promise<void>;
  fetchConversation: (userId: number) => Promise<void>;
  sendMessage: (receiverId: number, content: string, type: 'text' | 'voice') => Promise<void>;
  markMessageAsRead: (messageId: number) => Promise<void>;
  setSelectedUser: (userId: number | null) => void;
  clearError: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  conversations: [],
  selectedUserId: null,
  isLoading: false,
  isLoadingConversation: false,
  currentConversation: [],
  error: null,
  
  fetchMessages: async () => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/messages', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      set({ messages: data, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to fetch messages',
        isLoading: false,
      });
    }
  },
  
  fetchConversation: async (userId: number) => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    
    set({ isLoadingConversation: true, error: null });
    try {
      const response = await fetch(`/api/messages/conversation/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }
      
      const data = await response.json();
      set({ 
        currentConversation: data, 
        isLoadingConversation: false,
        selectedUserId: userId,
      });
      
      // Mark unread messages as read
      const { user } = useAuthStore.getState();
      if (user) {
        data.forEach((message: Message) => {
          if (message.receiverId === user.id && !message.isRead) {
            get().markMessageAsRead(message.id);
          }
        });
      }
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to fetch conversation',
        isLoadingConversation: false,
      });
    }
  },
  
  sendMessage: async (receiverId: number, content: string, type: 'text' | 'voice') => {
    try {
      const response = await apiRequest('POST', '/api/messages', {
        receiverId,
        content,
        type,
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const newMessage = await response.json();
      
      // Update current conversation
      if (get().selectedUserId === receiverId) {
        set(state => ({
          currentConversation: [...state.currentConversation, newMessage],
        }));
      }
      
      // Refresh messages
      get().fetchMessages();
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to send message',
      });
      throw error;
    }
  },
  
  markMessageAsRead: async (messageId: number) => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    
    try {
      await fetch(`/api/messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Update message in current conversation
      set(state => ({
        currentConversation: state.currentConversation.map(message => 
          message.id === messageId ? { ...message, isRead: true } : message
        ),
      }));
      
      // Refresh messages
      get().fetchMessages();
    } catch (error: any) {
      console.error('Failed to mark message as read:', error);
    }
  },
  
  setSelectedUser: (userId: number | null) => {
    set({ selectedUserId: userId });
    if (userId) {
      get().fetchConversation(userId);
    } else {
      set({ currentConversation: [] });
    }
  },
  
  clearError: () => {
    set({ error: null });
  },
}));
