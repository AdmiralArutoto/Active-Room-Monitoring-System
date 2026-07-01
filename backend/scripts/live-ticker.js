// Live occupancy simulator — replaces the old random-spam ticker.
// Maintains coherent per-room state (visits, light-follows-motion, wasteful rooms) on an
// accelerated sim clock, sharing the realism model with the historical generator. Drives the
// real pipeline (POST /api/states/:sensor_key -> Redis -> WebSocket -> SensorEvent) and emits
// only on change. Run inside the backend container: `npm run live:ticker`. Stop with Ctrl+C.
const { PrismaClient } = require('@prisma/client');
const model = require('../src/sim/occupancy-model');

const prisma = new PrismaClient();

const API_URL = process.env.API_URL || 'http://localhost:3000';
const SPEED = Number(process.env.SPEED) || 60;            // sim seconds per real second (1 = real-time)
const TICK_MS = Number(process.env.TICK_MS) || 1000;      // real ms between ticks
const ANOMALIES = (process.env.ANOMALIES || 'on') !== 'off';
const ANOMALY_RATE = Number(process.env.ANOMALY_RATE) || 0.01; // ~ per sim-hour per room
const START_MS = process.env.START ? new Date(process.env.START).getTime() : Date.now();
const VISIT_RATE = Number(process.env.VISIT_RATE) || 0.011; // visit-start chance per active sim-min (turn up = busier)
// Floor under the time-of-day activity curve (0..1). 0 = realistic (quiet nights);
// raise it (e.g. 0.6) to force steady activity regardless of the sim clock.
const INTENSITY_FLOOR = Number(process.env.INTENSITY_FLOOR) || 0;
const MODE = (process.env.MODE || 'sim').toLowerCase();             // 'sim' = realistic/accelerated | 'live' = real-time spam
const CHANGES_PER_MIN = Number(process.env.CHANGES_PER_MIN) || 20;  // live-mode target emission rate

const HOUR = 3600000;
const DAY = 86400000;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const randMin = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const dayFloorMs = (ms) => { const d = new Date(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
const fmt = (ms) => { const d = new Date(ms); return `${WD[d.getUTCDay()]} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };

const lastEmitted = new Map(); // sensor_key -> last posted state

async function emit(key, state, simMs) {
  if (lastEmitted.get(key) === state) return; // change-only
  lastEmitted.set(key, state);
  try {
    const res = await fetch(`${API_URL}/api/states/${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state }),
    });
    if (!res.ok) console.error(`  emit ${key} -> HTTP ${res.status}`);
    else console.log(`[${fmt(simMs)}] ${key.padEnd(28)} ${state}`);
  } catch (e) { console.error('  emit error:', e.message); }
}

async function loadRooms() {
  const sensors = await prisma.sensor.findMany({
    where: { is_active: true, kind: { in: ['MOTION', 'LIGHT'] }, room_area_id: { not: null } },
    include: { room: { select: { id: true, code: true, parent: { select: { parent: { select: { code: true } } } } } } },
  });
  const rooms = new Map();
  for (const s of sensors) {
    if (!s.room) continue;
    if (!rooms.has(s.room.id)) {
      const buildingCode = s.room.parent?.parent?.code || '';
      rooms.set(s.room.id, {
        code: `${buildingCode}.${s.room.code}`,
        wasteful: model.isWastefulRoom(`${buildingCode}.${s.room.code}`),
        motionKey: null, lightKey: null,
        occupied: false, lightOn: false,
        sessionEndsAt: 0, lightOffAt: 0, offlineUntil: 0, motionFaultUntil: 0,
      });
    }
    const r = rooms.get(s.room.id);
    if (s.kind === 'MOTION') r.motionKey = s.sensor_key;
    else if (s.kind === 'LIGHT') r.lightKey = s.sensor_key;
  }
  return [...rooms.values()].filter((r) => r.motionKey && r.lightKey);
}

// Schedules when a vacated room's light turns off (good = soon; wasteful/anomaly = late evening).
function scheduleLightOff(room, simMs, overnight) {
  if (overnight) {
    let off = dayFloorMs(simMs) + model.wastefulLightOffMinute(Math.random) * 60000;
    if (off <= simMs) off = simMs + 30 * 60000; // already past -> linger 30 sim-min
    room.lightOffAt = off;
  } else {
    room.lightOffAt = simMs + model.goodRoomLightOffDelayMin(Math.random) * 60000;
  }
}

async function tickRoom(room, simMs, simMin) {
  const simDate = new Date(simMs);

  // ── Anomaly: sensor offline (goes silent, then recovers) ──────────────────
  if (ANOMALIES) {
    if (room.offlineUntil > simMs) { return; } // silent: emit nothing this tick
    if (room.offlineUntil && simMs >= room.offlineUntil) room.offlineUntil = 0; // just recovered
    if (Math.random() < ANOMALY_RATE * (simMin / 60)) {
      room.offlineUntil = simMs + randMin(6, 24) * HOUR;
      return;
    }
  }

  // ── Anomaly: transient motion fault clears ────────────────────────────────
  if (room.motionFaultUntil && simMs >= room.motionFaultUntil) room.motionFaultUntil = 0;

  // ── Normal occupancy transitions (suppressed while faulted) ───────────────
  if (!room.motionFaultUntil) {
    if (room.occupied) {
      if (simMs >= room.sessionEndsAt) {
        room.occupied = false;
        const faulted = ANOMALIES && Math.random() < ANOMALY_RATE * 0.4;
        if (faulted) room.motionFaultUntil = simMs + randMin(20, 90) * 60000; // motion sensor "stuck"
        const overnight = room.wasteful || (ANOMALIES && Math.random() < ANOMALY_RATE);
        scheduleLightOff(room, simMs, overnight);
      }
    } else {
      const activity = Math.max(model.intensity(simDate), INTENSITY_FLOOR);
      if (Math.random() < activity * VISIT_RATE * simMin) {
        room.occupied = true;
        room.lightOn = true;
        room.sessionEndsAt = simMs + model.sampleSessionMinutes(Math.random) * 60000;
      }
    }
  }

  // ── Light turns off once due and the room is empty ────────────────────────
  if (room.lightOn && !room.occupied && room.lightOffAt && simMs >= room.lightOffAt) {
    room.lightOn = false;
    room.lightOffAt = 0;
  }

  // ── Emit current states (change-only) ─────────────────────────────────────
  const motionState = room.motionFaultUntil ? 'fault' : (room.occupied ? 'on' : 'off');
  await emit(room.motionKey, motionState, simMs);
  await emit(room.lightKey, room.lightOn ? 'on' : 'off', simMs);
}

function registerShutdown(timer) {
  const shutdown = () => { clearInterval(timer); console.log('\nLive ticker: stopped.'); prisma.$disconnect().finally(() => process.exit(0)); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// SIM: realistic occupancy on an accelerated clock — for believable trends/analytics.
function runSim(rooms) {
  console.log(`Live ticker [sim]: ${rooms.length} rooms | SPEED=${SPEED}x | tick ${TICK_MS}ms | visitRate=${VISIT_RATE} | floor=${INTENSITY_FLOOR} | anomalies ${ANOMALIES ? 'on' : 'off'}`);
  console.log(`Sim start: ${fmt(START_MS)} -> ${API_URL}. Ctrl+C to stop.\n`);
  let simMs = START_MS;
  let lastReal = Date.now();
  const timer = setInterval(async () => {
    const now = Date.now();
    const simElapsed = (now - lastReal) * SPEED;
    lastReal = now;
    simMs += simElapsed;
    const simMin = simElapsed / 60000;
    for (const room of rooms) await tickRoom(room, simMs, simMin);
  }, TICK_MS);
  registerShutdown(timer);
}

// LIVE: real-time, real-timestamped "spam" for demoing the live pipeline (logs/dashboard).
// Light strictly follows motion so it stays coherent and doesn't corrupt the analytics.
function runLive(rooms) {
  const flipsPerMin = CHANGES_PER_MIN / 2; // each flip = a motion change + a light change
  console.log(`Live ticker [live]: ${rooms.length} rooms | ~${CHANGES_PER_MIN} changes/min | real-time -> ${API_URL}. Ctrl+C to stop.\n`);
  const timer = setInterval(async () => {
    const now = Date.now();
    const expected = flipsPerMin * (TICK_MS / 60000);
    const n = Math.floor(expected) + (Math.random() < (expected % 1) ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const room = rooms[Math.floor(Math.random() * rooms.length)];
      room.occupied = !room.occupied;
      room.lightOn = room.occupied;
      await emit(room.motionKey, room.occupied ? 'on' : 'off', now);
      await emit(room.lightKey, room.lightOn ? 'on' : 'off', now);
    }
  }, TICK_MS);
  registerShutdown(timer);
}

async function main() {
  const rooms = await loadRooms();
  if (rooms.length === 0) { console.log('Live ticker: no sensors found.'); process.exit(0); }
  if (MODE === 'live') runLive(rooms);
  else runSim(rooms);
}

main().catch((e) => { console.error('Live ticker error:', e); process.exit(1); });
