import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: number | null;
  managerId: number | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      
      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiRequest('POST', '/api/auth/login', { username, password });
          const data = await response.json();
          
          set({ 
            token: data.token,
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to login',
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },
      
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiRequest('POST', '/api/auth/register', userData);
          const data = await response.json();
          
          // Note: We don't automatically log in after registration
          set({ isLoading: false });
          return data;
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to register',
            isLoading: false,
          });
          throw error;
        }
      },
      
      logout: () => {
        set({ 
          token: null,
          user: null,
          isAuthenticated: false,
        });
      },
      
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'corporate-hierarchy-auth', // Name for localStorage
      partialize: (state) => ({ 
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
