const request = require('supertest');
const app = require('../../src/app');
const { prisma, resetDb } = require('../helpers/db');
const bcrypt = require('bcrypt');

beforeEach(async () => {
  await resetDb();
  const hash = await bcrypt.hash('secret123', 10);
  await prisma.user.create({ data: { username: 'admin', password_hash: hash, role: 'ADMIN' } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /auth/login', () => {
  it('returns token on valid credentials', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'admin', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'admin' });
    expect(res.status).toBe(400);
  });
});

describe('GET /auth/me', () => {
  let token;

  beforeEach(async () => {
    const res = await request(app).post('/auth/login').send({ username: 'admin', password: 'secret123' });
    token = res.body.token;
  });

  it('returns user on valid token', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('admin');
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
  });
});
