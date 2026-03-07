const express = require('express');
const morgan = require('morgan');
const authRoutes = require('./routes/auth.routes');
const areaRoutes = require('./routes/area.routes');
const sensorRoutes = require('./routes/sensor.routes');
const ingestRoutes = require('./routes/ingest.routes');
const emitter = require('./events/emitter');
const sensorRepo = require('./repositories/sensor.repository');

const app = express();

app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/areas', areaRoutes);
app.use('/sensors', sensorRoutes);
app.use('/api/states', ingestRoutes);

// Event listeners — async fan-out on state_changed
emitter.on('state_changed', async ({ sensor_id, new_state, ts }) => {
  try {
    await sensorRepo.upsertState(sensor_id, new_state, ts);
  } catch (err) {
    console.error('state_changed: upsertState failed', err.message);
  }
});

emitter.on('state_changed', async ({ sensor_id, new_state, ts }) => {
  try {
    await sensorRepo.appendEvent(sensor_id, new_state, ts, null);
  } catch (err) {
    console.error('state_changed: appendEvent failed', err.message);
  }
});

module.exports = app;
