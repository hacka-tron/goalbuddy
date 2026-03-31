import request from 'supertest';
import { createApp } from '../create-app';
import { truncateAll, seedUser } from './setup/db-helpers';

const app = createApp();

beforeEach(truncateAll);

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /auth/register', () => {
  it('creates a user and returns token + user', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'new@test.com',
      password: 'password123',
      displayName: 'New User',
      username: 'newuser',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('new@test.com');
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.user.password).toBeUndefined();
  });

  it('returns 409 on duplicate email', async () => {
    await seedUser({ email: 'dupe@test.com', username: 'dupeusr' });

    const res = await request(app).post('/auth/register').send({
      email: 'dupe@test.com',
      password: 'password123',
      displayName: 'Dupe',
      username: 'dupeusr2',
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });

  it('returns 409 on duplicate username', async () => {
    await seedUser({ email: 'other@test.com', username: 'taken' });

    const res = await request(app).post('/auth/register').send({
      email: 'new@test.com',
      password: 'password123',
      displayName: 'New',
      username: 'taken',
    });

    expect(res.status).toBe(409);
  });

  it('returns 400 on missing fields', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'x@test.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('returns token + user on valid credentials', async () => {
    await seedUser({ email: 'login@test.com', password: 'correct', username: 'loginusr' });

    const res = await request(app).post('/auth/login').send({
      email: 'login@test.com',
      password: 'correct',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('login@test.com');
  });

  it('returns 401 on wrong password', async () => {
    await seedUser({ email: 'login2@test.com', password: 'correct', username: 'loginusr2' });

    const res = await request(app).post('/auth/login').send({
      email: 'login2@test.com',
      password: 'wrong',
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 on unknown email', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'ghost@test.com',
      password: 'anything',
    });

    expect(res.status).toBe(401);
  });

  it('returns 400 on missing fields', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'x@test.com' });
    expect(res.status).toBe(400);
  });
});
