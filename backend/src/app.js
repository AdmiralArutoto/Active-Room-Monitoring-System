const express = require('express');
const morgan = require('morgan');
const authRoutes = require('./routes/auth.routes');
const areaRoutes = require('./routes/area.routes');
const sensorRoutes = require('./routes/sensor.routes');
const ingestRoutes = require('./routes/ingest.routes');
const eventRoutes = require('./routes/event.routes');
const { subscriber } = require('./store/redis.client');
const sensorRepo = require('./repositories/sensor.repository');

const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use('/uploads', express.static('/app/uploads'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/areas', areaRoutes);
app.use('/sensors', sensorRoutes);
app.use('/api/states', ingestRoutes);
app.use('/events', eventRoutes);

// Redis Pub/Sub listener — async fan-out on state_changed
subscriber.subscribe('state_changed');

subscriber.on('message', async (_channel, message) => {
  const { sensor_id, new_state, ts } = JSON.parse(message);

  try {
    await sensorRepo.appendEvent(sensor_id, new_state, new Date(ts), null);
  } catch (err) {
    console.error('state_changed: appendEvent failed', err.message);
  }
});

module.exports = app;
