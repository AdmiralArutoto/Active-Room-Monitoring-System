const { EventEmitter } = require('events');

// Singleton emitter for internal state_changed events.
// Payload: { sensor_key, sensor_id, old_state, new_state, ts }
const emitter = new EventEmitter();

module.exports = emitter;
