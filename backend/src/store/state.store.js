// In-memory current state per sensor_key.
// Schema: Map<sensor_key, { sensor_id, state, ts }>
const store = new Map();

function setState(sensor_key, sensor_id, state, ts) {
  store.set(sensor_key, { sensor_id, state, ts });
}

function getState(sensor_key) {
  return store.get(sensor_key) ?? null;
}

function getAllStates() {
  return Object.fromEntries(store);
}

module.exports = { setState, getState, getAllStates };
