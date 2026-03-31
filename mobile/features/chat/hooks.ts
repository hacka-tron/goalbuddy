import { useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchConnection, fetchCheckIns, sendCheckIn, fetchGoalStats, GoalStats } from './api';
import { CheckIn, CheckInsPage, Connection } from './types';
import { useOfflineQueueStore } from '../../store/offlineQueueStore';

// ─── Query Key Factories ────────────────────────────────────

export const chatKeys = {
  all: ['chats'] as const,
  connection: (id: string) => [...chatKeys.all, 'connection', id] as const,
  checkins: (id: string) => [...chatKeys.all, 'checkins', id] as const,
  stats: (id: string) => [...chatKeys.all, 'stats', id] as const,
};

// ─── Hooks ──────────────────────────────────────────────────

export function useConnection(connectionId: string) {
  return useQuery<Connection>({
    queryKey: chatKeys.connection(connectionId),
    queryFn: () => fetchConnection(connectionId),
    enabled: !!connectionId,
  });
}

export function useGoalStats(connectionId: string, enabled: boolean) {
  return useQuery<GoalStats>({
    queryKey: chatKeys.stats(connectionId),
    queryFn: () => fetchGoalStats(connectionId),
    enabled: !!connectionId && enabled,
    staleTime: 30000,
  });
}

export function useCheckIns(connectionId: string) {
  return useInfiniteQuery<CheckInsPage>({
    queryKey: chatKeys.checkins(connectionId),
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      fetchCheckIns(connectionId, pageParam as string | undefined),
    getNextPageParam: (lastPage: CheckInsPage) =>
      lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined,
    initialPageParam: undefined,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 5000,
    enabled: !!connectionId,
  });
}

export function useSendMessage(connectionId: string, conn: Connection | undefined) {
  const qc = useQueryClient();
  const enqueue = useOfflineQueueStore((s) => s.enqueue);
  const processQueue = useOfflineQueueStore((s) => s.processQueue);
  const loadQueue = useOfflineQueueStore((s) => s.loadQueue);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const processQueueFn = async () => {
      await processQueue(async (item) => {
        await sendCheckIn(item.connectionId, item.message, item.mood);
        qc.invalidateQueries({ queryKey: chatKeys.checkins(item.connectionId) });
      });
    };

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        processQueueFn();
      }
    });

    return () => sub.remove();
  }, [processQueue, qc]);

  const mutation = useMutation({
    mutationFn: (msg: string) => sendCheckIn(connectionId, msg, 'good'),
    onMutate: async (msg: string) => {
      await qc.cancelQueries({ queryKey: chatKeys.checkins(connectionId) });
      const previous = qc.getQueryData(chatKeys.checkins(connectionId));
      const tempMessage: CheckIn = {
        id: `temp-${Date.now()}`,
        author_id: conn?.buddy_id ? 'me' : '',
        message: msg,
        mood: 'good',
        display_name: 'You',
        created_at: new Date().toISOString(),
        milestone_title: null,
        syncStatus: 'pending',
      };
      qc.setQueryData<{ pages: CheckInsPage[]; pageParams: unknown[] }>(
        chatKeys.checkins(connectionId),
        (old) => {
          if (!old) return old;
          const newPages = [...old.pages];
          newPages[0] = {
            ...newPages[0],
            messages: [tempMessage, ...(newPages[0]?.messages ?? [])],
          };
          return { ...old, pages: newPages };
        }
      );
      return { previous };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatKeys.checkins(connectionId) });
    },
    onError: async (_err: Error, msg: string, context: { previous: unknown } | undefined) => {
      if (context?.previous) {
        qc.setQueryData(chatKeys.checkins(connectionId), context.previous);
      }
      const isNetworkError =
        _err.message.includes('Network') ||
        _err.message.includes('fetch') ||
        _err.message.includes('Failed') ||
        _err.message.includes('network');
      if (isNetworkError) {
        await enqueue({
          id: `offline-${Date.now()}`,
          connectionId,
          message: msg,
          mood: 'good',
          createdAt: new Date().toISOString(),
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: chatKeys.checkins(connectionId) });
    },
  });

  const sendFn = useCallback(
    async (item: import('../../store/offlineQueueStore').QueuedMessage) => {
      await sendCheckIn(item.connectionId, item.message, item.mood);
      qc.invalidateQueries({ queryKey: chatKeys.checkins(item.connectionId) });
    },
    [qc]
  );

  return { mutation, sendFn };
}
