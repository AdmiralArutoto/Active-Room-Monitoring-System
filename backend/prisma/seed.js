const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const model = require('../src/sim/occupancy-model'); // shared realism (also used by the live ticker)

const prisma = new PrismaClient();

// Number of days of history to backfill (override with SEED_DAYS).
const DAYS = parseInt(process.env.SEED_DAYS) || 30;

// Map images: the seed copies files from prisma/seed-assets into the uploads dir
// as `area-<id><ext>` and sets image_path — exactly mirroring POST /areas/:id/image.
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';
const ASSETS_DIR = path.join(__dirname, 'seed-assets');
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.svg']; // raster first (SVGs may lack intrinsic size)
let imagesApplied = 0;

// First seed-asset matching one of `basenames` (no extension), or null.
function resolveAsset(basenames) {
  for (const base of basenames) {
    for (const ext of IMAGE_EXTS) {
      const p = path.join(ASSETS_DIR, base + ext);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

// Copies the matching asset into UPLOAD_DIR as `area-<id><ext>` and sets image_path.
async function applyImage(areaId, basenames) {
  const src = resolveAsset(basenames);
  if (!src) return false;
  const filename = `area-${areaId}${path.extname(src)}`;
  fs.copyFileSync(src, path.join(UPLOAD_DIR, filename));
  await prisma.area.update({ where: { id: areaId }, data: { image_path: filename } });
  imagesApplied++;
  return true;
}

// ── Seeded PRNG (mulberry32) ────────────────────────────────────────────────
// Deterministic so re-running the generator produces the same dataset.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(0x9e3779b9);
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

// Mirror of sensor.service.slugify so generated keys match the app's format.
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const SEED_USERS = [
  { username: 'admin',   password: 'admin123',   role: 'ADMIN',   email: 'admin@hallsense.io',   full_name: 'Admin User' },
  { username: 'manager', password: 'manager123', role: 'MANAGER', email: 'manager@hallsense.io', full_name: 'Manager User' },
  { username: 'viewer',  password: 'viewer123',  role: 'VIEWER',  email: 'viewer@hallsense.io',  full_name: 'Viewer User' },
];

// ── Topology definition ──────────────────────────────────────────────────────
// 9 areas under the campus: Buildings 1–8 + Dorms. Only buildings with `floors`
// set get a modelled interior (floors → rooms → sensors); the rest are placed as
// plain icons on the site map for now.
const BUILDINGS = [
  { code: 'B01', name: 'Building 1' },
  { code: 'B02', name: 'Building 2' },
  { code: 'B03', name: 'Building 3' },
  { code: 'B04', name: 'Building 4' },
  { code: 'B05', name: 'Building 5', floors: true },
  { code: 'B06', name: 'Building 6' },
  { code: 'B07', name: 'Building 7' },
  { code: 'B08', name: 'Building 8', floors: true },
  { code: 'DORM', name: 'Dorms' },
];

// Floor 1 uses the 1st-floor plan; floor 2 (and any above) reuse the generic
// upper-floor plan (floor_n).
const FLOORS = [
  { code: 'F01', name: 'Floor 1', asset: '1st_floor' },
  { code: 'F02', name: 'Floor 2', asset: 'floor_n' },
];
const ROOMS_PER_FLOOR = 4;

// ── Icon positions ───────────────────────────────────────────────────────────
// Captured from the dashboard after manual placement — keyed by building code or
// room key (e.g. 'B05' or 'B05.F01.R101'). Anything not listed falls back to a
// random position within the bounds below (e.g. a newly added building/room).
const POSITIONS = {
  // Buildings (campus / site map)
  B01:  { map_x: 1454, map_y: 386 },
  B02:  { map_x: 1361, map_y: 262 },
  B03:  { map_x: 1112, map_y: 217 },
  B04:  { map_x: 1110, map_y: 390 },
  B05:  { map_x: 731,  map_y: 528 },
  B06:  { map_x: 637,  map_y: 850 },
  B07:  { map_x: 591,  map_y: 1028 },
  B08:  { map_x: 438,  map_y: 406 },
  DORM: { map_x: 401,  map_y: 1154 },

  // Building 5 rooms (floor plans)
  'B05.F01.R101': { map_x: 1011, map_y: 836 },
  'B05.F01.R102': { map_x: 637,  map_y: 205 },
  'B05.F01.R103': { map_x: 771,  map_y: 616 },
  'B05.F01.R104': { map_x: 410,  map_y: 499 },
  'B05.F02.R201': { map_x: 170,  map_y: 379 },
  'B05.F02.R202': { map_x: 625,  map_y: 371 },
  'B05.F02.R203': { map_x: 847,  map_y: 795 },
  'B05.F02.R204': { map_x: 955,  map_y: 373 },

  // Building 8 rooms (floor plans)
  'B08.F01.R101': { map_x: 678,  map_y: 202 },
  'B08.F01.R102': { map_x: 1004, map_y: 835 },
  'B08.F01.R103': { map_x: 437,  map_y: 511 },
  'B08.F01.R104': { map_x: 643,  map_y: 830 },
  'B08.F02.R201': { map_x: 900,  map_y: 797 },
  'B08.F02.R202': { map_x: 141,  map_y: 374 },
  'B08.F02.R203': { map_x: 156,  map_y: 683 },
  'B08.F02.R204': { map_x: 1311, map_y: 373 },
};

// Room name overrides (keyed by room key). Anything not listed defaults to "Room <code>".
const ROOM_NAMES = {
  'B05.F01.R101': 'Office R101',
  'B05.F01.R102': 'Lecture hall R102',
  'B05.F01.R103': 'Office R103',
  'B05.F01.R104': 'caffeteria',
  'B05.F02.R201': 'Computer lab',
  'B05.F02.R202': 'lecture hall',
  'B05.F02.R203': 'Auditorium',
  'B05.F02.R204': 'lecture hall',
};

const BUILDING_BOUNDS = { x: [80, 700], y: [80, 500] };
const ROOM_BOUNDS = { x: [80, 700], y: [80, 450] };

function positionFor(key, bounds) {
  const fixed = POSITIONS[key];
  if (fixed) return { map_x: fixed.map_x, map_y: fixed.map_y };
  return { map_x: randInt(bounds.x[0], bounds.x[1]), map_y: randInt(bounds.y[0], bounds.y[1]) };
}

async function seedUsers() {
  for (const u of SEED_USERS) {
    const password_hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: { username: u.username, password_hash, role: u.role, email: u.email, full_name: u.full_name },
    });
  }
  console.log(`Seed: ${SEED_USERS.length} users ensured.`);
}

// Creates the area tree + one MOTION and one LIGHT sensor per room.
// Returns the list of rooms with their sensor ids and a "wasteful" discipline flag.
async function seedTopology() {
  const site = await prisma.area.create({
    data: { name: 'Main Campus', type: 'SITE', map_x: 0, map_y: 0 },
  });
  await applyImage(site.id, ['site']); // campus map (buildings overlaid)

  const rooms = [];

  for (const bd of BUILDINGS) {
    const bpos = positionFor(bd.code, BUILDING_BOUNDS);
    const building = await prisma.area.create({
      data: { name: bd.name, type: 'BUILDING', code: bd.code, parent_id: site.id, map_x: bpos.map_x, map_y: bpos.map_y },
    });

    if (!bd.floors) continue; // no modelled interior — just an icon on the site map

    for (let f = 0; f < FLOORS.length; f++) {
      const fl = FLOORS[f];
      const floor = await prisma.area.create({
        data: { name: fl.name, type: 'FLOOR', code: fl.code, parent_id: building.id, map_x: 0, map_y: 0 },
      });
      // floor plan (rooms overlaid): 1st_floor.* for F01, floor_n.* for upper floors, else generic floor.*
      await applyImage(floor.id, [fl.asset, 'floor']);

      for (let r = 0; r < ROOMS_PER_FLOOR; r++) {
        const roomCode = `R${f + 1}0${r + 1}`; // R101, R102, ... / R201, ...
        const roomKey = `${bd.code}.${fl.code}.${roomCode}`;
        const roomName = ROOM_NAMES[roomKey] ?? `Room ${roomCode}`;
        const rpos = positionFor(roomKey, ROOM_BOUNDS);
        const room = await prisma.area.create({
          data: { name: roomName, type: 'ROOM', code: roomCode, parent_id: floor.id, map_x: rpos.map_x, map_y: rpos.map_y },
        });

        const keyPrefix = roomKey.toLowerCase();
        const motion = await prisma.sensor.create({
          data: { sensor_key: `${keyPrefix}.${slugify('Motion 1')}`, name: 'Motion 1', kind: 'MOTION', room_area_id: room.id },
        });
        const light = await prisma.sensor.create({
          data: { sensor_key: `${keyPrefix}.${slugify('Light 1')}`, name: 'Light 1', kind: 'LIGHT', room_area_id: room.id },
        });

        rooms.push({
          room_id: room.id,
          motionSensorId: motion.id,
          lightSensorId: light.id,
          // ~1/3 of rooms are "wasteful" (deterministic by room key) — shared with the live ticker.
          wasteful: model.isWastefulRoom(`${bd.code}.${roomCode}`),
        });
      }
    }
  }

  console.log(`Seed: topology created (${BUILDINGS.length} buildings, ${rooms.length} rooms, ${rooms.length * 2} sensors).`);
  return rooms;
}

// Builds a realistic ~DAYS history of MOTION/LIGHT events with planted lighting waste.
function generateEvents(rooms) {
  const events = [];
  const dayMs = 24 * 60 * 60 * 1000;

  // Midnight UTC today, then walk back DAYS-1 days.
  const now = new Date();
  const todayMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  for (let d = DAYS - 1; d >= 0; d--) {
    const dayStart = todayMidnight - d * dayMs;
    const weekday = new Date(dayStart).getUTCDay(); // 0 = Sun, 6 = Sat
    const isWeekend = weekday === 0 || weekday === 6;

    const atMin = (min) => new Date(dayStart + min * 60 * 1000);

    for (const room of rooms) {
      // ── Occupancy sessions (drives MOTION) ──────────────────────────────
      const numSessions = isWeekend ? model.weekendSessionCount(rand) : model.weekdaySessionCount(rand);
      const sessions = [];
      let cursor = model.OPENING_HOUR * 60; // start scanning from opening
      for (let s = 0; s < numSessions; s++) {
        const start = cursor + randInt(20, 90);
        const dur = model.sampleSessionMinutes(rand);
        if (start + dur > model.CLOSING_HOUR * 60) break; // stay within opening–closing
        sessions.push({ start, end: start + dur });
        cursor = start + dur;
      }

      for (const ses of sessions) {
        events.push({ sensor_id: room.motionSensorId, value: 'on', ts: atMin(ses.start) });
        events.push({ sensor_id: room.motionSensorId, value: 'off', ts: atMin(ses.end) });
      }

      // ── Lighting (correlated with occupancy, with planted waste) ─────────
      if (sessions.length > 0) {
        const firstStart = sessions[0].start;
        const lastEnd = sessions[sessions.length - 1].end;
        const lightOn = Math.max(0, firstStart - model.lightOnLeadMin(rand));
        // Wasteful rooms leave the light on late into the evening; good rooms
        // switch off shortly after the last occupant leaves.
        const lightOff = room.wasteful
          ? model.wastefulLightOffMinute(rand)
          : Math.min(23 * 60 + 59, lastEnd + model.goodRoomLightOffDelayMin(rand));
        events.push({ sensor_id: room.lightSensorId, value: 'on', ts: atMin(lightOn) });
        events.push({ sensor_id: room.lightSensorId, value: 'off', ts: atMin(lightOff) });
      }
    }
  }

  // Don't plant events later than the real clock — otherwise the seed's "rest of today"
  // events would sort above genuinely live (ticker) events in the logs.
  const nowMs = now.getTime();
  return events.filter((e) => e.ts.getTime() <= nowMs);
}

async function seedEvents(rooms) {
  const events = generateEvents(rooms);
  // createMany in chunks to keep the statement size reasonable.
  const CHUNK = 1000;
  for (let i = 0; i < events.length; i += CHUNK) {
    await prisma.sensorEvent.createMany({ data: events.slice(i, i + CHUNK) });
  }
  console.log(`Seed: ${events.length} sensor events over ${DAYS} days.`);
}

// Wipe demo data (FK-safe order) so the generator is idempotent. Users are kept.
async function wipe() {
  await prisma.sensorEvent.deleteMany({});
  await prisma.sensor.deleteMany({});
  await prisma.area.deleteMany({});
  // Remove orphaned area map images from previous runs (their areas are now gone).
  try {
    if (fs.existsSync(UPLOAD_DIR)) {
      for (const f of fs.readdirSync(UPLOAD_DIR)) {
        if (f.startsWith('area-')) fs.rmSync(path.join(UPLOAD_DIR, f), { force: true });
      }
    }
  } catch (e) { console.warn('Seed: could not clear old images:', e.message); }
  console.log('Seed: cleared existing sensor events, sensors and areas.');
}

async function main() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  await seedUsers();
  await wipe();
  const rooms = await seedTopology();
  await seedEvents(rooms);
  if (imagesApplied === 0) {
    console.warn(`Seed: no map images found in ${ASSETS_DIR} — dashboard map will be empty. ` +
      `Add site.* and floor.* (see seed-assets/README.md) and re-run.`);
  } else {
    console.log(`Seed: applied ${imagesApplied} map image(s).`);
  }
  console.log('Seed: done.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
