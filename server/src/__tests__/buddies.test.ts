import request from 'supertest';
import { createApp } from '../create-app';
import { truncateAll, seedUser, seedGoal, seedMilestone, seedConnection } from './setup/db-helpers';
const app = createApp();
beforeEach(truncateAll);
describe('POST /buddies/request', () => {
  it('creates a pending accountability connection', async () => {
    const requester = await seedUser();
    const owner = await seedUser();
    const goal = await seedGoal(owner.id, { isPublic: true });
    await seedMilestone(goal.id, owner.id);
    const res = await request(app)
      .post('/buddies/request')
      .set('Authorization', `Bearer ${requester.token}`)
      .send({ goalId: goal.id });
    expect(res.status).toBe(201);
    expect(res.body.connection.status).toBe('pending');
    expect(res.body.connection.connection_type).toBe('accountability');
  });
  it('creates an accepted coop connection and copies the goal', async () => {
    const requester = await seedUser();
    const owner = await seedUser();
    const goal = await seedGoal(owner.id, { isPublic: true, coopOpen: true });
    await seedMilestone(goal.id, owner.id, { title: 'Shared Milestone' });
    const res = await request(app)
      .post('/buddies/request')
      .set('Authorization', `Bearer ${requester.token}`)
      .send({ goalId: goal.id, coopJoin: true });
    expect(res.status).toBe(201);
    expect(res.body.connection.status).toBe('accepted');
    expect(res.body.connection.connection_type).toBe('coop');
    expect(res.body.newGoalId).toBeDefined();
    const goalsRes = await request(app)
      .get('/goals/')
      .set('Authorization', `Bearer ${requester.token}`);
    expect(goalsRes.body.some((g: any) => g.id === res.body.newGoalId)).toBe(true);
  });
  it('returns 409 when goal already has an accepted buddy', async () => {
    const owner = await seedUser();
    const buddy1 = await seedUser();
    const buddy2 = await seedUser();
    const goal = await seedGoal(owner.id, { isPublic: true });
    await seedMilestone(goal.id, owner.id);
    await seedConnection(buddy1.id, owner.id, goal.id, { status: 'accepted' });
    const res = await request(app)
      .post('/buddies/request')
      .set('Authorization', `Bearer ${buddy2.token}`)
      .send({ goalId: goal.id });
    expect(res.status).toBe(409);
  });
  it('cannot request own goal', async () => {
    const user = await seedUser();
    const goal = await seedGoal(user.id, { isPublic: true });
    await seedMilestone(goal.id, user.id);
    const res = await request(app)
      .post('/buddies/request')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ goalId: goal.id });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
describe('PATCH /buddies/:id — accept/decline', () => {
  it('receiver can accept a pending request', async () => {
    const requester = await seedUser();
    const receiver = await seedUser();
    const goal = await seedGoal(receiver.id, { isPublic: true });
    const conn = await seedConnection(requester.id, receiver.id, goal.id, { status: 'pending' });
    const res = await request(app)
      .patch(`/buddies/${conn.id}`)
      .set('Authorization', `Bearer ${receiver.token}`)
      .send({ status: 'accepted' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
    expect(res.body.accepted_at).toBeDefined();
  });
  it('receiver can decline a pending request', async () => {
    const requester = await seedUser();
    const receiver = await seedUser();
    const goal = await seedGoal(receiver.id, { isPublic: true });
    const conn = await seedConnection(requester.id, receiver.id, goal.id, { status: 'pending' });
    const res = await request(app)
      .patch(`/buddies/${conn.id}`)
      .set('Authorization', `Bearer ${receiver.token}`)
      .send({ status: 'declined' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('declined');
  });
  it('unrelated user cannot update a connection', async () => {
    const requester = await seedUser();
    const receiver = await seedUser();
    const stranger = await seedUser();
    const goal = await seedGoal(receiver.id, { isPublic: true });
    const conn = await seedConnection(requester.id, receiver.id, goal.id, { status: 'pending' });
    const res = await request(app)
      .patch(`/buddies/${conn.id}`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ status: 'accepted' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
describe('GET /buddies/', () => {
  it('returns all connections for the user', async () => {
    const user = await seedUser();
    const buddy = await seedUser();
    const goal = await seedGoal(buddy.id, { isPublic: true });
    await seedConnection(user.id, buddy.id, goal.id, { status: 'pending' });
    const res = await request(app)
      .get('/buddies/')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});
describe('GET /buddies/:id', () => {
  it('returns a single connection', async () => {
    const user = await seedUser();
    const buddy = await seedUser();
    const goal = await seedGoal(buddy.id, { isPublic: true });
    const conn = await seedConnection(user.id, buddy.id, goal.id, { status: 'accepted' });
    const res = await request(app)
      .get(`/buddies/${conn.id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(conn.id);
  });
});
describe('GET /buddies/:id/goal-stats', () => {
  it('returns goal stats for the buddy', async () => {
    const user = await seedUser();
    const buddy = await seedUser();
    const goal = await seedGoal(buddy.id, { isPublic: true });
    await seedMilestone(goal.id, buddy.id, { frequency: 'daily' });
    const conn = await seedConnection(user.id, buddy.id, goal.id, { status: 'accepted' });
    const res = await request(app)
      .get(`/buddies/${conn.id}/goal-stats`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.milestone_stats).toBeDefined();
    expect(res.body.overall_completion_rate).toBeDefined();
  });
});
describe('GET /buddies/:id/goal-stats — finite milestone', () => {
  it('includes finite stats when time_bound has an end_date', async () => {
    const user = await seedUser();
    const buddy = await seedUser();
    const goal = await seedGoal(buddy.id, { isPublic: true });
    await seedMilestone(goal.id, buddy.id, {
      frequency: 'daily',
      scheduleMode: 'time_bound',
      startDate: '2026-05-01',
      endDate: '2026-05-30',
    });
    const conn = await seedConnection(user.id, buddy.id, goal.id, { status: 'accepted' });
    const res = await request(app)
      .get(`/buddies/${conn.id}/goal-stats`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    const stat = res.body.milestone_stats[0];
    expect(stat.schedule_mode).toBe('time_bound');
    expect(stat.start_date).toBe('2026-05-01');
    expect(stat.end_date).toBe('2026-05-30');
    expect(stat.total_expected_finite).toBe(30);
    expect(stat.sessions_remaining).toBe(30);
    expect(stat.percent_complete).toBe(0);
  });

  it('does not include finite stats for open_ended milestone', async () => {
    const user = await seedUser();
    const buddy = await seedUser();
    const goal = await seedGoal(buddy.id, { isPublic: true });
    await seedMilestone(goal.id, buddy.id, { frequency: 'daily' });
    const conn = await seedConnection(user.id, buddy.id, goal.id, { status: 'accepted' });
    const res = await request(app)
      .get(`/buddies/${conn.id}/goal-stats`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    const stat = res.body.milestone_stats[0];
    expect(stat.total_expected_finite).toBeUndefined();
    expect(stat.percent_complete).toBeUndefined();
  });

  it('does not include finite stats for time_bound without end_date', async () => {
    const user = await seedUser();
    const buddy = await seedUser();
    const goal = await seedGoal(buddy.id, { isPublic: true });
    await seedMilestone(goal.id, buddy.id, {
      frequency: 'daily',
      scheduleMode: 'time_bound',
      startDate: '2026-05-01',
    });
    const conn = await seedConnection(user.id, buddy.id, goal.id, { status: 'accepted' });
    const res = await request(app)
      .get(`/buddies/${conn.id}/goal-stats`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    const stat = res.body.milestone_stats[0];
    expect(stat.schedule_mode).toBe('time_bound');
    expect(stat.start_date).toBe('2026-05-01');
    expect(stat.end_date).toBeNull();
    expect(stat.total_expected_finite).toBeUndefined();
    expect(stat.percent_complete).toBeUndefined();
  });
});
