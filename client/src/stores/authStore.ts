import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../lib/types';
import { api } from '../api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setAuth: (user: User, token: string, refreshToken: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,

      setAuth: (user, token, refreshToken) => {
        localStorage.setItem('debtwise_token', token);
        localStorage.setItem('debtwise_refresh', refreshToken);
        set({ user, token, refreshToken, isAuthenticated: true });
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.auth.login({ email, password });
          if ('mfaRequired' in res) {
            set({ isLoading: false });
            throw new Error('MFA_REQUIRED');
          }
          get().setAuth(res.user, res.token, res.refreshToken);
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const res = await api.auth.register(data);
          get().setAuth(res.user, res.token, res.refreshToken);
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem('debtwise_token');
        localStorage.removeItem('debtwise_refresh');
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },

      refreshAuth: async () => {
        const rt = get().refreshToken;
        if (!rt) return;
        try {
          const res = await api.auth.refresh(rt);
          localStorage.setItem('debtwise_token', res.token);
          localStorage.setItem('debtwise_refresh', res.refreshToken);
          set({ token: res.token, refreshToken: res.refreshToken });
        } catch {
          get().logout();
        }
      },

      updateUser: (data) => {
        const user = get().user;
        if (user) set({ user: { ...user, ...data } });
      },
    }),
    {
      name: 'debtwise-auth',
      partialize: (state) => ({ user: state.user, token: state.token, refreshToken: state.refreshToken, isAuthenticated: state.isAuthenticated }),
    }
  )
);
