import { StateCreator } from 'zustand';

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
  isLoading: false,
  actions: {
    setAuth: (token, user) => set({ token, user, isAuthenticated: true, isLoading: false }),
    updateUser: (updates) =>
      set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
    logout: () => set({ user: null, token: null, isAuthenticated: false, isLoading: false }),
    hydrate: () => {},
  },
});
