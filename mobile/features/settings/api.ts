import { apiFetch } from '../../lib/api';

export const patchProfile = (displayName: string, bio: string): Promise<{ display_name: string; bio: string }> =>
  apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify({ displayName, bio }) });
