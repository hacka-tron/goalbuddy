import { apiFetch } from '../../lib/api';
import { Candidate, Goal } from './types';

export const fetchMyGoals = (): Promise<Goal[]> => apiFetch('/goals');

export const fetchDeck = (goalId: string): Promise<Candidate[]> =>
  apiFetch(`/finder/deck?goalId=${goalId}`);

export const swipe = (body: {
  swipedId: string;
  action: string;
  mode: string;
  goalId?: string;
}): Promise<{ matched: boolean }> =>
  apiFetch('/finder/swipe', { method: 'POST', body: JSON.stringify(body) });
