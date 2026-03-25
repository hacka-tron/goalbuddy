import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setToken, clearToken, getToken } from '../lib/api';

const USER_KEY = 'cached_user';

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
  restoreFromCache: () => Promise<{ token: string; user: User } | null>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  setAuth: async (token, user) => {
    await Promise.all([
      setToken(token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
    set({ token, user, isLoading: false });
  },
  updateUser: (updates) =>
    set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
  logout: async () => {
    await Promise.all([clearToken(), AsyncStorage.removeItem(USER_KEY)]);
    set({ user: null, token: null, isLoading: false });
  },
  restoreFromCache: async () => {
    const [token, userJson] = await Promise.all([
      getToken(),
      AsyncStorage.getItem(USER_KEY),
    ]);
    if (!token || !userJson) {
      set({ isLoading: false });
      return null;
    }
    const user = JSON.parse(userJson) as User;
    set({ token, user, isLoading: false });
    return { token, user };
  },
}));
