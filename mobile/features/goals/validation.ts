import { Milestone } from './types';

export const PUBLIC_GOAL_REQUIRES_MILESTONE_MESSAGE =
  'Public goals need at least one milestone so your buddy knows what to track.';

export type GoalMilestoneDraft = Pick<Milestone, 'id'> | { id: string };

export function canGoalBeMadePublic(milestones: readonly GoalMilestoneDraft[]): boolean {
  return milestones.length > 0;
}
