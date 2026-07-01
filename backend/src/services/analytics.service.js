const analyticsRepo = require('../repositories/analytics.repository');

// Energy/cost model (env-configurable) — turns wasted-lighting minutes into ₪ (NIS) / CO₂.
const WATTS_PER_LIGHT = Number(process.env.WATTS_PER_LIGHT) || 40;
const COST_PER_KWH = Number(process.env.COST_PER_KWH) || 0.60; // NIS per kWh (Israeli residential tariff ≈ ₪0.60)
const CO2_KG_PER_KWH = Number(process.env.CO2_KG_PER_KWH) || 0.40;

// Operating window for utilization (env-configurable). Mon–Fri, [start, end) UTC hours.
const OPERATING_START_HOUR = Number(process.env.OPERATING_START_HOUR) || 8;
const OPERATING_END_HOUR = Number(process.env.OPERATING_END_HOUR) || 18;
const OPERATING_DAYS = new Set([1, 2, 3, 4, 5]); // getUTCDay: Mon..Fri
const DAY_MS = 86400000;

// ── Pure computation helpers (shared by the live endpoint and the rollup rebuild) ──

// Normalizes a raw sensor value to 'on' | 'off'. Mirrors the frontend's
// classifySensorState vocabulary (on/active/detected = on, everything else = off).
function normalizeState(value) {
  if (!value) return 'off';
  const v = value.toLowerCase();
  return v === 'on' || v === 'active' || v === 'detected' ? 'on' : 'off';
}

// State of a sensor at time `t` (ms): the last event at-or-before t, else the
// carry-in state, else 'off'. `events` must be sorted ascending by ts.
function stateAt(events, carryState, t) {
  let state = carryState;
  for (const e of events) {
    if (e.ts.getTime() <= t) state = normalizeState(e.value);
    else break;
  }
  return state;
}

// Distinct, sorted boundary timestamps (ms) within [from, to].
function boundaries(eventLists, from, to) {
  const points = new Set([from.getTime(), to.getTime()]);
  for (const list of eventLists) {
    for (const e of list) {
      const t = e.ts.getTime();
      if (t > from.getTime() && t < to.getTime()) points.add(t);
    }
  }
  return [...points].sort((a, b) => a - b);
}

// Minutes a room's LIGHT is on while its MOTION is off, over [from, to].
function wastedMinutes({ motionEvents, lightEvents, motionCarry, lightCarry, from, to }) {
  const bounds = boundaries([motionEvents, lightEvents], from, to);
  let ms = 0;
  for (let i = 0; i < bounds.length - 1; i++) {
    const mid = (bounds[i] + bounds[i + 1]) / 2; // state is constant between boundaries
    const light = stateAt(lightEvents, lightCarry, mid);
    const motion = stateAt(motionEvents, motionCarry, mid);
    if (light === 'on' && motion === 'off') ms += bounds[i + 1] - bounds[i];
  }
  return ms / 60000;
}

// Minutes a single sensor is 'on' over [from, to].
function onMinutes({ events, carry, from, to }) {
  const bounds = boundaries([events], from, to);
  let ms = 0;
  for (let i = 0; i < bounds.length - 1; i++) {
    const mid = (bounds[i] + bounds[i + 1]) / 2;
    if (stateAt(events, carry, mid) === 'on') ms += bounds[i + 1] - bounds[i];
  }
  return ms / 60000;
}

// Room codes repeat across buildings (B01/R101 vs B02/R101), so qualify the
// display label with the building code when available.
function roomLabel(room) {
  const buildingCode = room.parent?.parent?.code;
  const base = room.code || room.name;
  return buildingCode ? `${buildingCode}·${base}` : base;
}

// ── Aggregation over all rooms for a window ──────────────────────────────────

// Groups raw events by room and returns wasted-lighting per room (sorted desc).
// Shape of inputs matches analyticsRepo.fetchWindow().
function computeWastedByRoom({ sensors, windowEvents, carryIn, from, to }) {
  // Bucket events per sensor.
  const bySensor = new Map(); // sensor_id -> { window: [], carry: state }
  for (const s of sensors) bySensor.set(s.id, { window: [], carry: 'off' });
  for (const e of windowEvents) bySensor.get(e.sensor_id)?.window.push(e);
  for (const c of carryIn) {
    const entry = bySensor.get(c.sensor_id);
    if (entry) entry.carry = normalizeState(c.value);
  }

  // Group sensors by room.
  const rooms = new Map(); // room_id -> { room, motion, light }
  for (const s of sensors) {
    if (!s.room) continue;
    if (!rooms.has(s.room.id)) rooms.set(s.room.id, { room: s.room, motion: null, light: null });
    const slot = rooms.get(s.room.id);
    if (s.kind === 'MOTION') slot.motion = s;
    else if (s.kind === 'LIGHT') slot.light = s;
  }

  const result = [];
  let total = 0;
  for (const { room, motion, light } of rooms.values()) {
    if (!motion || !light) continue; // need both to derive waste
    const m = bySensor.get(motion.id);
    const l = bySensor.get(light.id);
    const minutes = Math.round(
      wastedMinutes({
        motionEvents: m.window, lightEvents: l.window,
        motionCarry: m.carry, lightCarry: l.carry, from, to,
      })
    );
    total += minutes;
    result.push({ room_id: room.id, name: room.name, code: room.code, label: roomLabel(room), wasted_minutes: minutes });
  }

  result.sort((a, b) => b.wasted_minutes - a.wasted_minutes);
  return { rooms: result, total_wasted_minutes: total };
}

// Adds ₪/CO₂/kWh fields to a wasted-lighting result (per room + window totals).
function applyCost(result) {
  const kwh = (min) => (min / 60) * (WATTS_PER_LIGHT / 1000);
  const rooms = result.rooms.map((r) => {
    const wasted_kwh = +kwh(r.wasted_minutes).toFixed(2);
    return {
      ...r,
      wasted_kwh,
      wasted_cost: +(wasted_kwh * COST_PER_KWH).toFixed(2),
      wasted_co2: +(wasted_kwh * CO2_KG_PER_KWH).toFixed(2),
    };
  });
  const total_wasted_kwh = +kwh(result.total_wasted_minutes).toFixed(2);
  return {
    ...result,
    rooms,
    total_wasted_kwh,
    total_wasted_cost: +(total_wasted_kwh * COST_PER_KWH).toFixed(2),
    total_wasted_co2: +(total_wasted_kwh * CO2_KG_PER_KWH).toFixed(2),
  };
}

// Aggregates daily rollup rows into the same per-room shape as computeWastedByRoom.
function aggregateRollups(rollups) {
  const byRoom = new Map();
  for (const r of rollups) {
    if (!r.room) continue;
    const cur = byRoom.get(r.room.id) || { room_id: r.room.id, name: r.room.name, code: r.room.code, label: roomLabel(r.room), wasted_minutes: 0 };
    cur.wasted_minutes += r.wasted_minutes;
    byRoom.set(r.room.id, cur);
  }
  const rooms = [...byRoom.values()].sort((a, b) => b.wasted_minutes - a.wasted_minutes);
  return { rooms, total_wasted_minutes: rooms.reduce((s, r) => s + r.wasted_minutes, 0) };
}

// ── Public service entry point ───────────────────────────────────────────────

const DEFAULT_WINDOW_DAYS = 7;

function resolveWindow({ from, to }) {
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - DEFAULT_WINDOW_DAYS * 86400000);
  if (isNaN(fromDate) || isNaN(toDate)) throw Object.assign(new Error('invalid from/to'), { status: 400 });
  if (fromDate >= toDate) throw Object.assign(new Error('from must be before to'), { status: 400 });
  return { from: fromDate, to: toDate };
}

// Wasted-lighting per room over a window. Reads pre-computed rollups by default
// (fast); pass raw=true to force computation from raw events. Falls back to raw
// automatically when no rollups exist yet.
async function wastedLighting({ from, to, raw }) {
  const window = resolveWindow({ from, to });

  if (!raw && (await analyticsRepo.rollupCount()) > 0) {
    const rollups = await analyticsRepo.fetchRollups(window);
    return { window, source: 'rollup', ...applyCost(aggregateRollups(rollups)) };
  }

  const data = await analyticsRepo.fetchWindow(window);
  return { window, source: 'raw', ...applyCost(computeWastedByRoom({ ...data, ...window })) };
}

// ── Occupancy / utilization (operating-hours based) ──────────────────────────

const dayFloorMs = (date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

// Minutes within [from,to) that fall in operating hours on operating days (denominator).
function operatingMinutes(from, to) {
  let ms = 0;
  for (let day = dayFloorMs(from); day < to.getTime(); day += DAY_MS) {
    if (!OPERATING_DAYS.has(new Date(day).getUTCDay())) continue;
    const s = Math.max(day + OPERATING_START_HOUR * 3600000, from.getTime());
    const e = Math.min(day + OPERATING_END_HOUR * 3600000, to.getTime());
    if (e > s) ms += e - s;
  }
  return ms / 60000;
}

// Occupied (motion 'on') minutes clipped to operating hours (numerator).
function occupiedOperatingMinutes(events, carry, from, to) {
  let mins = 0;
  for (let day = dayFloorMs(from); day < to.getTime(); day += DAY_MS) {
    if (!OPERATING_DAYS.has(new Date(day).getUTCDay())) continue;
    const s = new Date(Math.max(day + OPERATING_START_HOUR * 3600000, from.getTime()));
    const e = new Date(Math.min(day + OPERATING_END_HOUR * 3600000, to.getTime()));
    if (e <= s) continue;
    mins += onMinutes({ events, carry, from: s, to: e });
  }
  return mins;
}

// Campus-wide hour×weekday occupancy intensity (0..1), averaged across rooms.
// grid[hour][weekday], weekday 0=Sun..6=Sat.
function occupancyHeatmap(motionData, from, to, roomCount) {
  const occ = Array.from({ length: 24 }, () => new Array(7).fill(0));
  const avail = Array.from({ length: 24 }, () => new Array(7).fill(0));

  for (let slot = dayFloorMs(from); slot < to.getTime(); slot += 3600000) {
    const s = Math.max(slot, from.getTime());
    const e = Math.min(slot + 3600000, to.getTime());
    const overlapMin = (e - s) / 60000;
    if (overlapMin <= 0) continue;
    const d = new Date(slot);
    const hr = d.getUTCHours();
    const wd = d.getUTCDay();
    avail[hr][wd] += overlapMin * roomCount;
    for (const m of motionData) {
      occ[hr][wd] += onMinutes({ events: m.window, carry: m.carry, from: new Date(s), to: new Date(e) });
    }
  }

  let max = 0;
  const grid = occ.map((row, hr) => row.map((v, wd) => {
    const pct = avail[hr][wd] > 0 ? v / avail[hr][wd] : 0;
    if (pct > max) max = pct;
    return +pct.toFixed(4);
  }));
  return { grid, max: +max.toFixed(4), hours: Array.from({ length: 24 }, (_, i) => i), weekdays: [0, 1, 2, 3, 4, 5, 6] };
}

// Per-room utilization (% of operating hours) + the campus heatmap.
function computeOccupancy({ sensors, windowEvents, carryIn, from, to }) {
  const bySensor = new Map();
  for (const s of sensors) bySensor.set(s.id, { window: [], carry: 'off' });
  for (const e of windowEvents) bySensor.get(e.sensor_id)?.window.push(e);
  for (const c of carryIn) { const en = bySensor.get(c.sensor_id); if (en) en.carry = normalizeState(c.value); }

  const rooms = new Map();
  for (const s of sensors) {
    if (s.kind !== 'MOTION' || !s.room) continue;
    rooms.set(s.room.id, { room: s.room, motion: s });
  }

  const opMin = operatingMinutes(from, to);
  const windowDays = Math.max(1, (to.getTime() - from.getTime()) / DAY_MS);

  const motionData = [];
  const result = [];
  let utilSum = 0;
  for (const { room, motion } of rooms.values()) {
    const m = bySensor.get(motion.id);
    motionData.push(m);
    const occMin = Math.round(onMinutes({ events: m.window, carry: m.carry, from, to }));
    const util = opMin > 0 ? (occupiedOperatingMinutes(m.window, m.carry, from, to) / opMin) * 100 : 0;
    utilSum += util;
    result.push({
      room_id: room.id, name: room.name, code: room.code, label: roomLabel(room),
      occupied_minutes: occMin,
      occupied_hours_per_day: +(occMin / 60 / windowDays).toFixed(2),
      utilization_pct: +util.toFixed(1),
    });
  }
  result.sort((a, b) => b.utilization_pct - a.utilization_pct);

  const heatmap = occupancyHeatmap(motionData, from, to, motionData.length || 1);
  let peak = { weekday: null, hour: null, intensity: 0 };
  heatmap.grid.forEach((row, hr) => row.forEach((v, wd) => { if (v > peak.intensity) peak = { weekday: wd, hour: hr, intensity: v }; }));

  return {
    rooms: result,
    avg_utilization_pct: result.length ? +(utilSum / result.length).toFixed(1) : 0,
    heatmap,
    peak,
  };
}

// Occupancy/utilization over a window (computed from raw events).
async function occupancy({ from, to }) {
  const window = resolveWindow({ from, to });
  const data = await analyticsRepo.fetchWindow(window);
  return {
    window,
    operating: { start: OPERATING_START_HOUR, end: OPERATING_END_HOUR, days: 'Mon–Fri' },
    ...computeOccupancy({ ...data, ...window }),
  };
}

module.exports = {
  wastedLighting,
  occupancy,
  resolveWindow,
  // exported for reuse by the rollup rebuild script / tests:
  normalizeState,
  stateAt,
  wastedMinutes,
  onMinutes,
  computeWastedByRoom,
  applyCost,
  operatingMinutes,
  occupiedOperatingMinutes,
  computeOccupancy,
};
