import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../create-app';
import { truncateAll, seedUser } from './setup/db-helpers';
const app = createApp();
beforeEach(truncateAll);
describe('Auth middleware', () => {
  it('returns 401 on missing Authorization header', async () => {
    const res = await request(app).get('/users/me');
    expect(res.status).toBe(401);
  });
  it('returns 401 on malformed Bearer token', async () => {
    const res = await request(app)
      .get('/users/me')
      .set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });
  it('returns 401 on expired token', async () => {
    const user = await seedUser();
    const expiredToken = jwt.sign(
      { userId: user.id },
      'test-secret-key',
      { expiresIn: -1 }
    );
    const res = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });
  it('returns 401 on token signed with wrong secret', async () => {
    const user = await seedUser();
    const badToken = jwt.sign({ userId: user.id }, 'wrong-secret', { expiresIn: '1h' });
    const res = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${badToken}`);
    expect(res.status).toBe(401);
  });
});
describe('Zod validation middleware', () => {
  it('returns 400 with validation details on invalid body', async () => {
    const user = await seedUser();
    const res = await request(app)
      .post('/goals/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ title: 'No Category Here' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
  it('returns 400 on invalid enum value', async () => {
    const user = await seedUser();
    const res = await request(app)
      .post('/goals/')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ title: 'Bad Category', category: 'not_a_real_category' });
    expect(res.status).toBe(400);
  });
});
describe('Error response shape', () => {
  it('error responses include error, code, and retryable fields', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@test.com', password: 'wrong' });
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('code');
    expect(res.body).toHaveProperty('retryable');
    expect(typeof res.body.retryable).toBe('boolean');
  });
});
