const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Fetches everything needed to compute room-level analytics for [from, to]:
//  - all MOTION/LIGHT sensors with their room,
//  - their events within the window (ascending),
//  - the carry-in state per sensor (last event strictly before `from`).
async function fetchWindow({ from, to }) {
  const sensors = await prisma.sensor.findMany({
    where: { kind: { in: ['MOTION', 'LIGHT'] }, room_area_id: { not: null } },
    include: { room: { select: { id: true, name: true, code: true, parent: { select: { parent: { select: { code: true } } } } } } },
  });
  const sensorIds = sensors.map((s) => s.id);
  if (sensorIds.length === 0) return { sensors, windowEvents: [], carryIn: [] };

  const windowEvents = await prisma.sensorEvent.findMany({
    where: { sensor_id: { in: sensorIds }, ts: { gte: from, lte: to } },
    orderBy: { ts: 'asc' },
    select: { sensor_id: true, value: true, ts: true },
  });

  // One row per sensor: its most recent event before the window starts.
  const carryIn = await prisma.sensorEvent.findMany({
    where: { sensor_id: { in: sensorIds }, ts: { lt: from } },
    orderBy: { ts: 'desc' },
    distinct: ['sensor_id'],
    select: { sensor_id: true, value: true, ts: true },
  });

  return { sensors, windowEvents, carryIn };
}

// Total number of rollup rows (used to decide whether to fall back to raw).
async function rollupCount() {
  return prisma.roomLightingRollup.count();
}

// Daily rollup rows whose day-bucket falls within [from, to), with their room.
async function fetchRollups({ from, to }) {
  const dayFloor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  return prisma.roomLightingRollup.findMany({
    where: { date: { gte: dayFloor, lt: to } },
    include: { room: { select: { id: true, name: true, code: true, parent: { select: { parent: { select: { code: true } } } } } } },
  });
}

module.exports = { fetchWindow, rollupCount, fetchRollups };
