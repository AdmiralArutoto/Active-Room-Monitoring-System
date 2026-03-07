const request = require('supertest');
const app = require('../../src/app');
const { prisma, resetDb } = require('../helpers/db');
const bcrypt = require('bcrypt');

let token;

beforeAll(async () => {
  await resetDb();
  const hash = await bcrypt.hash('secret123', 10);
  await prisma.user.create({ data: { username: 'admin', password_hash: hash, role: 'ADMIN' } });
  const res = await request(app).post('/auth/login').send({ username: 'admin', password: 'secret123' });
  token = res.body.token;
});

beforeEach(async () => {
  await prisma.sensorEvent.deleteMany();
  await prisma.sensorState.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.area.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

async function createBuilding(overrides = {}) {
  return request(app)
    .post('/areas')
    .set(auth())
    .send({ name: 'Main Building', type: 'BUILDING', code: 'B01', ...overrides });
}

describe('POST /areas', () => {
  it('creates a BUILDING', async () => {
    const res = await createBuilding();
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('BUILDING');
    expect(res.body.code).toBe('B01');
  });

  it('creates a FLOOR under a BUILDING', async () => {
    const b = await createBuilding();
    const res = await request(app)
      .post('/areas')
      .set(auth())
      .send({ name: 'Floor 1', type: 'FLOOR', parent_id: b.body.id, code: 'F01' });
    expect(res.status).toBe(201);
    expect(res.body.parent_id).toBe(b.body.id);
  });

  it('rejects FLOOR without parent', async () => {
    const res = await request(app)
      .post('/areas')
      .set(auth())
      .send({ name: 'Orphan Floor', type: 'FLOOR' });
    expect(res.status).toBe(400);
  });

  it('rejects FLOOR under another FLOOR', async () => {
    const b = await createBuilding();
    const f = await request(app)
      .post('/areas')
      .set(auth())
      .send({ name: 'Floor 1', type: 'FLOOR', parent_id: b.body.id });
    const res = await request(app)
      .post('/areas')
      .set(auth())
      .send({ name: 'Floor 2', type: 'FLOOR', parent_id: f.body.id });
    expect(res.status).toBe(400);
  });
});

describe('GET /areas', () => {
  it('returns list of areas', async () => {
    await createBuilding();
    const res = await request(app).get('/areas').set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/areas');
    expect(res.status).toBe(401);
  });
});

describe('PUT /areas/:id', () => {
  it('updates area name and code', async () => {
    const b = await createBuilding();
    const res = await request(app)
      .put(`/areas/${b.body.id}`)
      .set(auth())
      .send({ name: 'Updated Building', code: 'B99' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Building');
    expect(res.body.code).toBe('B99');
  });
});

describe('DELETE /areas/:id', () => {
  it('deletes an area with no children', async () => {
    const b = await createBuilding();
    const res = await request(app).delete(`/areas/${b.body.id}`).set(auth());
    expect(res.status).toBe(204);
  });

  it('returns 409 when children exist', async () => {
    const b = await createBuilding();
    await request(app)
      .post('/areas')
      .set(auth())
      .send({ name: 'Floor 1', type: 'FLOOR', parent_id: b.body.id });
    const res = await request(app).delete(`/areas/${b.body.id}`).set(auth());
    expect(res.status).toBe(409);
  });
});

describe('PATCH /areas/:id/active', () => {
  it('toggles is_active', async () => {
    const b = await createBuilding();
    const res = await request(app)
      .patch(`/areas/${b.body.id}/active`)
      .set(auth())
      .send({ is_active: false });
    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(false);
  });
});
