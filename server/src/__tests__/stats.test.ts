import request from 'supertest';
import { createApp } from '../create-app';
import { truncateAll, seedUser } from './setup/db-helpers';
const app = createApp();
beforeEach(truncateAll);
describe('GET /stats/:userId', () => {
  it('returns activity stats for a user that has a stats row', async () => {
    const user = await seedUser(); // seedUser inserts activity_stats row
    const requester = await seedUser();
    const res = await request(app)
      .get(`/stats/${user.id}`)
      .set('Authorization', `Bearer ${requester.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(user.id);
    expect(res.body.total_checkins).toBeDefined();
    expect(res.body.current_streak).toBeDefined();
  });
  it('returns 404 for a non-existent user', async () => {
    const requester = await seedUser();
    const res = await request(app)
      .get('/stats/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${requester.token}`);
    expect(res.status).toBe(404);
  });
  it('returns 401 with no token', async () => {
    const user = await seedUser();
    const res = await request(app).get(`/stats/${user.id}`);
    expect(res.status).toBe(401);
  });
});
