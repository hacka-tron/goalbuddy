import { apiFetch } from '../../lib/api';
import { WinItem } from './types';

export const fetchWinsFeed = (): Promise<WinItem[]> => apiFetch('/milestones/feed');
