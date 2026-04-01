import request from 'supertest';
import { createApp } from '../create-app';
import { truncateAll, seedUser, seedGoal, seedMilestone, seedConnection } from './setup/db-helpers';
const app = createApp();
beforeEach(truncateAll);
describe('POST /milestones/', () => {
  it('creates a milestone with frequency=once', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .post('/milestones/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ goalId: goal.id, title: 'One-time task', frequency: 'once' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('One-time task');
    expect(res.body.frequency).toBe('once');
  });
  it('creates a milestone with frequency=x_weekly and daysPerWeek', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .post('/milestones/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ goalId: goal.id, title: 'Run 3x', frequency: 'x_weekly', daysPerWeek: 3 });
    expect(res.status).toBe(201);
    expect(res.body.frequency).toBe('x_weekly');
    expect(res.body.days_per_week).toBe(3);
  });
  it('creates a milestone with frequency=custom_days', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .post('/milestones/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ goalId: goal.id, title: 'MWF workout', frequency: 'custom_days', customDays: '1,3,5' });
    expect(res.status).toBe(201);
    expect(res.body.frequency).toBe('custom_days');
    expect(res.body.custom_days).toBe('1,3,5');
  });
  it('returns 400 on missing title', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .post('/milestones/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ goalId: goal.id });
    expect(res.status).toBe(400);
  });
  it('returns 400 on invalid goalId (not a UUID)', async () => {
    const user = await seedUser();
    const res = await request(app)
      .post('/milestones/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ goalId: 'not-a-uuid', title: 'Test', frequency: 'daily' });
    expect(res.status).toBe(400);
  });
  it('returns 401 when unauthenticated', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .post('/milestones/')
      .send({ goalId: goal.id, title: 'Test', frequency: 'daily' });
    expect(res.status).toBe(401);
  });
});
describe('POST /milestones/ — schedule mode', () => {
  it('defaults to open_ended with null dates when scheduleMode omitted', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .post('/milestones/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ goalId: goal.id, title: 'Daily run', frequency: 'daily' });
    expect(res.status).toBe(201);
    expect(res.body.schedule_mode).toBe('open_ended');
    expect(res.body.start_date).toBeNull();
    expect(res.body.end_date).toBeNull();
  });

  it('creates a time_bound milestone with start and end dates', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .post('/milestones/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        goalId: goal.id,
        title: '30-day program',
        frequency: 'daily',
        scheduleMode: 'time_bound',
        startDate: '2026-05-01',
        endDate: '2026-05-30',
      });
    expect(res.status).toBe(201);
    expect(res.body.schedule_mode).toBe('time_bound');
    expect(res.body.start_date).toBe('2026-05-01');
    expect(res.body.end_date).toBe('2026-05-30');
  });

  it('creates a time_bound milestone with start date and no end date', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .post('/milestones/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        goalId: goal.id,
        title: 'Ongoing program starting May',
        frequency: 'weekly',
        scheduleMode: 'time_bound',
        startDate: '2026-05-01',
      });
    expect(res.status).toBe(201);
    expect(res.body.schedule_mode).toBe('time_bound');
    expect(res.body.start_date).toBe('2026-05-01');
    expect(res.body.end_date).toBeNull();
  });

  it('returns 400 when time_bound has no startDate', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .post('/milestones/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ goalId: goal.id, title: 'Test', frequency: 'daily', scheduleMode: 'time_bound' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when endDate is before startDate', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .post('/milestones/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        goalId: goal.id,
        title: 'Test',
        frequency: 'daily',
        scheduleMode: 'time_bound',
        startDate: '2026-05-15',
        endDate: '2026-05-01',
      });
    expect(res.status).toBe(400);
  });
});
describe('PATCH /milestones/:id', () => {
  it('updates milestone title', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const ms = await seedMilestone(goal.id, user.id, { title: 'Old' });
    const res = await request(app)
      .patch(`/milestones/${ms.id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ title: 'New' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New');
  });
  it('updates scheduleMode, startDate, and endDate', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const ms = await seedMilestone(goal.id, user.id);
    const res = await request(app)
      .patch(`/milestones/${ms.id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ scheduleMode: 'time_bound', startDate: '2026-06-01', endDate: '2026-06-30' });
    expect(res.status).toBe(200);
    expect(res.body.schedule_mode).toBe('time_bound');
    expect(res.body.start_date).toBe('2026-06-01');
    expect(res.body.end_date).toBe('2026-06-30');
  });
  it('returns 400 when patching to time_bound without startDate', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const ms = await seedMilestone(goal.id, user.id);
    const res = await request(app)
      .patch(`/milestones/${ms.id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ scheduleMode: 'time_bound' });
    expect(res.status).toBe(400);
  });
  it('returns 400 when patching endDate before startDate', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const ms = await seedMilestone(goal.id, user.id);
    const res = await request(app)
      .patch(`/milestones/${ms.id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ scheduleMode: 'time_bound', startDate: '2026-06-30', endDate: '2026-06-01' });
    expect(res.status).toBe(400);
  });
  it('returns 404 when patching another user\'s milestone', async () => {
    const owner = await seedUser();
    const other = await seedUser();
    const goal = await seedGoal(owner.id);
    const ms = await seedMilestone(goal.id, owner.id, { title: 'Original' });
    const res = await request(app)
      .patch(`/milestones/${ms.id}`)
      .set('Authorization', `Bearer ${other.token}`)
      .send({ title: 'Hijacked' });
    expect(res.status).toBe(404);
  });
});
describe('GET /milestones/goal/:goalId', () => {
  it('returns milestones with is_done_this_period', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    await seedMilestone(goal.id, user.id, { title: 'Daily', frequency: 'daily' });
    const res = await request(app)
      .get(`/milestones/goal/${goal.id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe('Daily');
    expect(res.body[0].is_done_this_period).toBe(false);
  });
  it('returns schedule_mode, start_date, end_date fields', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    await seedMilestone(goal.id, user.id, {
      frequency: 'daily',
      scheduleMode: 'time_bound',
      startDate: '2026-05-01',
      endDate: '2026-05-30',
    });
    const res = await request(app)
      .get(`/milestones/goal/${goal.id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body[0].schedule_mode).toBe('time_bound');
    expect(res.body[0].start_date).toBe('2026-05-01');
    expect(res.body[0].end_date).toBe('2026-05-30');
  });
});
describe('GET /milestones/me', () => {
  it('returns all milestones for the user', async () => {
    const user = await seedUser();
    const goal1 = await seedGoal(user.id);
    const goal2 = await seedGoal(user.id);
    await seedMilestone(goal1.id, user.id, { title: 'Ms 1' });
    await seedMilestone(goal2.id, user.id, { title: 'Ms 2' });
    const res = await request(app)
      .get('/milestones/me')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
  it('does not return other users\' milestones', async () => {
    const user = await seedUser();
    const other = await seedUser();
    const goal = await seedGoal(other.id);
    await seedMilestone(goal.id, other.id, { title: 'Other user milestone' });
    const res = await request(app)
      .get('/milestones/me')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    const titles = res.body.map((m: any) => m.title);
    expect(titles).not.toContain('Other user milestone');
  });
});
describe('POST /milestones/goal/:goalId/log', () => {
  it('logs a daily milestone and sets is_done_this_period=true', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const ms = await seedMilestone(goal.id, user.id, { frequency: 'daily' });
    const res = await request(app)
      .post(`/milestones/goal/${goal.id}/log`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ milestoneId: ms.id });
    expect(res.status).toBe(201);
    expect(res.body.logged).toBe(true);
    const check = await request(app)
      .get(`/milestones/goal/${goal.id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(check.body.find((m: any) => m.id === ms.id).is_done_this_period).toBe(true);
  });
  it('is idempotent — second log returns logged=false', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const ms = await seedMilestone(goal.id, user.id, { frequency: 'daily' });
    await request(app)
      .post(`/milestones/goal/${goal.id}/log`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ milestoneId: ms.id });
    const res = await request(app)
      .post(`/milestones/goal/${goal.id}/log`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ milestoneId: ms.id });
    expect(res.status).toBe(201);
    expect(res.body.logged).toBe(false);
  });
  it('persists the note on the log entry', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const ms = await seedMilestone(goal.id, user.id, { frequency: 'daily' });
    const res = await request(app)
      .post(`/milestones/goal/${goal.id}/log`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ milestoneId: ms.id, note: 'Felt great today' });
    expect(res.status).toBe(201);
    expect(res.body.logged).toBe(true);
    expect(res.body.row.note).toBe('Felt great today');
  });
  it('returns 404 when milestoneId does not belong to goalId', async () => {
    const user = await seedUser();
    const goal1 = await seedGoal(user.id);
    const goal2 = await seedGoal(user.id);
    const ms = await seedMilestone(goal1.id, user.id, { frequency: 'daily' });
    const res = await request(app)
      .post(`/milestones/goal/${goal2.id}/log`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ milestoneId: ms.id });
    expect(res.status).toBe(404);
  });
});
describe('DELETE /milestones/goal/:goalId/log/:milestoneId', () => {
  it('removes the log and resets is_done_this_period', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const ms = await seedMilestone(goal.id, user.id, { frequency: 'daily' });
    await request(app)
      .post(`/milestones/goal/${goal.id}/log`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ milestoneId: ms.id });
    const res = await request(app)
      .delete(`/milestones/goal/${goal.id}/log/${ms.id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(204);
    const check = await request(app)
      .get(`/milestones/goal/${goal.id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(check.body.find((m: any) => m.id === ms.id).is_done_this_period).toBe(false);
  });
  it('returns 204 even when no log exists (idempotent undo)', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const ms = await seedMilestone(goal.id, user.id, { frequency: 'daily' });
    const res = await request(app)
      .delete(`/milestones/goal/${goal.id}/log/${ms.id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(204);
  });
});
describe('GET /milestones/feed', () => {
  it('returns milestone completions for user and buddies', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const ms = await seedMilestone(goal.id, user.id, { frequency: 'daily' });
    await request(app)
      .post(`/milestones/goal/${goal.id}/log`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ milestoneId: ms.id });
    const res = await request(app)
      .get('/milestones/feed')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
  it('includes buddy completions in the feed', async () => {
    const user = await seedUser();
    const buddy = await seedUser();
    const buddyGoal = await seedGoal(buddy.id, { isPublic: true });
    // feed uses completed_at — only set for once-type milestones marked complete via PATCH
    const buddyMs = await seedMilestone(buddyGoal.id, buddy.id, { frequency: 'once' });
    await seedConnection(user.id, buddy.id, buddyGoal.id, { status: 'accepted' });
    await request(app)
      .patch(`/milestones/${buddyMs.id}`)
      .set('Authorization', `Bearer ${buddy.token}`)
      .send({ completed: true });
    const res = await request(app)
      .get('/milestones/feed')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    const ids = res.body.map((e: any) => e.id);
    expect(ids).toContain(buddyMs.id);
  });
});
