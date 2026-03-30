import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_KEY = 'chat_last_seen';
const SUBTAB_SEEN_KEY = 'subtab_last_seen';

export type BuddyTabKey = 'my_goals' | 'coaching' | 'coop';

interface NotificationState {
  lastSeenAt: Record<string, string>;        // connectionId → ISO timestamp
  subTabLastSeen: Record<BuddyTabKey, string>; // tabKey → ISO timestamp
  unreadCount: number;
  unreadIds: Record<string, boolean>;
  pendingRequestCount: number;
  loadSeenTimes: () => Promise<void>;
  markRead: (connectionId: string, serverTimestamp?: string) => Promise<void>;
  markSubTabSeen: (tabKey: BuddyTabKey) => Promise<void>;
  setUnread: (ids: string[], count: number) => void;
  setPendingRequestCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  lastSeenAt: {},
  subTabLastSeen: { my_goals: '', coaching: '', coop: '' },
  unreadCount: 0,
  unreadIds: {},
  pendingRequestCount: 0,

  loadSeenTimes: async () => {
    const [chatRaw, subTabRaw] = await Promise.all([
      AsyncStorage.getItem(SEEN_KEY),
      AsyncStorage.getItem(SUBTAB_SEEN_KEY),
    ]);
    const lastSeenAt = chatRaw ? JSON.parse(chatRaw) : {};
    const subTabLastSeen = subTabRaw
      ? { my_goals: '', coaching: '', coop: '', ...JSON.parse(subTabRaw) }
      : { my_goals: '', coaching: '', coop: '' };
    set({ lastSeenAt, subTabLastSeen });
  },

  markRead: async (connectionId, serverTimestamp) => {
    const ts = serverTimestamp ?? new Date().toISOString();
    const updated = { ...get().lastSeenAt, [connectionId]: ts };
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(updated));
    const unreadIds = { ...get().unreadIds, [connectionId]: false };
    const count = Object.values(unreadIds).filter(Boolean).length;
    set({ lastSeenAt: updated, unreadIds, unreadCount: count });
  },

  markSubTabSeen: async (tabKey) => {
    const ts = new Date().toISOString();
    const updated = { ...get().subTabLastSeen, [tabKey]: ts };
    await AsyncStorage.setItem(SUBTAB_SEEN_KEY, JSON.stringify(updated));
    set({ subTabLastSeen: updated });
  },

  setUnread: (ids, count) => {
    const unreadIds: Record<string, boolean> = {};
    ids.forEach((id) => { unreadIds[id] = true; });
    set({ unreadIds, unreadCount: count });
  },

  setPendingRequestCount: (count) => set({ pendingRequestCount: count }),
}));
