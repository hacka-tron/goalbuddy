import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline_mutation_queue';

export interface QueuedMessage {
  id: string;
  connectionId: string;
  message: string;
  mood: string;
  createdAt: string;
  retries: number;
}

interface OfflineQueueState {
  queue: QueuedMessage[];
  isProcessing: boolean;
  loadQueue: () => Promise<void>;
  enqueue: (item: Omit<QueuedMessage, 'retries'>) => Promise<void>;
  dequeue: (id: string) => Promise<void>;
  processQueue: (sendFn: (item: QueuedMessage) => Promise<void>) => Promise<void>;
}

export const useOfflineQueueStore = create<OfflineQueueState>((set, get) => ({
  queue: [],
  isProcessing: false,

  loadQueue: async () => {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (raw) set({ queue: JSON.parse(raw) });
  },

  enqueue: async (item) => {
    const entry: QueuedMessage = { ...item, retries: 0 };
    const queue = [...get().queue, entry];
    set({ queue });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  dequeue: async (id) => {
    const queue = get().queue.filter((q) => q.id !== id);
    set({ queue });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  processQueue: async (sendFn) => {
    if (get().isProcessing || get().queue.length === 0) return;
    set({ isProcessing: true });
    const [item, ...rest] = get().queue;
    try {
      await sendFn(item);
      await get().dequeue(item.id);
    } catch {
      if (item.retries >= 4) {
        await get().dequeue(item.id); // drop after 5 attempts
      } else {
        const updated = { ...item, retries: item.retries + 1 };
        const queue = [updated, ...rest];
        set({ queue });
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        // Exponential backoff
        const delay = Math.min(1000 * 2 ** item.retries, 30000);
        setTimeout(() => get().processQueue(sendFn), delay);
      }
    } finally {
      set({ isProcessing: false });
    }
  },
}));
