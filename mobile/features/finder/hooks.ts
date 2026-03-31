import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { fetchMyGoals, fetchDeck, swipe } from './api';
import { Goal, Candidate } from './types';
import { goalKeys } from '../goals/hooks';
import { buddyKeys } from '../buddies/hooks';

// ─── Query Key Factories ────────────────────────────────────

export const finderKeys = {
  all: ['finder'] as const,
  deck: (goalId: string | null) => [...finderKeys.all, 'deck', goalId] as const,
};

// ─── Hooks ──────────────────────────────────────────────────

export function useMyGoals() {
  return useQuery<Goal[]>({
    queryKey: goalKeys.all,
    queryFn: fetchMyGoals,
  });
}

export function useDeck(selectedGoalId: string | null) {
  const result = useQuery({
    queryKey: finderKeys.deck(selectedGoalId),
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
    mutationFn: (body: { swipedId: string; action: string; mode: string; goalId?: string; cardGoalId?: string }) =>
      swipe(body),
    onSuccess: (data) => {
      if (data.matched) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onMatch(deck[deckIndex]);
      }
      onAdvance();
      resetPosition();
      qc.invalidateQueries({ queryKey: buddyKeys.all });
      qc.invalidateQueries({ queryKey: finderKeys.deck(selectedGoalId) });
    },
  });
}
