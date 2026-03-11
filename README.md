# Campus Active Sensor Monitoring System                                                                                     Github

Campus sensor monitoring platform. Sensor data is pushed over HTTP, stored in a PostgreSQL database, and visualised through a React dashboard organized around a building → floor → room hierarchy.

## Tech stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React 18 + Vite + React Router v6 |
| Backend  | Node.js + Express                 |
| ORM      | Prisma                            |
| Database | PostgreSQL 16                     |
| Auth     | JWT (HS256)                       |
| Runtime  | Docker Compose                    |

---

## Getting started

### Prerequisites
- Docker + Docker Compose

### 1. Clone and configure

```bash
git clone <repo>
cd ards-project
cp .env.example .env
# Edit .env — set a strong JWT_SECRET and POSTGRES_PASSWORD
```

### 2. Start all services

```bash
docker compose up --build
```

| Service  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:3000 |

### 3. Seed the first admin user

```bash
docker compose exec backend node src/scripts/seed.js
```

---

## Environment variables

| Variable            | Description                           | Default                  |
|---------------------|---------------------------------------|--------------------------|
| `POSTGRES_USER`     | Database user                         | `ards`                   |
| `POSTGRES_PASSWORD` | Database password                     | —                        |
| `POSTGRES_DB`       | Database name                         | `ards_db`                |
| `DATABASE_URL`      | Prisma connection string              | —                        |
| `JWT_SECRET`        | Secret used to sign JWTs              | —                        |
| `PORT`              | Backend listen port                   | `3000`                   |
| `VITE_API_URL`      | API base URL consumed by the frontend | `http://localhost:3000`  |

---

## Data model

### Area hierarchy

Areas form a strict three-level tree:

```
BUILDING
  └── FLOOR
        └── ROOM
```

Each area has an optional `code` (short identifier used in sensor keys) and `description`. Areas can be disabled (`is_active = false`) without deletion.

### Sensor

Sensors belong to a `ROOM` area. A stable dotted key is auto-generated on creation from the ancestor codes and sensor name:

```
{building_code}.{floor_code}.{room_code}.{sensor_name_slug}

# e.g.  B01.F02.R103.motion_1
```


### Sensor state & events

- **SensorState** — mutable upsert of the latest value per sensor (kept in-memory + persisted to DB)
- **SensorEvent** — append-only log of every state change

---

## API reference

All endpoints are prefixed `/api`. Most require `Authorization: Bearer <token>`.

### Auth

| Method | Path             | Auth | Description                |
|--------|------------------|------|----------------------------|
| POST   | `/auth/login`    | —    | Returns JWT on valid creds |
| POST   | `/auth/logout`   | —    | No-op (stateless)          |
| GET    | `/auth/me`       | ✓    | Current user info          |

### Areas

| Method | Path                   | Auth | Description                               |
|--------|------------------------|------|-------------------------------------------|
| GET    | `/areas`               | ✓    | List all areas (flat)                     |
| GET    | `/areas/:id`           | ✓    | Get a single area                         |
| GET    | `/areas/:id/children`  | ✓    | Direct children of an area                |
| GET    | `/areas/:id/tree`      | ✓    | Full subtree rooted at area               |
| POST   | `/areas`               | ✓    | Create area (`type` + `parent_id` required for FLOOR/ROOM) |
| PUT    | `/areas/:id`           | ✓    | Update name / code / description          |
| PATCH  | `/areas/:id/active`    | ✓    | Enable or disable                         |
| DELETE | `/areas/:id`           | ✓    | Delete (fails if children exist)          |

### Sensors

| Method | Path                  | Auth | Description                      |
|--------|-----------------------|------|----------------------------------|
| GET    | `/sensors`            | ✓    | List all sensors                 |
| GET    | `/sensors/:id`        | ✓    | Get a single sensor              |
| POST   | `/sensors`            | ✓    | Create sensor (auto-generates key) |
| PUT    | `/sensors/:id`        | ✓    | Update sensor fields             |
| PATCH  | `/sensors/:id/active` | ✓    | Enable or disable                |
| DELETE | `/sensors/:id`        | ✓    | Delete sensor and its history    |

### Ingest (state push)

| Method | Path                   | Auth | Description                           |
|--------|------------------------|------|---------------------------------------|
| POST   | `/states/:sensor_key`  | —    | Push a new state value for a sensor   |
| GET    | `/states`              | ✓    | Current state of all sensors          |
| GET    | `/states/:sensor_key`  | ✓    | Current state of one sensor           |

Push body:

```json
{ "state": "on", "ts": 1712345678 }
```

`ts` is optional (Unix seconds). Omitting it uses server time.

---

## Frontend pages

All authenticated pages share a persistent shell (`AppLayout`) with a collapsible left nav (200 px / 48 px icon-only), a top bar with breadcrumb, and a logout button.

| Route        | Page          | Description                                        |
|--------------|---------------|----------------------------------------------------|
| `/login`     | LoginPage     | Username + password login                          |
| `/home`      | HomePage      | Welcome screen with nav shortcuts                  |
| `/areas`     | AreasPage     | Area hierarchy CRUD (buildings → floors → rooms)   |
| `/sensors`   | SensorsPage   | Sensor registry CRUD                               |
| `/dashboard` | DashboardPage | Floor plan map viewer *(coming soon)*              |

---

## Roles

| Role     | Capabilities                         |
|----------|--------------------------------------|
| `ADMIN`  | Full read/write access to all APIs   |
| `VIEWER` | Read-only; cannot create/edit/delete |

---

## Project structure

```
ards-project/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── tests/
│   │   ├── helpers/
│   │   ├── integration/
│   │   └── unit/
│   └── src/
│       ├── config.js
│       ├── app.js
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── routes/
│       ├── middleware/
│       ├── store/          # in-memory sensor state store
│       └── events/         # EventEmitter for state_changed
├── frontend/
│   └── src/
│       ├── api/            # axios client wrapper
│       ├── components/     # AppLayout (shared shell)
│       ├── context/        # AuthContext / useAuth
│       ├── pages/
│       └── styles/         # shared style tokens (sh.*)
├── docs/
│   ├── runbooks/
│   └── tests/
└── docker-compose.yml
```
