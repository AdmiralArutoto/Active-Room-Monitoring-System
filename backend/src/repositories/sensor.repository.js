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

async function findByRoomAndKind(room_area_id, kind) {
  return prisma.sensor.findUnique({
    where: { room_area_id_kind: { room_area_id, kind } },
  });
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

async function appendEvent(sensor_id, value, ts, raw) {
  return prisma.sensorEvent.create({
    data: { sensor_id, value, ts, raw: raw ?? undefined },
  });
}

async function findEvents({ sensor_id, from, to, limit = 50, offset = 0 }) {
  const where = {};
  if (sensor_id) where.sensor_id = sensor_id;
  if (from || to) {
    where.ts = {};
    if (from) where.ts.gte = new Date(from);
    if (to) where.ts.lte = new Date(to);
  }
  return prisma.sensorEvent.findMany({
    where,
    include: { sensor: { select: { id: true, name: true, sensor_key: true } } },
    orderBy: { ts: 'desc' },
    take: limit,
    skip: offset,
  });
}

module.exports = { findAll, findById, findBySensorKey, findByRoomAndKind, create, update, remove, appendEvent, findEvents };
