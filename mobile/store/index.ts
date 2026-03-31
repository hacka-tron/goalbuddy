import { create } from 'zustand';
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createThemeSlice, ThemeSlice } from './slices/themeSlice';
import { createNotificationSlice, NotificationSlice } from './slices/notificationSlice';

type StoreState = AuthSlice & ThemeSlice & NotificationSlice;

export const useStore = create<StoreState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createThemeSlice(...a),
  ...createNotificationSlice(...a),
}));

// Auth selectors
export const useAuthActions = () => useStore((s) => s.actions);

// Re-export slice types for consumers that need them
export type { AuthSlice, ThemeSlice, NotificationSlice };
export type { BuddyTabKey } from './slices/notificationSlice';
