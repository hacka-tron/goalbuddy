import { StateCreator } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface User {
  id: string;
  email: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  theme: string;
  notification_frequency: string;
}

export interface AuthSlice {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  actions: {
    setAuth: (token: string, user: User) => void;
    updateUser: (updates: Partial<User>) => void;
    logout: () => void;
    hydrate: () => void;
  };
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  actions: {
    setAuth: (token, user) => {
      storage.set(TOKEN_KEY, token);
      storage.set(USER_KEY, JSON.stringify(user));
      set({ token, user, isAuthenticated: true, isLoading: false });
    },
    updateUser: (updates) =>
      set((state) => {
        const newUser = state.user ? { ...state.user, ...updates } : null;
        if (newUser) storage.set(USER_KEY, JSON.stringify(newUser));
        return { user: newUser };
      }),
    logout: () => {
      storage.delete(TOKEN_KEY);
      storage.delete(USER_KEY);
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    },
    hydrate: () => {
      const token = storage.getString(TOKEN_KEY);
      const userJson = storage.getString(USER_KEY);
      if (token && userJson) {
        set({
          token,
          user: JSON.parse(userJson),
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    },
  },
});
