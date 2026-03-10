const { WebSocketServer } = require('ws');
const url = require('url');
const authService = require('../services/auth.service');
const stateStore = require('../store/state.store');
const { subscriber } = require('../store/redis.client');

function setupWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  // Authenticate on HTTP upgrade — reject before WS handshake completes
  httpServer.on('upgrade', (req, socket, head) => {
    const { query } = url.parse(req.url, true);
    const token = query.token;

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      req.user = authService.verifyToken(token);
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  // On new connection, send full state snapshot
  wss.on('connection', async (ws) => {
    try {
      const states = await stateStore.getAllStates();
      ws.send(JSON.stringify({ type: 'snapshot', states }));
    } catch (err) {
      console.error('WS snapshot failed:', err.message);
    }
  });

  // Subscribe to Redis and broadcast state changes to all connected clients
  subscriber.subscribe('state_changed');

  subscriber.on('message', (_channel, message) => {
    const data = JSON.parse(message);
    const payload = JSON.stringify({
      type: 'state_changed',
      sensor_key: data.sensor_key,
      sensor_id: data.sensor_id,
      state: data.new_state,
      ts: data.ts,
    });

    for (const client of wss.clients) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(payload);
      }
    }
  });

  return wss;
}

module.exports = { setupWebSocket };
