# Ideas & Design Notes

## Sensor Ingestion

### Concept
Treat every sensor update as a small state change pushed to the backend. The backend immediately updates the current state in memory and publishes a state-changed event. Everything else (UI updates, history logging) reacts to that event.

### Pipeline

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

### Key decisions
- **In-memory first** — the HTTP response returns immediately after updating the store. DB writes are async and do not block ingestion.
- **Two DB tables** — `SensorState` (one row per sensor, mutable upsert = current status) and `SensorEvent` (append-only log = full history).
- **Event emitter** — decouples ingestion from consumers. Adding a new consumer (e.g. WebSocket broadcast) means adding one listener, touching no ingestion code.
- **No auth on push endpoint** — sensors push without user tokens. Auth is only required for reading state snapshots.

### Sensor key format
Keys are system-generated from the area hierarchy:
```
{building_code}.{floor_code}.{room_code}.{sensor_name_slug}
e.g. B01.F01.R101.motion_sensor_1
```
Generated at sensor registration time by traversing the area tree. Stable for the lifetime of the sensor.
