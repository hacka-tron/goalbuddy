import { apiFetch } from '../../lib/api';
import { Connection } from './types';

export const fetchBuddies = (): Promise<Connection[]> => apiFetch('/buddies');

export const respondToRequest = (id: string, status: 'accepted' | 'declined'): Promise<Connection> =>
  apiFetch(`/buddies/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
