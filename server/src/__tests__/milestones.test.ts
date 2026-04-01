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
  it('returns 400 on missing title', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .post('/milestones/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ goalId: goal.id });
    expect(res.status).toBe(400);
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
});
