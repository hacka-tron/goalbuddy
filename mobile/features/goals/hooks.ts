import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import {
  fetchGoals,
  fetchPublicGoals,
  fetchGoalMilestones,
  fetchMyMilestones,
  fetchGoalStats,
  createGoal,
  patchGoalPublic,
  patchGoalCoopOpen,
  toggleMilestone as toggleMilestoneApi,
  createMilestone as createMilestoneApi,
  deleteGoal as deleteGoalApi,
  requestBuddy as requestBuddyApi,
  coopJoinGoal as coopJoinGoalApi,
  useGoalTemplate as useGoalTemplateApi,
} from './api';
import { Goal, Milestone, MilestoneStats } from './types';

// ─── Query Key Factories ────────────────────────────────────

export const goalKeys = {
  all: ['goals'] as const,
  lists: () => [...goalKeys.all, 'list'] as const,
  list: (filters: string) => [...goalKeys.lists(), { filters }] as const,
  details: () => [...goalKeys.all, 'detail'] as const,
  detail: (id: string) => [...goalKeys.details(), id] as const,
  public: (q: string, cat: string, filter: string) => [...goalKeys.all, 'public', { q, cat, filter }] as const,
  stats: (id: string) => [...goalKeys.all, 'stats', id] as const,
};

export const milestoneKeys = {
  all: ['milestones'] as const,
  goal: (goalId: string) => [...milestoneKeys.all, 'goal', goalId] as const,
  me: () => [...milestoneKeys.all, 'me'] as const,
  feed: () => [...milestoneKeys.all, 'feed'] as const,
};

// ─── Hooks ──────────────────────────────────────────────────

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: goalKeys.all,
    queryFn: fetchGoals,
  });
}

export function usePublicGoals(q: string, category: string, buddyFilter: 'all' | 'open' | 'taken') {
  return useQuery({
    queryKey: goalKeys.public(q, category, buddyFilter),
    queryFn: () => fetchPublicGoals(q, category, buddyFilter),
    staleTime: 0,
  });
}

export function useGoalMilestones(goalId: string) {
  return useQuery<Milestone[]>({
    queryKey: milestoneKeys.goal(goalId),
    queryFn: () => fetchGoalMilestones(goalId),
  });
}

export function useMyMilestones() {
  return useQuery<Milestone[]>({
    queryKey: milestoneKeys.me(),
    queryFn: fetchMyMilestones,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; category: string; description: string; isPublic: boolean; coopOpen?: boolean }) =>
      createGoal(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all });
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });
}

export function useToggleGoalPublic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      patchGoalPublic(id, isPublic),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all }),
  });
}

export function usePatchGoalPublic(goalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isPublic: boolean) => patchGoalPublic(goalId, isPublic),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all }),
  });
}

export function usePatchGoalCoopOpen(goalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (coopOpen: boolean) => patchGoalCoopOpen(goalId, coopOpen),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all }),
  });
}

export function useToggleMilestone(goalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ms: Milestone) => toggleMilestoneApi(ms, goalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: milestoneKeys.goal(goalId) });
      qc.invalidateQueries({ queryKey: milestoneKeys.me() });
      qc.invalidateQueries({ queryKey: milestoneKeys.feed() });
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });
}

export function useToggleMyMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ms: Milestone) => toggleMilestoneApi(ms, ms.goal_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: milestoneKeys.me() });
      qc.invalidateQueries({ queryKey: milestoneKeys.feed() });
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });
}

export function useCreateMilestone(goalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, frequency, daysPerWeek, customDays }: { title: string; frequency: Milestone['frequency']; daysPerWeek?: number; customDays?: string }) =>
      createMilestoneApi(goalId, title, frequency, daysPerWeek, customDays),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: milestoneKeys.goal(goalId) });
      qc.invalidateQueries({ queryKey: milestoneKeys.me() });
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGoalApi(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all });
      qc.invalidateQueries({ queryKey: milestoneKeys.me() });
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });
}

export function useRequestBuddy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => requestBuddyApi(goalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all });
      qc.invalidateQueries({ queryKey: ['buddies'] }); // Should use buddyKeys once implemented
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });
}

export function useCoopJoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => coopJoinGoalApi(goalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all });
      qc.invalidateQueries({ queryKey: ['buddies'] }); // Should use buddyKeys once implemented
      qc.invalidateQueries({ queryKey: milestoneKeys.me() });
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });
}

export function useGoalStats(goalId: string | null) {
  return useQuery<MilestoneStats[]>({
    queryKey: goalId ? goalKeys.stats(goalId) : [],
    queryFn: () => fetchGoalStats(goalId!),
    enabled: !!goalId,
  });
}

export function useGoalTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceGoalId: string) => useGoalTemplateApi(sourceGoalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all });
      qc.invalidateQueries({ queryKey: milestoneKeys.me() });
      Alert.alert('Goal added!', 'The goal and its milestones have been copied to your Goals tab.');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });
}
