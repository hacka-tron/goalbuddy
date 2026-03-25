import { useQuery } from '@tanstack/react-query';
import { fetchWinsFeed } from './api';
import { WinItem } from './types';

export function useWinsFeed() {
  return useQuery<WinItem[]>({
    queryKey: ['milestones', 'feed'],
    queryFn: fetchWinsFeed,
  });
}
