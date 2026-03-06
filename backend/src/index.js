const express = require('express');
const config = require('./config');
const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);

//start server
app.listen(config.port, () => {
  console.log(`Backend running on port ${config.port}`);
});
