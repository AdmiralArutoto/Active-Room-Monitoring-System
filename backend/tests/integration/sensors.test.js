const request = require('supertest');
const app = require('../../src/app');
const { prisma, resetDb } = require('../helpers/db');
const bcrypt = require('bcrypt');

let token;
let roomId;

beforeAll(async () => {
  await resetDb();
  const hash = await bcrypt.hash('secret123', 10);
  await prisma.user.create({ data: { username: 'admin', password_hash: hash, role: 'ADMIN' } });
  const loginRes = await request(app).post('/auth/login').send({ username: 'admin', password: 'secret123' });
  token = loginRes.body.token;

  // Build area hierarchy: building → floor → room (all with codes)
  const building = await prisma.area.create({ data: { name: 'B1', type: 'BUILDING', code: 'B01' } });
  const floor = await prisma.area.create({ data: { name: 'F1', type: 'FLOOR', code: 'F01', parent_id: building.id } });
  const room = await prisma.area.create({ data: { name: 'R1', type: 'ROOM', code: 'R101', parent_id: floor.id } });
  roomId = room.id;
});

beforeEach(async () => {
  await prisma.sensorEvent.deleteMany();
  await prisma.sensorState.deleteMany();
  await prisma.sensor.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('POST /sensors', () => {
  it('registers a sensor and auto-generates sensor_key', async () => {
    const res = await request(app)
      .post('/sensors')
      .set(auth())
      .send({ name: 'Motion Sensor 1', kind: 'MOTION', room_area_id: roomId });
    expect(res.status).toBe(201);
    expect(res.body.sensor_key).toBe('B01.F01.R101.motion_sensor_1');
  });

  it('returns 400 when room_area_id is missing', async () => {
    const res = await request(app)
      .post('/sensors')
      .set(auth())
      .send({ name: 'Orphan', kind: 'MOTION' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when room has no code', async () => {
    // Create an area hierarchy where the room has no code
    const b = await prisma.area.create({ data: { name: 'B2', type: 'BUILDING', code: 'B02' } });
    const f = await prisma.area.create({ data: { name: 'F2', type: 'FLOOR', code: 'F02', parent_id: b.id } });
    const noCodeRoom = await prisma.area.create({ data: { name: 'NoCode', type: 'ROOM', parent_id: f.id } });

    const res = await request(app)
      .post('/sensors')
      .set(auth())
      .send({ name: 'Sensor', kind: 'MOTION', room_area_id: noCodeRoom.id });
    expect(res.status).toBe(400);
  });

  it('deduplicates sensor_key when name collides', async () => {
    await request(app).post('/sensors').set(auth()).send({ name: 'Door Sensor', kind: 'DOOR', room_area_id: roomId });
    const res = await request(app)
      .post('/sensors')
      .set(auth())
      .send({ name: 'Door Sensor', kind: 'DOOR', room_area_id: roomId });
    expect(res.status).toBe(201);
    expect(res.body.sensor_key).toBe('B01.F01.R101.door_sensor_2');
  });
});

describe('PATCH /sensors/:id/active', () => {
  it('toggles is_active', async () => {
    const create = await request(app)
      .post('/sensors')
      .set(auth())
      .send({ name: 'Temp', kind: 'TEMPERATURE', room_area_id: roomId });
    const id = create.body.id;

    const res = await request(app)
      .patch(`/sensors/${id}/active`)
      .set(auth())
      .send({ is_active: false });
    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(false);
  });
});

describe('DELETE /sensors/:id', () => {
  it('deletes a sensor', async () => {
    const create = await request(app)
      .post('/sensors')
      .set(auth())
      .send({ name: 'Light', kind: 'LIGHT', room_area_id: roomId });
    const res = await request(app).delete(`/sensors/${create.body.id}`).set(auth());
    expect(res.status).toBe(204);
  });
});
