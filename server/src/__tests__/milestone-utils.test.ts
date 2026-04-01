import { computeExpectedSessions } from '../lib/milestone-utils';

describe('computeExpectedSessions', () => {
  it('daily: counts inclusive days in range', () => {
    expect(computeExpectedSessions('daily', null, null, new Date('2026-05-01'), new Date('2026-05-30'))).toBe(30);
  });

  it('daily: same start and end = 1', () => {
    const d = new Date('2026-05-01');
    expect(computeExpectedSessions('daily', null, null, d, d)).toBe(1);
  });

  it('daily: returns 0 when end is before start', () => {
    expect(computeExpectedSessions('daily', null, null, new Date('2026-05-10'), new Date('2026-05-01'))).toBe(0);
  });

  it('weekly: counts calendar weeks that overlap the range', () => {
    expect(computeExpectedSessions('weekly', null, null, new Date('2026-05-04'), new Date('2026-05-17'))).toBe(2);
  });

  it('weekly: 4-week range', () => {
    expect(computeExpectedSessions('weekly', null, null, new Date('2026-05-04'), new Date('2026-05-31'))).toBe(4);
  });

  it('x_weekly: 3 days/week x 2 weeks = 6', () => {
    expect(computeExpectedSessions('x_weekly', 3, null, new Date('2026-05-04'), new Date('2026-05-17'))).toBe(6);
  });

  it('monthly: Apr to Jun inclusive = 3', () => {
    expect(computeExpectedSessions('monthly', null, null, new Date('2026-04-01'), new Date('2026-06-30'))).toBe(3);
  });

  it('custom_days: counts matching weekdays in range', () => {
    expect(computeExpectedSessions('custom_days', null, '1,3,5', new Date('2026-05-04'), new Date('2026-05-08'))).toBe(3);
  });

  it('once: always returns 1', () => {
    expect(computeExpectedSessions('once', null, null, new Date('2026-05-01'), new Date('2026-05-30'))).toBe(1);
  });
});
