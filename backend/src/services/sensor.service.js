const sensorRepo = require('../repositories/sensor.repository');
const areaRepo = require('../repositories/area.repository');

async function listSensors() {
  return sensorRepo.findAll();
}

async function getSensor(id) {
  const sensor = await sensorRepo.findById(id);
  if (!sensor) throw Object.assign(new Error('Sensor not found'), { status: 404 });
  return sensor;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

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

async function setActive(id, is_active) {
  await getSensor(id);
  return sensorRepo.update(id, { is_active });
}

async function deleteSensor(id) {
  await getSensor(id);
  return sensorRepo.remove(id);
}

module.exports = { listSensors, getSensor, createSensor, updateSensor, setActive, deleteSensor };
