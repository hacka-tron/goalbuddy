import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMyGoals, fetchDeck, swipe } from './api';
import { Goal, Candidate } from './types';

export function useMyGoals() {
  return useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: fetchMyGoals,
  });
}

export function useDeck(selectedGoalId: string | null) {
  const result = useQuery({
    queryKey: ['deck', selectedGoalId],
    queryFn: () => fetchDeck(selectedGoalId!),
    enabled: !!selectedGoalId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  return {
    ...result,
    data: result.data?.candidates ?? [],
    isLocked: result.data?.locked ?? false,
  };
}

export function useSwipe(
  deck: Candidate[],
  deckIndex: number,
  onMatch: (card: Candidate) => void,
  onAdvance: () => void,
  resetPosition: () => void,
  selectedGoalId: string | null
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { swipedId: string; action: string; mode: string; goalId?: string }) =>
      swipe(body),
    onSuccess: (data) => {
      if (data.matched) onMatch(deck[deckIndex]);
      onAdvance();
      resetPosition();
      qc.invalidateQueries({ queryKey: ['buddies'] });
      qc.invalidateQueries({ queryKey: ['deck', selectedGoalId] });
    },
  });
}
