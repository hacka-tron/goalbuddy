import request from 'supertest';
import { createApp } from '../create-app';
import { truncateAll, seedUser, seedGoal, seedMilestone, seedConnection } from './setup/db-helpers';
const app = createApp();
beforeEach(truncateAll);
describe('GET /finder/deck', () => {
  it('returns candidates with public goals in the same category', async () => {
    const user = await seedUser();
    const userGoal = await seedGoal(user.id, { category: 'workout' });
    const candidate = await seedUser();
    await seedGoal(candidate.id, { isPublic: true, category: 'workout' });
    const noMatch = await seedUser();
    await seedGoal(noMatch.id, { isPublic: true, category: 'study' });
    const res = await request(app)
      .get(`/finder/deck?goalId=${userGoal.id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    const ids = res.body.map((c: any) => c.id);
    expect(ids).toContain(candidate.id);
    expect(ids).not.toContain(noMatch.id);
    expect(ids).not.toContain(user.id);
  });
  it('returns 409 when the goal already has an accepted buddy', async () => {
    const user = await seedUser();
    const buddy = await seedUser();
    const goal = await seedGoal(user.id, { category: 'workout' });
    await seedConnection(buddy.id, user.id, goal.id, { status: 'accepted' });
    const res = await request(app)
      .get(`/finder/deck?goalId=${goal.id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(409);
  });
  it('returns 404 for a non-existent goal', async () => {
    const user = await seedUser();
    const res = await request(app)
      .get('/finder/deck?goalId=00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(404);
  });
  it('returns 400 when goalId is missing', async () => {
    const user = await seedUser();
    const res = await request(app)
      .get('/finder/deck')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(400);
  });
});
describe('POST /finder/swipe', () => {
  it('records a pass and returns matched=false', async () => {
    const user = await seedUser();
    const userGoal = await seedGoal(user.id, { category: 'workout' });
    const candidate = await seedUser();
    const cardGoal = await seedGoal(candidate.id, { isPublic: true, category: 'workout' });
    const res = await request(app)
      .post('/finder/swipe')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ swipedId: candidate.id, action: 'pass', mode: 'specific', goalId: userGoal.id, cardGoalId: cardGoal.id });
    expect(res.status).toBe(200);
    expect(res.body.matched).toBe(false);
  });
  it('records a like with no reverse swipe — matched=false', async () => {
    const user = await seedUser();
    const userGoal = await seedGoal(user.id, { category: 'workout' });
    const candidate = await seedUser();
    const cardGoal = await seedGoal(candidate.id, { isPublic: true, category: 'workout' });
    const res = await request(app)
      .post('/finder/swipe')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ swipedId: candidate.id, action: 'like', mode: 'specific', goalId: userGoal.id, cardGoalId: cardGoal.id });
    expect(res.status).toBe(200);
    expect(res.body.matched).toBe(false);
  });
  it('mutual like creates an accepted connection — matched=true', async () => {
    const user = await seedUser();
    const userGoal = await seedGoal(user.id, { category: 'workout' });
    const candidate = await seedUser();
    const cardGoal = await seedGoal(candidate.id, { isPublic: true, category: 'workout' });
    // Candidate likes user first
    await request(app)
      .post('/finder/swipe')
      .set('Authorization', `Bearer ${candidate.token}`)
      .send({ swipedId: user.id, action: 'like', mode: 'specific', goalId: cardGoal.id, cardGoalId: userGoal.id });
    // User likes back — should match
    const res = await request(app)
      .post('/finder/swipe')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ swipedId: candidate.id, action: 'like', mode: 'specific', goalId: userGoal.id, cardGoalId: cardGoal.id });
    expect(res.status).toBe(200);
    expect(res.body.matched).toBe(true);
    expect(res.body.connection).toBeDefined();
    expect(res.body.connection.status).toBe('accepted');
  });
});
