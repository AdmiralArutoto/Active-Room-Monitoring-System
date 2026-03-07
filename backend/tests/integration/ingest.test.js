const request = require('supertest');
const app = require('../../src/app');
const { prisma, resetDb } = require('../helpers/db');
const stateStore = require('../../src/store/state.store');
const bcrypt = require('bcrypt');

let token;
let sensor;

beforeAll(async () => {
  await resetDb();
  const hash = await bcrypt.hash('secret123', 10);
  await prisma.user.create({ data: { username: 'admin', password_hash: hash, role: 'ADMIN' } });
  const loginRes = await request(app).post('/auth/login').send({ username: 'admin', password: 'secret123' });
  token = loginRes.body.token;

  // Build area hierarchy and sensor
  const building = await prisma.area.create({ data: { name: 'B1', type: 'BUILDING', code: 'B01' } });
  const floor = await prisma.area.create({ data: { name: 'F1', type: 'FLOOR', code: 'F01', parent_id: building.id } });
  const room = await prisma.area.create({ data: { name: 'R1', type: 'ROOM', code: 'R101', parent_id: floor.id } });
  sensor = await prisma.sensor.create({
    data: { name: 'Motion 1', kind: 'MOTION', sensor_key: 'B01.F01.R101.motion_1', room_area_id: room.id },
  });
});

// The in-memory store is shared across tests; each test pushes its own state
// so ordering matters only within describe blocks — which run sequentially (--runInBand).

afterAll(async () => {
  await prisma.$disconnect();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('POST /api/states/:sensor_key', () => {
  it('accepts a valid state push', async () => {
    const res = await request(app)
      .post(`/api/states/${sensor.sensor_key}`)
      .send({ state: 'detected' });
    expect(res.status).toBe(200);
    expect(res.body.sensor_key).toBe(sensor.sensor_key);
    expect(res.body.state).toBe('detected');
  });

  it('returns 400 when state is missing', async () => {
    const res = await request(app)
      .post(`/api/states/${sensor.sensor_key}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown sensor_key', async () => {
    const res = await request(app)
      .post('/api/states/unknown.key')
      .send({ state: 'active' });
    expect(res.status).toBe(404);
  });

  it('returns 403 for inactive sensor', async () => {
    await prisma.sensor.update({ where: { id: sensor.id }, data: { is_active: false } });
    const res = await request(app)
      .post(`/api/states/${sensor.sensor_key}`)
      .send({ state: 'active' });
    expect(res.status).toBe(403);
    // Restore for subsequent tests
    await prisma.sensor.update({ where: { id: sensor.id }, data: { is_active: true } });
  });

  it('does not require auth', async () => {
    const res = await request(app)
      .post(`/api/states/${sensor.sensor_key}`)
      .send({ state: 'clear' });
    expect(res.status).toBe(200);
  });
});

describe('GET /api/states', () => {
  it('returns current snapshot after a push', async () => {
    await request(app).post(`/api/states/${sensor.sensor_key}`).send({ state: 'detected' });
    const res = await request(app).get('/api/states').set(auth());
    expect(res.status).toBe(200);
    const entry = res.body[sensor.sensor_key];
    expect(entry).toBeDefined();
    expect(entry.state).toBe('detected');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/states');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/states/:sensor_key', () => {
  it('returns state for a specific sensor_key', async () => {
    await request(app).post(`/api/states/${sensor.sensor_key}`).send({ state: 'motion' });
    const res = await request(app).get(`/api/states/${sensor.sensor_key}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('motion');
  });

  it('returns 404 for sensor_key with no state yet', async () => {
    const res = await request(app).get('/api/states/B01.F01.R101.nonexistent').set(auth());
    expect(res.status).toBe(404);
  });
});
