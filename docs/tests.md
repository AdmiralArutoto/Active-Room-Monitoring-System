# Testing Guide

## Overview

Tests live under `backend/tests/` and are run with Jest + Supertest against a dedicated test database (`ards_test`). The production database is never touched. Redis is mocked for all integration tests using a shared in-memory mock.

```
backend/tests/
├── helpers/
│   ├── env.js          # sets DATABASE_URL = TEST_DATABASE_URL and UPLOAD_DIR = tmpdir() before any module loads
│   ├── setup.js        # globalSetup: loads .env and runs prisma migrate deploy on the test DB once
│   ├── db.js           # test Prisma client + resetDb() helper
│   └── redis-mock.js   # shared Redis mock (in-memory Map) injected via jest.mock()
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

The `db_test` container must be running and reachable on `localhost:5434` before tests execute. Tests run on the **host machine** directly (not inside Docker).

```bash
# Start only the test DB
docker compose up -d db_test

# Verify it's reachable
psql -h localhost -p 5434 -U ards -d ards_test -c "SELECT 1"
```

---

## Running Tests

```bash
cd backend

# Run the full suite
npm test

# Run a single test file
npx jest tests/integration/auth.test.js

# Run only unit tests
npx jest tests/unit/

# Run only integration tests
npx jest tests/integration/
```

---

## How It Works

### Test DB isolation

`jest.config.js` wires two hooks before any test code runs:

1. **`globalSetup`** (`tests/helpers/setup.js`) — runs once per `npm test`. Loads `.env`, then calls `prisma migrate deploy` pointed at `TEST_DATABASE_URL` so the test schema is always up to date.

2. **`setupFiles`** (`tests/helpers/env.js`) — runs in every Jest worker before any `require()`. Sets `DATABASE_URL = TEST_DATABASE_URL` and `UPLOAD_DIR = os.tmpdir()`. This ensures every `new PrismaClient()` hits `ards_test`, not `ards_db`, and multer doesn't try to create `/app/uploads` on the host.

### Redis mocking

All integration tests mock `../../src/store/redis.client` with the shared helper:

```js
jest.mock('../../src/store/redis.client', () => require('../helpers/redis-mock'));
```

The mock provides in-memory implementations of `HSET`, `HGET`, `HGETALL`, and `PUBLISH` backed by a `Map`. The subscriber is a no-op. `ingest.test.js` calls `require('../helpers/redis-mock').__store.clear()` in `beforeEach` to prevent state leaking between tests.

### DB reset between tests

Each integration test file calls `resetDb()` in `beforeAll` or `beforeEach`. It deletes rows in dependency order:

```
SensorEvent → Sensor → Area → User
```

### App extraction

`backend/src/app.js` exports the Express app without calling `listen()`. Supertest creates its own ephemeral HTTP server, so no port conflicts occur. `backend/src/index.js` creates an `http.Server` from the app and calls `server.listen()` — also required to attach the WebSocket server on the same port.

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

Area creation requires a SITE parent for BUILDINGs. The `createBuilding()` helper automatically creates a SITE first.

| Test | What it checks |
|------|----------------|
| `POST /areas` — BUILDING | Creates area under SITE, returns `201` with `code` |
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

Area hierarchy is seeded directly via Prisma in `beforeAll` (bypasses service hierarchy checks). Sensor keys are **lowercase**.

| Test | What it checks |
|------|----------------|
| `POST /sensors` — valid | Returns `201`, `sensor_key` auto-generated as `b01.f01.r101.motion_sensor_1` |
| `POST /sensors` — missing `room_area_id` | Returns `400` |
| `POST /sensors` — room with no code | Returns `400` |
| `POST /sensors` — duplicate name across rooms | Second sensor gets `_2` suffix on key |
| `PATCH /sensors/:id/active` | Toggles `is_active` |
| `DELETE /sensors/:id` | Returns `204` |

### `ingest.test.js`

State is stored in the Redis mock. `beforeEach` clears the mock store so each test starts with no state.

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

All dependencies (`sensorRepo`, `stateStore`, Redis `publisher`) are mocked with `jest.mock()`. `stateStore` functions are mocked as `async` to match the real Redis-backed implementation.

| Test | What it checks |
|------|----------------|
| Return value | Contains `sensor_key`, `state`, `Date` timestamp |
| State store update | `stateStore.setState` called with correct args |
| Redis publish | `publisher.publish('state_changed', ...)` called with correct JSON payload including old/new state and sensor_id |
| Unix timestamp | Converts `ts` (seconds) to `Date` correctly |
| Default timestamp | Uses `Date.now()` when `ts` is `null` |
| Unknown `sensor_key` | Throws error with `status: 404` |
| Inactive sensor | Throws error with `status: 403` |

---

## Adding New Tests

1. Integration tests go in `tests/integration/<feature>.test.js`.
2. Unit tests go in `tests/unit/<module>.test.js`.
3. All integration test files **must** mock Redis at the top before importing `app`:
   ```js
   jest.mock('../../src/store/redis.client', () => require('../helpers/redis-mock'));
   ```
4. Start each integration test file with a `beforeAll`/`beforeEach` that calls `resetDb()` and seeds the minimum data needed.
5. For unit tests, mock all external dependencies at the top with `jest.mock()`. Mock async store functions with `mockResolvedValue`, not `mockReturnValue`.
