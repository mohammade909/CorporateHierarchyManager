import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest, uploadFile, ApiResponse } from '@/lib/queryClient';

export interface ZoomMeeting {
  id: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  password?: string;
  join_url: string;
  host_id: string;
  created_at: string;
}

export interface ZoomContact {
  id: number;
  firstName: string;
  lastName: string;
  email:string,
  role: 'super_admin' | 'company_admin' | 'manager' | 'employee';
  companyId: number;
  managerId?: number;
}

export interface ZoomMessage {
  id: string;
  message: string;
  sender: string;
  date_time: string;
  timestamp: number;
  type?: 'text' | 'voice' | 'file';
}

export interface CreateMeetingRequest {
  topic?: string;
  start_time?: string;
  duration?: number;
  password?: string;
}

interface ZoomState {
  meetings: ZoomMeeting[];
  contacts: ZoomContact[];
  messages: Record<string, ZoomMessage[]>;
  selectedContact: ZoomContact | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchMeetings: () => Promise<void>;
  createMeeting: (meetingData: CreateMeetingRequest) => Promise<ZoomMeeting>;
  deleteMeeting: (meetingId: string) => Promise<void>;
  updateMeeting: (meetingId: string, meetingData: Partial<CreateMeetingRequest>) => Promise<void>;
  
  fetchContacts: () => Promise<void>;
  
  sendMessage: (contactId: number, message: string) => Promise<void>;
  fetchMessages: (contactId: number) => Promise<void>;
  sendVoiceMessage: (contactId: number, audioBlob: Blob) => Promise<void>;
  
  setSelectedContact: (contact: ZoomContact | null) => void;
  clearError: () => void;
}

export const useZoomStore = create<ZoomState>()(
  persist(
    (set, get) => ({
      meetings: [],
      contacts: [],
      messages: {},
      selectedContact: null,
      isLoading: false,
      error: null,

      fetchMeetings: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiRequest('GET', '/api/zoom/meetings');
          const data: ApiResponse<ZoomMeeting[]> = await response.json();
          
          if (data.success && data.data) {
            set({ meetings: data.data, isLoading: false });
          } else {
            throw new Error(data.error || 'Failed to fetch meetings');
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      createMeeting: async (meetingData: CreateMeetingRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiRequest('POST', '/api/zoom/meetings', meetingData);
          const data: ApiResponse<ZoomMeeting> = await response.json();
          
          if (data.success && data.data) {
            const { meetings } = get();
            set({ 
              meetings: [...meetings, data.data], 
              isLoading: false 
            });
            return data.data;
          } else {
            throw new Error(data.error || 'Failed to create meeting');
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      deleteMeeting: async (meetingId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiRequest('DELETE', `/api/zooom/meetings/${meetingId}`);
          const data: ApiResponse = await response.json();
          
          if (data.success) {
            const { meetings } = get();
            set({ 
              meetings: meetings.filter(m => m.id !== meetingId), 
              isLoading: false 
            });
          } else {
            throw new Error(data.error || 'Failed to delete meeting');
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateMeeting: async (meetingId: string, meetingData: Partial<CreateMeetingRequest>) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiRequest('PATCH', `/api/zoom/meetings/${meetingId}`, meetingData);
          const data: ApiResponse<ZoomMeeting> = await response.json();
          
          if (data.success && data.data) {
            const { meetings } = get();
            set({ 
              meetings: meetings.map(m => m.id === meetingId ? data.data! : m), 
              isLoading: false 
            });
          } else {
            throw new Error(data.error || 'Failed to update meeting');
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      fetchContacts: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiRequest('GET', '/api/zoom/contacts');
          const data: ApiResponse<ZoomContact[]> = await response.json();
          
          if (data.success && data.data) {
            set({ contacts: data.data, isLoading: false });
          } else {
            throw new Error(data.error || 'Failed to fetch contacts');
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      fetchMessages: async (contactId: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiRequest('GET', `/api/zoom/chat/messages/${contactId}`);
          const data: ApiResponse<ZoomMessage[]> = await response.json();
          
          if (data.success && data.data) {
            const { messages } = get();
            set({ 
              messages: { ...messages, [contactId]: data.data }, 
              isLoading: false 
            });
          } else {
            throw new Error(data.error || 'Failed to fetch messages');
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      sendMessage: async (contactId: number, message: string) => {
        try {
          const response = await apiRequest('POST', '/api/zoom/chat/send', {
            to_contact: contactId,
            message
          });
          const data: ApiResponse = await response.json();
          
          if (!data.success) {
            throw new Error(data.error || 'Failed to send message');
          }
          
          // Refresh messages after sending
          get().fetchMessages(contactId);
        } catch (error: any) {
          set({ error: error.message });
          throw error;
        }
      },

      sendVoiceMessage: async (contactId: number, audioBlob: Blob) => {
        try {
          const formData = new FormData();
          formData.append('voice', audioBlob, 'voice-message.webm');
          formData.append('to_contact', contactId.toString());

          const response = await uploadFile('/api/zoom/chat/voice', formData);
          const data: ApiResponse = await response.json();
          
          if (!data.success) {
            throw new Error(data.error || 'Failed to send voice message');
          }
          
          // Refresh messages after sending
          get().fetchMessages(contactId);
        } catch (error: any) {
          set({ error: error.message });
          throw error;
        }
      },

      setSelectedContact: (contact: ZoomContact | null) => {
        set({ selectedContact: contact });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'zoom-app-store',
      partialize: (state) => ({
        meetings: state.meetings,
        contacts: state.contacts,
        selectedContact: state.selectedContact,
      }),
    }
  )
);