import { apiFetch } from '../../lib/api';
import { Goal, Milestone, PublicGoal } from './types';

export const fetchGoals = (): Promise<Goal[]> => apiFetch('/goals');

export const fetchPublicGoals = (q: string, category: string, buddyFilter: 'all' | 'open' | 'taken'): Promise<PublicGoal[]> => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (buddyFilter !== 'all') params.set('buddyFilter', buddyFilter);
  return apiFetch(`/goals/public?${params.toString()}`);
};

export const fetchGoalMilestones = (goalId: string): Promise<Milestone[]> =>
  apiFetch(`/milestones/goal/${goalId}`);

export const fetchMyMilestones = (): Promise<Milestone[]> => apiFetch('/milestones/me');

export const createGoal = (payload: {
  title: string;
  category: string;
  description: string;
  isPublic: boolean;
}): Promise<Goal> =>
  apiFetch('/goals', { method: 'POST', body: JSON.stringify(payload) });

export const patchGoalPublic = (id: string, isPublic: boolean): Promise<Goal> =>
  apiFetch(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify({ isPublic }) });

export const toggleMilestone = (ms: Milestone, goalId: string): Promise<unknown> => {
  if (ms.frequency === 'once') {
    return apiFetch(`/milestones/${ms.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !ms.is_done_this_period }),
    });
  }
  return apiFetch(`/milestones/goal/${goalId}/log`, {
    method: 'POST',
    body: JSON.stringify({ milestoneId: ms.id }),
  });
};

export const createMilestone = (goalId: string, title: string, frequency: Milestone['frequency']): Promise<Milestone> =>
  apiFetch('/milestones', {
    method: 'POST',
    body: JSON.stringify({ goalId, title, frequency }),
  });

export const requestBuddy = (goalId: string): Promise<unknown> =>
  apiFetch('/buddies/request', { method: 'POST', body: JSON.stringify({ goalId }) });

export const useGoalTemplate = (sourceGoalId: string): Promise<unknown> =>
  apiFetch('/goals/from-template', { method: 'POST', body: JSON.stringify({ sourceGoalId }) });
