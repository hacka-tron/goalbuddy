import request from 'supertest';
import { createApp } from '../create-app';
import { truncateAll, seedUser, seedGoal, seedConnection, seedCheckin } from './setup/db-helpers';
const app = createApp();
beforeEach(truncateAll);
describe('POST /checkins/', () => {
  it('creates a check-in on an accepted connection', async () => {
    const user = await seedUser();
    const buddy = await seedUser();
    const goal = await seedGoal(buddy.id);
    const conn = await seedConnection(user.id, buddy.id, goal.id, { status: 'accepted' });
    const res = await request(app)
      .post('/checkins/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ connectionId: conn.id, message: 'Crushed it today!', mood: 'great' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Crushed it today!');
    expect(res.body.mood).toBe('great');
    expect(res.body.display_name).toBeDefined();
  });
  it('returns 403 on a pending connection', async () => {
    const user = await seedUser();
    const buddy = await seedUser();
    const goal = await seedGoal(buddy.id);
    const conn = await seedConnection(user.id, buddy.id, goal.id, { status: 'pending' });
    const res = await request(app)
      .post('/checkins/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ connectionId: conn.id, message: 'Hey', mood: 'good' });
    expect(res.status).toBe(403);
  });
  it('returns 403 when user is not in the connection', async () => {
    const user = await seedUser();
    const buddy1 = await seedUser();
    const buddy2 = await seedUser();
    const goal = await seedGoal(buddy1.id);
    const conn = await seedConnection(buddy1.id, buddy2.id, goal.id, { status: 'accepted' });
    const res = await request(app)
      .post('/checkins/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ connectionId: conn.id, message: 'Sneaky', mood: 'good' });
    expect(res.status).toBe(403);
  });
  it('returns 400 on missing message', async () => {
    const user = await seedUser();
    const buddy = await seedUser();
    const goal = await seedGoal(buddy.id);
    const conn = await seedConnection(user.id, buddy.id, goal.id, { status: 'accepted' });
    const res = await request(app)
      .post('/checkins/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ connectionId: conn.id, mood: 'good' });
    expect(res.status).toBe(400);
  });
});
describe('GET /checkins/:connectionId', () => {
  it('returns paginated messages', async () => {
    const user = await seedUser();
    const buddy = await seedUser();
    const goal = await seedGoal(buddy.id);
    const conn = await seedConnection(user.id, buddy.id, goal.id, { status: 'accepted' });
    for (let i = 0; i < 5; i++) {
      await seedCheckin(conn.id, user.id, { message: `Message ${i}` });
    }
    const res = await request(app)
      .get(`/checkins/${conn.id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(5);
    expect(res.body.hasMore).toBe(false);
  });
  it('paginates with cursor correctly', async () => {
    const user = await seedUser();
    const buddy = await seedUser();
    const goal = await seedGoal(buddy.id);
    const conn = await seedConnection(user.id, buddy.id, goal.id, { status: 'accepted' });
    for (let i = 0; i < 25; i++) {
      await seedCheckin(conn.id, user.id, { message: `Message ${i}` });
    }
    const page1 = await request(app)
      .get(`/checkins/${conn.id}?limit=10`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(page1.body.messages).toHaveLength(10);
    expect(page1.body.hasMore).toBe(true);
    expect(page1.body.nextCursor).toBeDefined();
    const page2 = await request(app)
      .get(`/checkins/${conn.id}?limit=10&before=${page1.body.nextCursor}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(page2.body.messages).toHaveLength(10);
    const p1Ids = page1.body.messages.map((m: any) => m.id);
    const p2Ids = page2.body.messages.map((m: any) => m.id);
    expect(p1Ids.some((id: string) => p2Ids.includes(id))).toBe(false);
  });
  it('returns 403 when user is not in the connection', async () => {
    const user = await seedUser();
    const buddy1 = await seedUser();
    const buddy2 = await seedUser();
    const goal = await seedGoal(buddy1.id);
    const conn = await seedConnection(buddy1.id, buddy2.id, goal.id, { status: 'accepted' });
    const res = await request(app)
      .get(`/checkins/${conn.id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(403);
  });
});
