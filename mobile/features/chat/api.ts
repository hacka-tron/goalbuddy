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
