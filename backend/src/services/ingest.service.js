const sensorRepo = require('../repositories/sensor.repository');
const stateStore = require('../store/state.store');
const emitter = require('../events/emitter');

async function ingest(sensor_key, state, ts) {
  const sensor = await sensorRepo.findBySensorKey(sensor_key);
  if (!sensor) throw Object.assign(new Error(`Unknown sensor_key: ${sensor_key}`), { status: 404 });
  if (!sensor.is_active) throw Object.assign(new Error('Sensor is inactive'), { status: 403 });

  const timestamp = ts ? new Date(ts * 1000) : new Date();
  const old = stateStore.getState(sensor_key);

  stateStore.setState(sensor_key, sensor.id, state, timestamp);

  emitter.emit('state_changed', {
    sensor_key,
    sensor_id: sensor.id,
    old_state: old?.state ?? null,
    new_state: state,
    ts: timestamp,
  });

  return { sensor_key, state, ts: timestamp };
}

module.exports = { ingest };
