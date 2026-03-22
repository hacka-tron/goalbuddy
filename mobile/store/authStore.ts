import { create } from 'zustand';
import { setToken, clearToken } from '../lib/api';

interface User {
  id: string;
  email: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  theme: string;
  notification_frequency: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  setAuth: async (token, user) => {
    await setToken(token);
    set({ token, user, isLoading: false });
  },
  updateUser: (updates) =>
    set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
  logout: async () => {
    await clearToken();
    set({ user: null, token: null, isLoading: false });
  },
}));
