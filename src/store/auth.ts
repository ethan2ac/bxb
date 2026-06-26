import { create } from 'zustand';
import type { User } from '../types';
import { api, ApiError } from '../lib/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const result = await api.post<{ user: User }>('/api/auth/login', { email, password });
      set({ user: result.user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  logout: async () => {
    await api.post('/api/auth/logout');
    set({ user: null });
  },

  checkAuth: async () => {
    try {
      const result = await api.get<{ user: User }>('/api/auth/me');
      set({ user: result.user, initialized: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        set({ user: null, initialized: true });
      } else {
        set({ initialized: true });
      }
    }
  },
}));
