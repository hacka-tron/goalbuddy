import request from 'supertest';
import { createApp } from '../create-app';
import { truncateAll, seedUser, seedGoal, seedMilestone, seedConnection } from './setup/db-helpers';
const app = createApp();
beforeEach(truncateAll);
describe('GET /goals/', () => {
  it("returns the user's goals", async () => {
    const user = await seedUser();
    await seedGoal(user.id, { title: 'My Goal' });
    const res = await request(app)
      .get('/goals/')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('My Goal');
  });
  it("does not return other users' goals", async () => {
    const user = await seedUser();
    const other = await seedUser();
    await seedGoal(other.id);
    const res = await request(app)
      .get('/goals/')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});
describe('POST /goals/', () => {
  it('creates a goal and returns it', async () => {
    const user = await seedUser();
    const res = await request(app)
      .post('/goals/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ title: 'Run daily', category: 'workout' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Run daily');
    expect(res.body.user_id).toBe(user.id);
  });
  it('forces is_public=true when coopOpen=true', async () => {
    const user = await seedUser();
    const res = await request(app)
      .post('/goals/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ title: 'Co-op Goal', category: 'study', coopOpen: true });
    expect(res.status).toBe(201);
    expect(res.body.is_public).toBe(true);
    expect(res.body.coop_open).toBe(true);
  });
  it('returns 400 on missing category', async () => {
    const user = await seedUser();
    const res = await request(app)
      .post('/goals/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ title: 'No Category' });
    expect(res.status).toBe(400);
  });
});
describe('PATCH /goals/:id', () => {
  it('owner can update their goal', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id, { title: 'Old Title' });
    const res = await request(app)
      .patch(`/goals/${goal.id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ title: 'New Title' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New Title');
  });
  it("non-owner cannot update another user's goal", async () => {
    const owner = await seedUser();
    const other = await seedUser();
    const goal = await seedGoal(owner.id);
    const res = await request(app)
      .patch(`/goals/${goal.id}`)
      .set('Authorization', `Bearer ${other.token}`)
      .send({ title: 'Hijacked' });
    expect(res.status).toBe(404);
  });
});
describe('DELETE /goals/:id', () => {
  it('owner can delete their goal', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    const res = await request(app)
      .delete(`/goals/${goal.id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(204);
    const check = await request(app)
      .get('/goals/')
      .set('Authorization', `Bearer ${user.token}`);
    expect(check.body).toHaveLength(0);
  });
  it('non-owner cannot delete goal', async () => {
    const owner = await seedUser();
    const other = await seedUser();
    const goal = await seedGoal(owner.id);
    const res = await request(app)
      .delete(`/goals/${goal.id}`)
      .set('Authorization', `Bearer ${other.token}`);
    expect(res.status).toBe(404);
  });
});
describe('GET /goals/public', () => {
  it('returns public goals, excludes own', async () => {
    const user = await seedUser();
    const other = await seedUser();
    await seedGoal(user.id, { isPublic: true });
    await seedGoal(other.id, { isPublic: true, title: 'Other Public' });
    const res = await request(app)
      .get('/goals/public')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    const titles = res.body.map((g: any) => g.title);
    expect(titles).toContain('Other Public');
    expect(titles).not.toContain('Test Goal');
  });
  it('filters by category', async () => {
    const user = await seedUser();
    const other = await seedUser();
    await seedGoal(other.id, { isPublic: true, category: 'study', title: 'Study Goal' });
    await seedGoal(other.id, { isPublic: true, category: 'workout', title: 'Workout Goal' });
    const res = await request(app)
      .get('/goals/public?category=study')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.every((g: any) => g.category === 'study')).toBe(true);
  });
  it('filters by search query', async () => {
    const user = await seedUser();
    const other = await seedUser();
    await seedGoal(other.id, { isPublic: true, title: 'Morning Run' });
    await seedGoal(other.id, { isPublic: true, title: 'Evening Study' });
    const res = await request(app)
      .get('/goals/public?q=Morning')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.some((g: any) => g.title === 'Morning Run')).toBe(true);
  });
});
describe('POST /goals/from-template', () => {
  it('creates a copy of a public goal with its milestones', async () => {
    const owner = await seedUser();
    const user = await seedUser();
    const source = await seedGoal(owner.id, { isPublic: true, title: 'Template Goal' });
    await seedMilestone(source.id, owner.id, { title: 'Template Milestone' });
    const res = await request(app)
      .post('/goals/from-template')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ sourceGoalId: source.id });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Template Goal');
    expect(res.body.user_id).toBe(user.id);
    expect(res.body.is_public).toBe(false);
    const msRes = await request(app)
      .get(`/milestones/goal/${res.body.id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(msRes.body.some((m: any) => m.title === 'Template Milestone')).toBe(true);
  });
});
describe('GET /goals/:goalId/stats', () => {
  it('returns milestone stats for own goal', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id);
    await seedMilestone(goal.id, user.id, { title: 'Daily Run', frequency: 'daily' });
    const res = await request(app)
      .get(`/goals/${goal.id}/stats`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
