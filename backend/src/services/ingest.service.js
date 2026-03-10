const sensorRepo = require('../repositories/sensor.repository');
const stateStore = require('../store/state.store');
const { publisher } = require('../store/redis.client');

const CHANNEL = 'state_changed';

// Processes an incoming sensor reading: looks up the sensor, updates Redis state store,
// and publishes a state_changed event (which triggers async DB writes in app.js).
// Throws 404 if the sensor_key is unknown, 403 if the sensor is inactive.
async function ingest(sensor_key, state, ts) {
  const sensor = await sensorRepo.findBySensorKey(sensor_key);
  if (!sensor) throw Object.assign(new Error(`Unknown sensor_key: ${sensor_key}`), { status: 404 });
  if (!sensor.is_active) throw Object.assign(new Error('Sensor is inactive'), { status: 403 });

  const timestamp = ts ? new Date(ts * 1000) : new Date();
  const old = await stateStore.getState(sensor_key);

  await stateStore.setState(sensor_key, sensor.id, state, timestamp);

  await publisher.publish(CHANNEL, JSON.stringify({
    sensor_key,
    sensor_id: sensor.id,
    old_state: old?.state ?? null,
    new_state: state,
    ts: timestamp,
  }));

  return { sensor_key, state, ts: timestamp };
}

module.exports = { ingest };
