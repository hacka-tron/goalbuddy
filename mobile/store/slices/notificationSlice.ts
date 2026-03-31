import { StateCreator } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_KEY = 'chat_last_seen';
const SUBTAB_SEEN_KEY = 'subtab_last_seen';

export type BuddyTabKey = 'my_goals' | 'coaching' | 'coop';

export interface NotificationSlice {
  lastSeenAt: Record<string, string>;
  subTabLastSeen: Record<BuddyTabKey, string>;
  unreadCount: number;
  unreadIds: Record<string, boolean>;
  pendingRequestCount: number;
  loadSeenTimes: () => void;
  markRead: (connectionId: string, serverTimestamp?: string) => void;
  markSubTabSeen: (tabKey: BuddyTabKey) => void;
  setUnread: (ids: string[], count: number) => void;
  setPendingRequestCount: (count: number) => void;
}

export const createNotificationSlice: StateCreator<NotificationSlice> = (set, get) => ({
  lastSeenAt: {},
  subTabLastSeen: { my_goals: '', coaching: '', coop: '' },
  unreadCount: 0,
  unreadIds: {},
  pendingRequestCount: 0,

  loadSeenTimes: () => {
    AsyncStorage.multiGet([SEEN_KEY, SUBTAB_SEEN_KEY]).then(([[, chatRaw], [, subTabRaw]]) => {
      const lastSeenAt = chatRaw ? JSON.parse(chatRaw) : {};
      const subTabLastSeen = subTabRaw
        ? { my_goals: '', coaching: '', coop: '', ...JSON.parse(subTabRaw) }
        : { my_goals: '', coaching: '', coop: '' };
      set({ lastSeenAt, subTabLastSeen });
    });
  },

  markRead: (connectionId, serverTimestamp) => {
    const ts = serverTimestamp ?? new Date().toISOString();
    const updated = { ...get().lastSeenAt, [connectionId]: ts };
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify(updated));
    const unreadIds = { ...get().unreadIds, [connectionId]: false };
    const count = Object.values(unreadIds).filter(Boolean).length;
    set({ lastSeenAt: updated, unreadIds, unreadCount: count });
  },

  markSubTabSeen: (tabKey) => {
    const ts = new Date().toISOString();
    const updated = { ...get().subTabLastSeen, [tabKey]: ts };
    AsyncStorage.setItem(SUBTAB_SEEN_KEY, JSON.stringify(updated));
    set({ subTabLastSeen: updated });
  },

  setUnread: (ids, count) => {
    const unreadIds: Record<string, boolean> = {};
    ids.forEach((id) => { unreadIds[id] = true; });
    set({ unreadIds, unreadCount: count });
  },

  setPendingRequestCount: (count) => set({ pendingRequestCount: count }),
});
