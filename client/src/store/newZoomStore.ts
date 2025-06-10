// store/zoomStore.ts
import { create } from 'zustand';
import axios from 'axios';

export interface ZoomContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyId?: string;
  managerId?: string;
  role?: string;
  jid?: string; // Zoom JID for chat
  presence_status?: 'available' | 'away' | 'busy' | 'do_not_disturb' | 'offline';
}

export interface ZoomMessage {
  id: string;
  message: string;
  sender: string;
  senderEmail?: string;
  date_time: string;
  timestamp: number;
  to_jid?: string;
  to_contact?: string;
  message_type?: 'text' | 'voice' | 'file';
  file_url?: string;
  file_name?: string;
  reply_main_message_id?: string;
}

export interface ZoomChannel {
  id: string;
  name: string;
  type: number;
  jid?: string;
  member_count?: number;
  created_at?: string;
}

interface ZoomState {
  contacts: ZoomContact[];
  messages: Record<string, ZoomMessage[]>;
  channels: ZoomChannel[];
  selectedContact: ZoomContact | null;
  selectedChannel: ZoomChannel | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchContacts: () => Promise<void>;
  fetchMessages: (contactId: string, isChannel?: boolean) => Promise<void>;
  sendMessage: (contactId: string, message: string, isChannel?: boolean) => Promise<void>;
  sendVoiceMessage: (contactId: string, audioBlob: Blob, isChannel?: boolean) => Promise<void>;
  sendFileMessage: (contactId: string, file: File, isChannel?: boolean) => Promise<void>;
  editMessage: (messageId: string, newMessage: string, targetId: string, isChannel?: boolean) => Promise<void>;
  deleteMessage: (messageId: string, targetId: string, isChannel?: boolean) => Promise<void>;
  fetchChannels: () => Promise<void>;
  createChannel: (name: string, type: number, members?: string[]) => Promise<void>;
  setSelectedContact: (contact: ZoomContact | null) => void;
  setSelectedChannel: (channel: ZoomChannel | null) => void;
  clearError: () => void;
}

const API_BASE = '/api/chat';

export const useZoomStore = create<ZoomState>((set, get) => ({
  contacts: [],
  messages: {},
  channels: [],
  selectedContact: null,
  selectedChannel: null,
  isLoading: false,
  error: null,

  fetchContacts: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // First get all users from your existing API
      const usersResponse = await axios.get('/api/users');
      const users = usersResponse.data;
      
      // Convert users to contacts format and add Zoom JIDs
      const contacts: ZoomContact[] = users.map((user: any) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        companyId: user.companyId,
        managerId: user.managerId,
        role: user.role,
        jid: user.email, // Use email as JID for direct messages
        presence_status: 'available'
      }));

      set({ contacts, isLoading: false });
    } catch (error) {
      console.error('Error fetching contacts:', error);
      set({ 
        error: 'Failed to fetch contacts', 
        isLoading: false 
      });
    }
  },

  fetchMessages: async (targetId: string, isChannel = false) => {
    try {
      set({ isLoading: true, error: null });
      
      const params = new URLSearchParams();
      if (isChannel) {
        params.append('to_channel', targetId);
      } else {
        // For direct messages, use the contact's email
        const contact = get().contacts.find(c => c.id === targetId);
        if (contact) {
          params.append('to_contact', contact.email);
        }
      }
      
      // Get messages from last 30 days
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
      params.append('from_date', fromDate.toISOString().split('T')[0]);
      params.append('page_size', '100');

      const response = await axios.get(`${API_BASE}/messages?${params.toString()}`);
      
      if (response.data.success) {
        const messages = response.data.data.messages || [];
        set(state => ({
          messages: {
            ...state.messages,
            [targetId]: messages
          },
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      set({ 
        error: 'Failed to fetch messages', 
        isLoading: false 
      });
    }
  },

  sendMessage: async (targetId: string, message: string, isChannel = false) => {
    try {
      const messageData: any = { message };
      
      if (isChannel) {
        messageData.to_channel = targetId;
      } else {
        // For direct messages, use the contact's email
        const contact = get().contacts.find(c => c.id === targetId);
        if (contact) {
          messageData.to_contact = contact.email;
        }
      }

      const response = await axios.post(`${API_BASE}/messages`, messageData);
      
      if (response.data.success) {
        // Refresh messages to show the new message
        await get().fetchMessages(targetId, isChannel);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  },

  sendVoiceMessage: async (targetId: string, audioBlob: Blob, isChannel = false) => {
    try {
      // First upload the voice file
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-message.webm');
      
      if (isChannel) {
        formData.append('to_channel', targetId);
      } else {
        const contact = get().contacts.find(c => c.id === targetId);
        if (contact) {
          formData.append('to_contact', contact.email);
        }
      }

      const response = await axios.post(`${API_BASE}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // Refresh messages to show the new voice message
        await get().fetchMessages(targetId, isChannel);
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
      throw new Error('Failed to send voice message');
    }
  },

  sendFileMessage: async (targetId: string, file: File, isChannel = false) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (isChannel) {
        formData.append('to_channel', targetId);
      } else {
        const contact = get().contacts.find(c => c.id === targetId);
        if (contact) {
          formData.append('to_contact', contact.email);
        }
      }

      const response = await axios.post(`${API_BASE}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        await get().fetchMessages(targetId, isChannel);
      }
    } catch (error) {
      console.error('Error sending file:', error);
      throw new Error('Failed to send file');
    }
  },

  editMessage: async (messageId: string, newMessage: string, targetId: string, isChannel = false) => {
    try {
      const updateData: any = { message: newMessage };
      
      if (isChannel) {
        updateData.to_channel = targetId;
      } else {
        const contact = get().contacts.find(c => c.id === targetId);
        if (contact) {
          updateData.to_contact = contact.email;
        }
      }

      const response = await axios.patch(`${API_BASE}/messages/${messageId}`, updateData);
      
      if (response.data.success) {
        await get().fetchMessages(targetId, isChannel);
      }
    } catch (error) {
      console.error('Error editing message:', error);
      throw new Error('Failed to edit message');
    }
  },

  deleteMessage: async (messageId: string, targetId: string, isChannel = false) => {
    try {
      const params = new URLSearchParams();
      
      if (isChannel) {
        params.append('to_channel', targetId);
      } else {
        const contact = get().contacts.find(c => c.id === targetId);
        if (contact) {
          params.append('to_contact', contact.email);
        }
      }

      const response = await axios.delete(`${API_BASE}/messages/${messageId}?${params.toString()}`);
      
      if (response.data.success) {
        await get().fetchMessages(targetId, isChannel);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }
  },

  fetchChannels: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await axios.get(`${API_BASE}/channels`);
      
      if (response.data.success) {
        set({ 
          channels: response.data.data,
          isLoading: false 
        });
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
      set({ 
        error: 'Failed to fetch channels', 
        isLoading: false 
      });
    }
  },

  createChannel: async (name: string, type: number = 3, members: string[] = []) => {
    try {
      const response = await axios.post(`${API_BASE}/channels`, {
        name,
        type,
        members
      });
      
      if (response.data.success) {
        // Refresh channels list
        await get().fetchChannels();
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      throw new Error('Failed to create channel');
    }
  },

  setSelectedContact: (contact) => {
    set({ selectedContact: contact, selectedChannel: null });
  },

  setSelectedChannel: (channel) => {
    set({ selectedChannel: channel, selectedContact: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));