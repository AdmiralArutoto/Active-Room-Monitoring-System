// Shared occupancy/lighting realism model — used by BOTH the historical generator
// (prisma/seed.js) and the live ticker (scripts/live-ticker.js) so live and historical
// data come from one source of truth. Pure & dependency-free; randomized helpers take a
// `rand` fn (seed passes its deterministic mulberry32; the ticker passes Math.random).

const OPENING_HOUR = 8;
const CLOSING_HOUR = 18;

const randInt = (rand, min, max) => Math.floor(rand() * (max - min + 1)) + min;

function isWeekend(date) {
  const d = date.getUTCDay();
  return d === 0 || d === 6;
}

// How many occupancy sessions a room sees in a day.
const weekdaySessionCount = (rand) => randInt(rand, 2, 5);
const weekendSessionCount = (rand) => randInt(rand, 0, 1);

// A single visit's length, in minutes.
const sampleSessionMinutes = (rand) => randInt(rand, 20, 120);

// Light turns on slightly before the first occupant arrives.
const lightOnLeadMin = (rand) => randInt(rand, 0, 10);

// Good rooms switch the light off shortly after the room empties.
const goodRoomLightOffDelayMin = (rand) => randInt(rand, 2, 15);

// Wasteful rooms leave the light on until late evening (minute-of-day, 21:00–23:00).
const wastefulLightOffMinute = (rand) => randInt(rand, 21 * 60, 23 * 60);

// Deterministic ~1/3 of rooms are "wasteful", keyed by a stable room key
// (e.g. "<buildingCode>.<roomCode>") so the generator and ticker always agree
// without sharing any ordering/index.
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const isWastefulRoom = (key) => hashStr(key) % 3 === 0;

// Activity weight 0..1 at a given instant (drives the live ticker's per-tick chance
// that a vacant room receives a new visit). Weekday bell curve peaking ~13:00 inside
// opening hours; ~0 after-hours; weekends heavily damped.
function intensity(date) {
  const h = date.getUTCHours() + date.getUTCMinutes() / 60;
  const weekend = isWeekend(date);
  if (h < OPENING_HOUR || h >= CLOSING_HOUR) return weekend ? 0 : 0.03;
  const peak = 13;
  const spread = 3.5;
  const bell = Math.exp(-((h - peak) ** 2) / (2 * spread * spread));
  return weekend ? bell * 0.15 : bell;
}

module.exports = {
  OPENING_HOUR,
  CLOSING_HOUR,
  isWeekend,
  weekdaySessionCount,
  weekendSessionCount,
  sampleSessionMinutes,
  lightOnLeadMin,
  goodRoomLightOffDelayMin,
  wastefulLightOffMinute,
  isWastefulRoom,
  intensity,
};
