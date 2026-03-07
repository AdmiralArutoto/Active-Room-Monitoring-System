const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findAll() {
  return prisma.sensor.findMany({
    include: { room: { select: { id: true, name: true, type: true } } },
    orderBy: { name: 'asc' },
  });
}

async function findById(id) {
  return prisma.sensor.findUnique({
    where: { id },
    include: { room: { select: { id: true, name: true, type: true } } },
  });
}

async function findBySensorKey(sensor_key) {
  return prisma.sensor.findUnique({ where: { sensor_key } });
}

async function create(data) {
  return prisma.sensor.create({ data });
}

async function update(id, data) {
  return prisma.sensor.update({ where: { id }, data });
}

async function remove(id) {
  return prisma.sensor.delete({ where: { id } });
}

async function upsertState(sensor_id, last_value, last_ts) {
  return prisma.sensorState.upsert({
    where: { sensor_id },
    update: { last_value, last_ts, updated_at: new Date() },
    create: { sensor_id, last_value, last_ts, updated_at: new Date() },
  });
}

async function appendEvent(sensor_id, value, ts, raw) {
  return prisma.sensorEvent.create({
    data: { sensor_id, value, ts, raw: raw ?? undefined },
  });
}

module.exports = { findAll, findById, findBySensorKey, create, update, remove, upsertState, appendEvent };
