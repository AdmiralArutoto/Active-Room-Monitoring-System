const { publisher } = require('./redis.client');

const HASH_KEY = 'sensor_states';

async function setState(sensor_key, sensor_id, state, ts) {
  const value = JSON.stringify({ sensor_id, state, ts });
  await publisher.hset(HASH_KEY, sensor_key, value);
}

async function getState(sensor_key) {
  const raw = await publisher.hget(HASH_KEY, sensor_key);
  return raw ? JSON.parse(raw) : null;
}

async function getAllStates() {
  const raw = await publisher.hgetall(HASH_KEY);
  const result = {};
  for (const [key, val] of Object.entries(raw)) {
    result[key] = JSON.parse(val);
  }
  return result;
}

module.exports = { setState, getState, getAllStates };
