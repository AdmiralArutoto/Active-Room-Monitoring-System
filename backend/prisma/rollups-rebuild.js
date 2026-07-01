const { PrismaClient } = require('@prisma/client');
const svc = require('../src/services/analytics.service');

const prisma = new PrismaClient();
const DAY_MS = 24 * 60 * 60 * 1000;

// UTC midnight for the day containing `ts` (ms).
function dayBucket(ts) {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// State of a sensor at `from`: its last event strictly before `from`, else 'off'.
function carryAt(events, from) {
  let state = 'off';
  for (const e of events) {
    if (e.ts < from) state = svc.normalizeState(e.value);
    else break;
  }
  return state;
}

async function main() {
  const sensors = await prisma.sensor.findMany({
    where: { kind: { in: ['MOTION', 'LIGHT'] }, room_area_id: { not: null } },
    select: { id: true, kind: true, room_area_id: true },
  });
  if (sensors.length === 0) { console.log('Rollup: no sensors, nothing to do.'); return; }

  const sensorIds = sensors.map((s) => s.id);
  const events = await prisma.sensorEvent.findMany({
    where: { sensor_id: { in: sensorIds } },
    orderBy: { ts: 'asc' },
    select: { sensor_id: true, value: true, ts: true },
  });
  if (events.length === 0) { console.log('Rollup: no events, nothing to do.'); return; }

  // Events per sensor (already ascending).
  const bySensor = new Map(sensorIds.map((id) => [id, []]));
  for (const e of events) bySensor.get(e.sensor_id).push(e);

  // Motion/light sensor ids per room.
  const rooms = new Map();
  for (const s of sensors) {
    if (!rooms.has(s.room_area_id)) rooms.set(s.room_area_id, { motion: null, light: null });
    const slot = rooms.get(s.room_area_id);
    if (s.kind === 'MOTION') slot.motion = s.id;
    else if (s.kind === 'LIGHT') slot.light = s.id;
  }

  const firstDay = dayBucket(events[0].ts);
  const lastDay = dayBucket(events[events.length - 1].ts);

  const rows = [];
  for (let day = firstDay; day <= lastDay; day += DAY_MS) {
    const from = new Date(day);
    const to = new Date(day + DAY_MS);
    for (const [room_area_id, { motion, light }] of rooms) {
      if (!motion || !light) continue;
      const mAll = bySensor.get(motion) || [];
      const lAll = bySensor.get(light) || [];
      const mWin = mAll.filter((e) => e.ts >= from && e.ts < to);
      const lWin = lAll.filter((e) => e.ts >= from && e.ts < to);
      const event_count = mWin.length + lWin.length;

      const wasted_minutes = Math.round(svc.wastedMinutes({
        motionEvents: mWin, lightEvents: lWin,
        motionCarry: carryAt(mAll, from), lightCarry: carryAt(lAll, from), from, to,
      }));
      const lights_on_minutes = Math.round(svc.onMinutes({
        events: lWin, carry: carryAt(lAll, from), from, to,
      }));

      if (event_count === 0 && wasted_minutes === 0 && lights_on_minutes === 0) continue;
      rows.push({ room_area_id, date: from, wasted_minutes, lights_on_minutes, event_count });
    }
  }

  // Rollups are fully derived — wipe and recreate.
  await prisma.roomLightingRollup.deleteMany({});
  const CHUNK = 1000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.roomLightingRollup.createMany({ data: rows.slice(i, i + CHUNK) });
  }
  console.log(`Rollup: rebuilt ${rows.length} room-day rows (${firstDay === lastDay ? 1 : (lastDay - firstDay) / DAY_MS + 1} days).`);
}

main()
  .catch((e) => { console.error('Rollup error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
