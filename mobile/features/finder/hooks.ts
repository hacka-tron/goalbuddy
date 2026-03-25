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
  return useQuery<Candidate[]>({
    queryKey: ['deck', selectedGoalId],
    queryFn: () => fetchDeck(selectedGoalId!),
    enabled: !!selectedGoalId,
  });
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
    },
  });
}
