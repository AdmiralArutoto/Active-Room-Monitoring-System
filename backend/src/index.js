const http = require('http');
const app = require('./app');
const config = require('./config');
const { setupWebSocket } = require('./ws/server');

const server = http.createServer(app);

setupWebSocket(server);

server.listen(config.port, () => {
  console.log(`Backend running on port ${config.port}`);
});
