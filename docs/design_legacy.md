# ARDS — Legacy Design Notes

This file contains documentation for components that have been replaced. Kept for historical reference.

---

## In-Memory State Store (replaced by Redis)

The original ingestion pipeline used a Node.js `Map` as the source of truth for current sensor state. It was fast (O(1) in-process lookups) but volatile — all state was lost on server restart.

### Store module (`backend/src/store/state.store.js`)

```js
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
```

- Schema: `Map<sensor_key, { sensor_id, state, ts }>`
- All operations were synchronous
- Wiped on every process restart

---

## EventEmitter Singleton (replaced by Redis Pub/Sub)

An internal Node.js `EventEmitter` was used to decouple ingestion from async consumers (DB writes).

### Emitter module (`backend/src/events/emitter.js`)

```js
const { EventEmitter } = require('events');
const emitter = new EventEmitter();
module.exports = emitter;
```

### Usage in ingestion service

```js
emitter.emit('state_changed', {
  sensor_key,
  sensor_id: sensor.id,
  old_state: old?.state ?? null,
  new_state: state,
  ts: timestamp,
});
```

### Listeners (in `app.js`)

Two listeners were attached to the `state_changed` event:

1. **upsertState** — upserted the `SensorState` DB table (current reading)
2. **appendEvent** — appended to the `SensorEvent` table (history log)

Both ran async and did not block the HTTP response.

### Limitations

- Process-local — could not broadcast across multiple server instances
- No persistence — if a listener failed, the event was lost
- Could not be consumed by external services (e.g. a separate WebSocket server)

---

## Original Ingestion Pipeline

```
Sensor (curl / script)
        │
        ▼
POST /api/states/:sensor_key
        │
        ▼
  Validate payload
  Resolve sensor_key → Sensor record
        │
        ▼
  In-memory store  ◄── source of truth for dashboard reads
  Map<sensor_key, { sensor_id, state, ts }>
        │
        ▼
  Emit: state_changed({ sensor_key, sensor_id, old_state, new_state, ts })
        │
       / \
      /   \
     ▼     ▼
Upsert   Append
Sensor   Sensor
State    Event
(DB)     (DB)
current  history
```

### Key decisions (at the time)

- **In-memory first** — the HTTP response returned immediately after updating the store. DB writes were async and did not block ingestion.
- **Two DB tables** — `SensorState` (one row per sensor, mutable upsert = current status) and `SensorEvent` (append-only log = full history).
- **Event emitter** — decoupled ingestion from consumers. Adding a new consumer meant adding one listener.
- **No auth on push endpoint** — sensors push without user tokens.

---

## Frontend Polling (replaced by WebSocket)

Before WebSocket was implemented, the frontend polled `GET /api/states` every 5 seconds to get current sensor state.

```js
// DashboardPage.jsx / SensorsPage.jsx
useEffect(() => {
  let active = true;
  const poll = () => api.get('/api/states')
    .then(data => { if (active) setSensorStates(data); })
    .catch(() => {});
  poll();
  const id = setInterval(poll, 5000);
  return () => { active = false; clearInterval(id); };
}, []);
```

### Limitations

- 5-second delay between state changes and UI update
- Unnecessary network traffic when no state changes occur
- Each page polled independently (duplicate requests if both open)
