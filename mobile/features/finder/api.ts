import { apiFetch } from '../../lib/api';
import { Candidate, Goal } from './types';

export const fetchMyGoals = (): Promise<Goal[]> => apiFetch('/goals');

export const fetchDeck = async (goalId: string): Promise<{ candidates: Candidate[]; locked: boolean }> => {
  try {
    const data = await apiFetch(`/finder/deck?goalId=${goalId}`);
    return { candidates: Array.isArray(data) ? data : [], locked: false };
  } catch (err: any) {
    if (err?.message?.includes('already has a buddy') || err?.message?.includes('locked')) {
      return { candidates: [], locked: true };
    }
    throw err;
  }
};

export const swipe = (body: {
  swipedId: string;
  action: string;
  mode: string;
  goalId?: string;
}): Promise<{ matched: boolean }> =>
  apiFetch('/finder/swipe', { method: 'POST', body: JSON.stringify(body) });
