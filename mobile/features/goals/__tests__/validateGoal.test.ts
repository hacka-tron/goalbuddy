import { canGoalBeMadePublic, PUBLIC_GOAL_REQUIRES_MILESTONE_MESSAGE } from '../validation';

describe('canGoalBeMadePublic', () => {
  it('returns false when the goal has no milestones', () => {
    expect(canGoalBeMadePublic([])).toBe(false);
  });

  it('returns true when the goal has at least one milestone', () => {
    expect(
      canGoalBeMadePublic([
        {
          id: 'milestone-1',
        },
      ])
    ).toBe(true);
  });

  it('uses the public goal validation message expected by the UI flow', () => {
    expect(PUBLIC_GOAL_REQUIRES_MILESTONE_MESSAGE).toBe(
      'Public goals need at least one milestone so your buddy knows what to track.'
    );
  });
});
