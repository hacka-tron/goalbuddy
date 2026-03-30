import { apiFetch } from '../../lib/api';
import { Connection, CheckInsPage } from './types';

export const fetchConnection = (connectionId: string): Promise<Connection> =>
  apiFetch(`/buddies/${connectionId}`);

export const fetchCheckIns = (connectionId: string, before?: string): Promise<CheckInsPage> =>
  apiFetch(
    `/checkins/${connectionId}?limit=20${before ? `&before=${before}` : ''}`
  );

export const sendCheckIn = (
  connectionId: string,
  message: string,
  mood: string
): Promise<unknown> =>
  apiFetch('/checkins', {
    method: 'POST',
    body: JSON.stringify({ connectionId, message, mood }),
  });

export type MilestoneStat = {
  id: string;
  title: string;
  frequency: string;
  streak: number;
  total_completed: number;
  total_expected: number;
  completion_rate: number;
  skip_rate: number;
};

export type GoalStats = {
  buddy_name: string;
  milestone_stats: MilestoneStat[];
  overall_completion_rate: number;
  overall_skip_rate: number;
};

export const fetchGoalStats = (connectionId: string): Promise<GoalStats> =>
  apiFetch(`/buddies/${connectionId}/goal-stats`);
