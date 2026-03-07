# Testing Guide

## Overview

Tests live under `backend/tests/` and are run with Jest + Supertest against a dedicated test database (`ards_test`). The production database is never touched.

```
backend/tests/
├── helpers/
│   ├── env.js        # sets DATABASE_URL = TEST_DATABASE_URL before any module is loaded
│   ├── setup.js      # globalSetup: runs prisma migrate deploy on the test DB once
│   └── db.js         # test Prisma client + resetDb() helper
├── integration/
│   ├── auth.test.js
│   ├── areas.test.js
│   ├── sensors.test.js
│   └── ingest.test.js
└── unit/
    └── ingest.service.test.js
```

---

## Prerequisites

The `db_test` container must be running before any tests execute. The backend container is where tests run.

```bash
# Start only the test DB (if not already up)
docker compose up -d db_test

# Or start everything
docker compose up -d
```

---

## After Changing Test Files

Test files (`tests/`) and `jest.config.js` are baked into the Docker image at build time. After editing any of them on the host, rebuild before running:

```bash
docker compose build backend && docker compose up -d backend
```

---

## Running Tests

```bash
# Run the full suite once
docker compose exec backend npm test

# Run in watch mode (re-runs on file change)
docker compose exec backend npm run test:watch

# Run a single test file
docker compose exec backend npx jest tests/integration/auth.test.js

# Run only unit tests
docker compose exec backend npx jest tests/unit/

# Run only integration tests
docker compose exec backend npx jest tests/integration/
```

---

## How It Works

### Test DB isolation

`jest.config.js` wires two hooks before any test code runs:

1. **`globalSetup`** (`tests/helpers/setup.js`) — runs once per `npm test` invocation. Calls `prisma migrate deploy` with `DATABASE_URL` pointed at `TEST_DATABASE_URL` so the test schema is always up to date.

2. **`setupFiles`** (`tests/helpers/env.js`) — runs in every Jest worker before any `require()`. Overwrites `process.env.DATABASE_URL` with `TEST_DATABASE_URL`. This ensures every `new PrismaClient()` — including those inside the app modules — hits `ards_test`, not `ards_db`.

### DB reset between tests

Each integration test file calls `resetDb()` in `beforeAll` or `beforeEach`. It deletes rows in dependency order:

```
SensorEvent → SensorState → Sensor → Area → User
```

This keeps tests fully independent without dropping and recreating the schema.

### App extraction

`backend/src/app.js` exports the Express app without calling `app.listen()`. Supertest creates its own ephemeral HTTP server from the exported app, so no port conflicts occur. `backend/src/index.js` imports `app.js` and calls `listen()` only for the real server.

---

## Test Coverage

### `auth.test.js`

| Test | What it checks |
|------|----------------|
| `POST /auth/login` — valid credentials | Returns `200` with token |
| `POST /auth/login` — wrong password | Returns `401` |
| `POST /auth/login` — missing fields | Returns `400` |
| `GET /auth/me` — valid token | Returns `200` with user |
| `GET /auth/me` — no token | Returns `401` |
| `GET /auth/me` — invalid token | Returns `401` |

### `areas.test.js`

| Test | What it checks |
|------|----------------|
| `POST /areas` — BUILDING | Creates area, returns `201` with `code` |
| `POST /areas` — FLOOR under BUILDING | Accepted, `parent_id` set correctly |
| `POST /areas` — FLOOR without parent | Returns `400` |
| `POST /areas` — FLOOR under FLOOR | Returns `400` (type hierarchy violation) |
| `GET /areas` — authenticated | Returns array of areas |
| `GET /areas` — no token | Returns `401` |
| `PUT /areas/:id` | Updates name and code |
| `DELETE /areas/:id` — no children | Returns `204` |
| `DELETE /areas/:id` — has children | Returns `409` |
| `PATCH /areas/:id/active` | Toggles `is_active` |

### `sensors.test.js`

| Test | What it checks |
|------|----------------|
| `POST /sensors` — valid | Returns `201`, `sensor_key` auto-generated as `B01.F01.R101.motion_sensor_1` |
| `POST /sensors` — missing `room_area_id` | Returns `400` |
| `POST /sensors` — room with no code | Returns `400` |
| `POST /sensors` — duplicate name | Second sensor gets `_2` suffix on key |
| `PATCH /sensors/:id/active` | Toggles `is_active` |
| `DELETE /sensors/:id` | Returns `204` |

### `ingest.test.js`

| Test | What it checks |
|------|----------------|
| `POST /api/states/:key` — valid | Returns `200` with `sensor_key` and `state` |
| `POST /api/states/:key` — missing `state` | Returns `400` |
| `POST /api/states/:key` — unknown key | Returns `404` |
| `POST /api/states/:key` — inactive sensor | Returns `403` |
| `POST /api/states/:key` — no auth required | Returns `200` (push endpoint is open) |
| `GET /api/states` — after push | Snapshot contains the pushed state |
| `GET /api/states` — no token | Returns `401` |
| `GET /api/states/:key` — after push | Returns state for that key |
| `GET /api/states/:key` — no state yet | Returns `404` |

### `ingest.service.test.js` (unit)

All dependencies (`sensorRepo`, `stateStore`, `emitter`) are mocked with `jest.mock()`.

| Test | What it checks |
|------|----------------|
| Return value | Contains `sensor_key`, `state`, `Date` timestamp |
| State store update | `stateStore.setState` called with correct args |
| Event emission | `emitter.emit('state_changed', ...)` with old/new state and sensor_id |
| Unix timestamp | Converts `ts` (seconds) to `Date` correctly |
| Default timestamp | Uses `Date.now()` when `ts` is `null` |
| Unknown `sensor_key` | Throws error with `status: 404` |
| Inactive sensor | Throws error with `status: 403` |

---

## Adding New Tests

1. Integration tests go in `tests/integration/<feature>.test.js`.
2. Unit tests go in `tests/unit/<module>.test.js`.
3. Start each integration test file with a `beforeAll`/`beforeEach` that calls `resetDb()` and seeds the minimum data needed.
4. For unit tests, mock all external dependencies at the top of the file with `jest.mock('../../src/...')`.
