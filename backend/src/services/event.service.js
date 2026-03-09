const sensorRepo = require('../repositories/sensor.repository');

async function listEvents({ sensor_id, from, to, limit, offset }) {
  const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const safeOffset = Math.max(parseInt(offset) || 0, 0);
  return sensorRepo.findEvents({ sensor_id, from, to, limit: safeLimit, offset: safeOffset });
}

module.exports = { listEvents };
