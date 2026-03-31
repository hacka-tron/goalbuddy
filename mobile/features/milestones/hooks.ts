import { useQuery } from '@tanstack/react-query';
import { fetchWinsFeed } from './api';
import { WinItem } from './types';

// ─── Query Key Factories ────────────────────────────────────

export const milestoneKeys = {
  all: ['milestones'] as const,
  feed: () => [...milestoneKeys.all, 'feed'] as const,
  me: () => [...milestoneKeys.all, 'me'] as const,
  goal: (id: string) => [...milestoneKeys.all, 'goal', id] as const,
};

// ─── Hooks ──────────────────────────────────────────────────

export function useWinsFeed() {
  return useQuery<WinItem[]>({
    queryKey: milestoneKeys.feed(),
    queryFn: fetchWinsFeed,
  });
}
