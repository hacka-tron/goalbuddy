import request from 'supertest';
import { createApp } from '../create-app';
import { truncateAll, seedUser } from './setup/db-helpers';
const app = createApp();
beforeEach(truncateAll);
describe('GET /users/me', () => {
  it('returns the authenticated user with activity stats', async () => {
    const user = await seedUser();
    const res = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
    expect(res.body.email).toBe(user.email);
    expect(res.body.password_hash).toBeUndefined();
  });
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/users/me');
    expect(res.status).toBe(401);
  });
  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/users/me')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });
});
describe('PATCH /users/me', () => {
  it('updates display_name and returns updated user', async () => {
    const user = await seedUser();
    const res = await request(app)
      .patch('/users/me')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ displayName: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.display_name).toBe('Updated Name');
  });
  it('updates bio', async () => {
    const user = await seedUser();
    const res = await request(app)
      .patch('/users/me')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ bio: 'My new bio' });
    expect(res.status).toBe(200);
    expect(res.body.bio).toBe('My new bio');
  });
  it('returns 401 with no token', async () => {
    const res = await request(app).patch('/users/me').send({ displayName: 'X' });
    expect(res.status).toBe(401);
  });
});
describe('GET /users/:id', () => {
  it('returns public profile of another user', async () => {
    const requester = await seedUser();
    const target = await seedUser();
    const res = await request(app)
      .get(`/users/${target.id}`)
      .set('Authorization', `Bearer ${requester.token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(target.id);
    expect(res.body.display_name).toBe(target.display_name);
    expect(res.body.email).toBeUndefined();
    expect(res.body.password_hash).toBeUndefined();
  });
  it('returns 404 for non-existent user', async () => {
    const user = await seedUser();
    const res = await request(app)
      .get('/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(404);
  });
});
