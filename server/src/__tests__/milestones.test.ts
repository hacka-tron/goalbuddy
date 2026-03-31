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
