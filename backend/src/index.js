const express = require('express');
const morgan = require('morgan');
const config = require('./config');
const authRoutes = require('./routes/auth.routes');
const areaRoutes = require('./routes/area.routes');

const app = express();

app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/areas', areaRoutes);

//start server
app.listen(config.port, () => {
  console.log(`Backend running on port ${config.port}`);
});
