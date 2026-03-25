import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_KEY = 'chat_last_seen';

interface NotificationState {
  lastSeenAt: Record<string, string>; // connectionId → ISO timestamp
  unreadCount: number;
  unreadIds: Record<string, boolean>; // connectionId → unread?
  loadSeenTimes: () => Promise<void>;
  markRead: (connectionId: string, serverTimestamp?: string) => Promise<void>;
  setUnread: (ids: string[], count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  lastSeenAt: {},
  unreadCount: 0,
  unreadIds: {},

  loadSeenTimes: async () => {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    if (raw) set({ lastSeenAt: JSON.parse(raw) });
  },

  markRead: async (connectionId, serverTimestamp) => {
    const ts = serverTimestamp ?? new Date().toISOString();
    const updated = { ...get().lastSeenAt, [connectionId]: ts };
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(updated));
    const unreadIds = { ...get().unreadIds, [connectionId]: false };
    const count = Object.values(unreadIds).filter(Boolean).length;
    set({ lastSeenAt: updated, unreadIds, unreadCount: count });
  },

  setUnread: (ids, count) => {
    const unreadIds: Record<string, boolean> = {};
    ids.forEach((id) => { unreadIds[id] = true; });
    set({ unreadIds, unreadCount: count });
  },
}));
