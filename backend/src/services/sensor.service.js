const sensorRepo = require('../repositories/sensor.repository');
const areaRepo = require('../repositories/area.repository');

// Returns all registered sensors with their associated room area.
async function listSensors() {
  return sensorRepo.findAll();
}

// Fetches a single sensor by ID. Throws 404 if not found.
async function getSensor(id) {
  const sensor = await sensorRepo.findById(id);
  if (!sensor) throw Object.assign(new Error('Sensor not found'), { status: 404 });
  return sensor;
}

// Converts a string to lowercase with non-alphanumeric runs replaced by underscores, suitable for use in a sensor key.
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// Constructs a dotted sensor key from the area hierarchy codes and the sensor name (e.g. B02.F01.R103.motion_1).
// Appends a numeric suffix (_2, _3, ...) if the base key is already taken.
// Throws if any ancestor area is missing its code.
async function buildSensorKey(room_area_id, name) {
  const ancestors = await areaRepo.findWithAncestors(room_area_id);
  if (!ancestors) throw Object.assign(new Error('Room area not found'), { status: 404 });

  const { building, floor, room } = ancestors;
  if (!building?.code) throw Object.assign(new Error('Building is missing a code — set it before registering sensors'), { status: 400 });
  if (!floor?.code)    throw Object.assign(new Error('Floor is missing a code — set it before registering sensors'), { status: 400 });
  if (!room?.code)     throw Object.assign(new Error('Room is missing a code — set it before registering sensors'), { status: 400 });

  const base = `${building.code}.${floor.code}.${room.code}.${slugify(name)}`;

  // Ensure uniqueness — append _2, _3 etc if needed
  let key = base;
  let suffix = 2;
  while (await sensorRepo.findBySensorKey(key)) {
    key = `${base}_${suffix++}`;
  }
  return key;
}

// Validates that room_area_id points to a ROOM, generates a unique sensor_key, then persists the sensor.
async function createSensor({ name, kind, room_area_id, metadata }) {
  if (!room_area_id) throw Object.assign(new Error('room_area_id is required'), { status: 400 });

  const room = await areaRepo.findById(room_area_id);
  if (!room) throw Object.assign(new Error('Room area not found'), { status: 404 });
  if (room.type !== 'ROOM') throw Object.assign(new Error('Sensor must be linked to a ROOM area'), { status: 400 });

  const sensor_key = await buildSensorKey(room_area_id, name);

  return sensorRepo.create({
    sensor_key,
    name,
    kind: kind ?? 'OTHER',
    room_area_id,
    metadata: metadata ?? undefined,
  });
}

// Updates sensor fields. If room_area_id is provided, validates it still points to a ROOM. Throws 404 if sensor not found.
async function updateSensor(id, { name, kind, room_area_id, metadata }) {
  await getSensor(id);

  if (room_area_id) {
    const room = await areaRepo.findById(room_area_id);
    if (!room) throw Object.assign(new Error('Room area not found'), { status: 404 });
    if (room.type !== 'ROOM') throw Object.assign(new Error('Sensor must be linked to a ROOM area'), { status: 400 });
  }

  return sensorRepo.update(id, {
    ...(name !== undefined && { name }),
    ...(kind !== undefined && { kind }),
    ...(room_area_id !== undefined && { room_area_id }),
    ...(metadata !== undefined && { metadata }),
  });
}

// Enables or disables a sensor without deleting it. Throws 404 if not found.
async function setActive(id, is_active) {
  await getSensor(id);
  return sensorRepo.update(id, { is_active });
}

// Deletes a sensor and its associated state/event records. Throws 404 if not found.
async function deleteSensor(id) {
  await getSensor(id);
  return sensorRepo.remove(id);
}

module.exports = { listSensors, getSensor, createSensor, updateSensor, setActive, deleteSensor };
