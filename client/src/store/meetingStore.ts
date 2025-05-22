import { create } from 'zustand';
import { apiRequest } from '@/lib/queryClient';
import { useAuthStore } from './authStore';

interface Meeting {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  zoomMeetingId: string | null;
  zoomPassword: string | null;
  zoomJoinUrl: string | null;
  organizerId: number;
  companyId: number;
  createdAt: string;
  participants?: { id: number; firstName: string; lastName: string; role: string }[];
}

interface MeetingState {
  meetings: Meeting[];
  selectedMeeting: Meeting | null;
  upcomingMeetings: Meeting[];
  pastMeetings: Meeting[];
  isLoading: boolean;
  error: string | null;
  
  fetchMeetings: () => Promise<void>;
  fetchMeeting: (meetingId: number) => Promise<void>;
  scheduleMeeting: (meetingData: any) => Promise<void>;
  updateMeeting: (meetingId: number, meetingData: any) => Promise<void>;
  deleteMeeting: (meetingId: number) => Promise<void>;
  setSelectedMeeting: (meeting: Meeting | null) => void;
  clearError: () => void;
}

export const useMeetingStore = create<MeetingState>((set, get) => ({
  meetings: [],
  selectedMeeting: null,
  upcomingMeetings: [],
  pastMeetings: [],
  isLoading: false,
  error: null,
  
  fetchMeetings: async () => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/meetings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch meetings');
      }
      
      const data = await response.json();
      
      // Sort meetings into upcoming and past
      const now = new Date();
      const upcoming = data.filter((meeting: Meeting) => new Date(meeting.startTime) > now)
        .sort((a: Meeting, b: Meeting) => 
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
      
      const past = data.filter((meeting: Meeting) => new Date(meeting.startTime) <= now)
        .sort((a: Meeting, b: Meeting) => 
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
      
      set({ 
        meetings: data, 
        upcomingMeetings: upcoming,
        pastMeetings: past,
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to fetch meetings',
        isLoading: false,
      });
    }
  },
  
  fetchMeeting: async (meetingId: number) => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch meeting details');
      }
      
      const data = await response.json();
      set({ selectedMeeting: data, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to fetch meeting details',
        isLoading: false,
      });
    }
  },
  
  scheduleMeeting: async (meetingData: any) => {
    try {
      const response = await apiRequest('POST', '/api/meetings', meetingData);
      
      if (!response.ok) {
        throw new Error('Failed to schedule meeting');
      }
      
      // Refresh meetings
      get().fetchMeetings();
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to schedule meeting',
      });
      throw error;
    }
  },
  
  updateMeeting: async (meetingId: number, meetingData: any) => {
    try {
      const response = await apiRequest('PUT', `/api/meetings/${meetingId}`, meetingData);
      
      if (!response.ok) {
        throw new Error('Failed to update meeting');
      }
      
      // Refresh meetings and selected meeting
      get().fetchMeetings();
      if (get().selectedMeeting?.id === meetingId) {
        get().fetchMeeting(meetingId);
      }
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to update meeting',
      });
      throw error;
    }
  },
  
  deleteMeeting: async (meetingId: number) => {
    try {
      const response = await apiRequest('DELETE', `/api/meetings/${meetingId}`);
      
      if (!response.ok) {
        throw new Error('Failed to delete meeting');
      }
      
      // Remove from state
      set(state => ({
        meetings: state.meetings.filter(meeting => meeting.id !== meetingId),
        upcomingMeetings: state.upcomingMeetings.filter(meeting => meeting.id !== meetingId),
        pastMeetings: state.pastMeetings.filter(meeting => meeting.id !== meetingId),
        selectedMeeting: state.selectedMeeting?.id === meetingId ? null : state.selectedMeeting,
      }));
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to delete meeting',
      });
      throw error;
    }
  },
  
  setSelectedMeeting: (meeting: Meeting | null) => {
    set({ selectedMeeting: meeting });
  },
  
  clearError: () => {
    set({ error: null });
  },
}));
