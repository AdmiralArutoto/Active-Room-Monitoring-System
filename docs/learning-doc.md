# HallSense — Project Learning Doc

> Campus Active Room/Door Sensor monitoring system (ARDS). Sensors push readings over
> HTTP → backend updates an in-memory (Redis) state store → state changes fan out to a
> live React dashboard over WebSockets, and are persisted to PostgreSQL as an append-only
> event log.

This document is the single reference for understanding the system: the runtime topology,
every API endpoint, the database schema and relationships, the code structure, and the
key sequence/workflow diagrams. Diagrams are written in [Mermaid](https://mermaid.js.org/)
and render natively on GitHub and most Markdown viewers.

> **Note on accuracy:** this doc was reverse-engineered from the source (not the README,
> which is partially stale — e.g. it still mentions HTTP polling and a `HomePage`/`AreasPage`
> that no longer exist). Where the code and README disagree, the code wins here.

---

## 1. Tech stack & runtime

| Layer       | Technology                                            |
|-------------|-------------------------------------------------------|
| Frontend    | React 18 + Vite + React Router v6 + react-konva (canvas map) |
| Backend     | Node.js + Express                                     |
| Realtime    | WebSocket (`ws`) + Redis Pub/Sub                      |
| State store | Redis hash (`sensor_states`)                          |
| ORM         | Prisma                                                |
| Database    | PostgreSQL 16                                         |
| Auth        | JWT (HS256), bcrypt password hashing                  |
| Runtime     | Docker Compose (not run on host)                      |

### Docker Compose services

| Service    | Image / build         | Purpose                                   | Port  |
|------------|-----------------------|-------------------------------------------|-------|
| `db`       | postgres:16-alpine    | Primary database                          | —     |
| `db_test`  | postgres:16-alpine    | Isolated test database (`ards_test`)      | 5434  |
| `redis`    | redis:7-alpine (AOF)  | State store + Pub/Sub bus                 | —     |
| `backend`  | `./backend`           | Express API + WebSocket server            | 3000  |
| `frontend` | `./frontend`          | Vite dev server / React SPA               | 5173  |

```mermaid
graph TB
    subgraph Browser
        FE[React SPA<br/>:5173]
    end
    subgraph Docker Compose
        BE[Backend<br/>Express + ws<br/>:3000]
        RD[(Redis<br/>state + pub/sub)]
        PG[(PostgreSQL<br/>:5432)]
    end
    SENSORS[Physical / simulated sensors]

    FE -- "REST (JWT)" --> BE
    FE -- "WebSocket (JWT in query)" --> BE
    SENSORS -- "POST /api/states/:key (no auth)" --> BE
    BE -- "HSET / HGET / PUBLISH / SUBSCRIBE" --> RD
    BE -- "Prisma queries + event writes" --> PG
```

---

## 2. System architecture (backend layers)

The backend is a **layered functional architecture** (not class-based OOP — see §6). Each
HTTP request flows through the same pipeline:

```
Route → Middleware (auth/role) → Controller → Service → Repository → Prisma → PostgreSQL
                                                  │
                                                  └→ Redis (state store + pub/sub)
```

| Layer          | Responsibility                                              | Example file |
|----------------|------------------------------------------------------------|--------------|
| **Routes**     | URL → handler mapping, attach middleware                   | `routes/area.routes.js` |
| **Middleware** | JWT verification (`requireAuth`), RBAC (`requireRole`)     | `middleware/*.js` |
| **Controllers**| HTTP concerns: parse req, shape response, map errors→status| `controllers/area.controller.js` |
| **Services**   | Business rules & validation (hierarchy, key generation, uniqueness) | `services/area.service.js` |
| **Repositories**| Data access via Prisma; no business logic                 | `repositories/area.repository.js` |
| **Store**      | Redis-backed current-state hash + pub/sub clients          | `store/state.store.js`, `store/redis.client.js` |
| **WS**         | WebSocket server, auth-on-upgrade, broadcast loop          | `ws/server.js` |

Error convention: services throw `Error` objects augmented with a `.status` property
(`Object.assign(new Error(msg), { status: 409 })`); controllers read `err.status || 500`.

---

## 3. API reference

All responses are JSON. Auth is `Authorization: Bearer <jwt>` unless noted. RBAC uses a role
hierarchy `VIEWER(0) < MANAGER(1) < ADMIN(2)`; "Min role" is the lowest role accepted.

> **Mount-point quirk:** most routers are mounted at the **root** (`/auth`, `/areas`,
> `/sensors`, `/events`, `/users`, `/settings`) — only ingestion is under `/api`
> (`/api/states`). There is no global `/api` prefix despite what the README implies.

### 3.1 Auth — `/auth`

| Method | Path           | Min role | Description                          |
|--------|----------------|----------|--------------------------------------|
| POST   | `/auth/login`  | public   | `{username, password}` → `{token}`   |
| POST   | `/auth/logout` | public   | No-op (JWT is stateless)             |
| GET    | `/auth/me`     | any auth | Current user `{id, username, role, email, full_name}` |

### 3.2 Areas — `/areas`  (all require auth; writes require MANAGER)

| Method | Path                  | Min role | Description                                |
|--------|-----------------------|----------|--------------------------------------------|
| GET    | `/areas/site`         | VIEWER   | The singleton SITE area (or `null`)        |
| GET    | `/areas`              | VIEWER   | Root areas (`parent_id = null`)            |
| GET    | `/areas/:id`          | VIEWER   | Single area (404 if missing)               |
| GET    | `/areas/:id/children` | VIEWER   | Direct children                            |
| GET    | `/areas/:id/tree`     | VIEWER   | Area + full subtree (eager 3 levels deep)  |
| POST   | `/areas`              | MANAGER  | Create area (validates hierarchy)          |
| PUT    | `/areas/:id`          | MANAGER  | Update `name` / `code` / `description`     |
| POST   | `/areas/:id/image`    | MANAGER  | Upload map image (multipart, field `image`, ≤20 MB) |
| PATCH  | `/areas/:id/position` | MANAGER  | Set `{map_x, map_y}` icon position         |
| PATCH  | `/areas/:id/active`   | MANAGER  | Enable/disable (`{is_active: bool}`)       |
| DELETE | `/areas/:id`          | MANAGER  | Delete (409 if it has children)            |

### 3.3 Sensors — `/sensors`  (all require auth; writes require MANAGER)

| Method | Path                  | Min role | Description                                |
|--------|-----------------------|----------|--------------------------------------------|
| GET    | `/sensors`            | VIEWER   | All sensors (+ linked room)                |
| GET    | `/sensors/:id`        | VIEWER   | Single sensor                              |
| POST   | `/sensors`            | MANAGER  | Create; auto-generates `sensor_key`        |
| PUT    | `/sensors/:id`        | MANAGER  | Update name/kind/room/metadata             |
| PATCH  | `/sensors/:id/active` | MANAGER  | Enable/disable; deactivation clears Redis state + broadcasts `sensor_deactivated` |
| DELETE | `/sensors/:id`        | MANAGER  | Delete sensor (+ its events)               |

### 3.4 Ingest / state — `/api/states`

| Method | Path                     | Min role | Description                              |
|--------|--------------------------|----------|------------------------------------------|
| POST   | `/api/states/:sensor_key`| **public** | Push a reading: `{state, ts?}` (`ts` = Unix seconds) |
| GET    | `/api/states`            | any auth | Current state of all sensors (map)       |
| GET    | `/api/states/:sensor_key`| any auth | Current state of one sensor (404 if none)|

Push body: `{ "state": "on", "ts": 1712345678 }`. `ts` optional; omitted → server time.
Push returns 404 for unknown key, 403 if the sensor is inactive.

### 3.5 Events (history) — `/events`  (require auth)

| Method | Path      | Min role | Description                                        |
|--------|-----------|----------|----------------------------------------------------|
| GET    | `/events` | any auth | Query event log. Params: `sensor_id`, `from`, `to`, `limit` (1–200, default 50), `offset`. Sorted `ts desc`. |

### 3.6 Users (admin only) — `/users`  (require ADMIN)

| Method | Path         | Min role | Description                                  |
|--------|--------------|----------|----------------------------------------------|
| GET    | `/users`     | ADMIN    | List `{users, total}`. Params: `search`, `role`, `is_active`, `limit`, `offset` |
| GET    | `/users/:id` | ADMIN    | Single user                                  |
| POST   | `/users`     | ADMIN    | Create `{username, password, role?, email?, full_name?}` |
| PUT    | `/users/:id` | ADMIN    | Update email/full_name/role/is_active        |
| DELETE | `/users/:id` | ADMIN    | Delete (400 if deleting your own account)    |

### 3.7 Settings (self-service) — `/settings`  (require auth)

| Method | Path                   | Min role | Description                         |
|--------|------------------------|----------|-------------------------------------|
| GET    | `/settings/profile`    | any auth | Own profile                         |
| PUT    | `/settings/profile`    | any auth | Update own `full_name` / `email`    |
| GET    | `/settings/preferences`| any auth | Own preferences JSON                |
| PUT    | `/settings/preferences`| any auth | Replace preferences JSON            |

### 3.8 Health & static

| Method | Path           | Description                              |
|--------|----------------|------------------------------------------|
| GET    | `/health`      | `{status: "ok"}`                         |
| GET    | `/uploads/*`   | Static map images (served from `/app/uploads`) |

### 3.9 WebSocket — `ws://<host>/ws?token=<jwt>`

Auth happens on the HTTP **upgrade** (JWT in query string; rejected with 401 before the
handshake). Server → client message types:

| Type                  | Payload                                             | When                       |
|-----------------------|----------------------------------------------------|----------------------------|
| `snapshot`            | `{states: {sensor_key: {sensor_id, state, ts}}}`   | On connect (full state)    |
| `state_changed`       | `{sensor_key, sensor_id, state, ts}`               | On any ingested reading    |
| `sensor_deactivated`  | `{sensor_key, sensor_id}`                          | When a sensor is disabled  |

---

## 4. Database schema & relationships

PostgreSQL via Prisma. UUID primary keys, snake_case columns.

```mermaid
erDiagram
    User {
        string   id PK
        string   username UK
        string   password_hash
        Role     role "ADMIN|MANAGER|VIEWER"
        string   email "nullable"
        string   full_name "nullable"
        boolean  is_active
        datetime last_active_at "nullable"
        json     preferences
        datetime created_at
    }

    Area {
        string   id PK
        string   name
        AreaType type "SITE|BUILDING|FLOOR|ROOM"
        string   parent_id FK "nullable (self-ref)"
        string   code "nullable"
        string   description "nullable"
        boolean  is_active
        string   image_path "nullable (SITE/FLOOR maps)"
        float    map_x "nullable (icon pos)"
        float    map_y "nullable"
        datetime created_at
    }

    Sensor {
        string     id PK
        string     sensor_key UK "dotted, e.g. b01.f02.r103.motion_1"
        string     name
        SensorKind kind "MOTION|LIGHT"
        string     room_area_id FK "nullable -> Area(ROOM)"
        boolean    is_active
        json       metadata "nullable"
        datetime   created_at
    }

    SensorEvent {
        string   id PK
        string   sensor_id FK
        string   value
        datetime ts "reading time"
        json     raw "nullable"
        datetime created_at
    }

    Area     ||--o{ Area        : "parent/children (AreaChildren)"
    Area     ||--o{ Sensor      : "room has sensors"
    Sensor   ||--o{ SensorEvent : "append-only history"
```

### Key constraints & design notes

- **Area is a self-referential tree.** `parent_id` → `Area.id` via the named relation
  `AreaChildren`. The hierarchy is a **fixed 4 levels**: `SITE → BUILDING → FLOOR → ROOM`,
  enforced in the service layer (`VALID_PARENT_TYPE`), so subtree reads use a static
  3-deep `include` instead of a recursive query.
- **SITE is a singleton** — `createArea` rejects a second SITE (409).
- `Sensor.@@unique([room_area_id, kind])` — at most one sensor of each kind per room.
- `Sensor.sensor_key` is globally unique and **auto-generated** from ancestor codes
  (see §7.3). It is the stable handle sensors use to push state.
- **Two notions of "state":**
  - *Current state* → Redis hash `sensor_states` (mutable upsert, not in Postgres).
  - *History* → `SensorEvent` table (append-only; indexed on `(sensor_id, ts desc)` and `(ts desc)`).
- `User.preferences` is a free-form JSON blob (`@default("{}")`) for per-user UI prefs.
- Codes are unique **among siblings** under the same parent (checked in `checkCodeUnique`),
  not globally.

### Enums

| Enum         | Values                          |
|--------------|---------------------------------|
| `Role`       | `ADMIN`, `MANAGER`, `VIEWER`    |
| `AreaType`   | `SITE`, `BUILDING`, `FLOOR`, `ROOM` |
| `SensorKind` | `MOTION`, `LIGHT`               |

### Migrations

- `..._add_user_profile_fields` — adds `email`, `full_name`, `is_active`, `last_active_at`, `preferences` to `User`.
- `..._add_manager_role` — adds `MANAGER` to the `Role` enum.

### Seed users (`prisma/seed.js`)

| Username  | Password     | Role    |
|-----------|--------------|---------|
| `admin`   | `admin123`   | ADMIN   |
| `manager` | `manager123` | MANAGER |
| `viewer`  | `viewer123`  | VIEWER  |

---

## 5. Module / component structure

### Backend module map

```mermaid
graph LR
    subgraph Routes
        rA[area.routes] & rS[sensor.routes] & rI[ingest.routes]
        rAu[auth.routes] & rE[event.routes] & rU[user.routes] & rSe[settings.routes]
    end
    subgraph Middleware
        mAuth[requireAuth] & mRole[requireRole]
    end
    subgraph Controllers
        cA[area] & cS[sensor] & cI[ingest] & cAu[auth] & cE[event] & cU[user] & cSe[settings]
    end
    subgraph Services
        sA[area] & sS[sensor] & sI[ingest] & sAu[auth] & sE[event] & sU[user]
    end
    subgraph Repositories
        pA[area.repo] & pS[sensor.repo] & pU[user.repo]
    end
    subgraph Infra
        store[state.store] --> redis[(redis.client)]
        prisma[(Prisma)]
    end

    Routes --> Middleware --> Controllers --> Services --> Repositories --> prisma
    sS --> store
    sI --> store
    sI -. publish .-> redis
```

### Frontend structure

| Concern        | File(s)                                  | Notes |
|----------------|------------------------------------------|-------|
| Entry / routing| `App.jsx`, `main.jsx`                     | `BrowserRouter`, `ProtectedRoute` w/ role gating |
| Auth state     | `context/AuthContext.jsx`                | `useAuth()`; token+user in `sessionStorage` |
| API client     | `api/client.js`                          | `fetch` wrapper, auto-attaches Bearer token |
| Realtime       | `hooks/useWebSocket.js`                  | Auto-reconnect w/ exponential backoff; returns `sensorStates` |
| Shell          | `components/AppLayout.jsx`               | Collapsible sidebar, role-filtered nav, user menu |
| Pages          | `pages/*.jsx`                            | Dashboard, Sensors, Logs, Analytics, Manage, Settings, Login |
| UI primitives  | `components/*` (Button, Card, TextInput, etc.) | Shared design-system widgets |
| Styles         | `styles/shared.js`, CSS files           | `colors` tokens, shared style objects |

### Frontend routes & access

| Route        | Page          | Min role | Notes                                    |
|--------------|---------------|----------|------------------------------------------|
| `/login`     | LoginPage     | public   | Redirects to `/dashboard` if logged in   |
| `/dashboard` | DashboardPage | any auth | Map viewer + live status (read for VIEWER, edit for MANAGER+) |
| `/analytics` | AnalyticsPage | MANAGER  | Charts/stats                             |
| `/sensors`   | SensorsPage   | MANAGER  | Sensor registry CRUD                     |
| `/logs`      | LogsPage      | MANAGER  | Event log table                          |
| `/manage`    | ManagePage    | ADMIN    | User management                          |
| `/settings`  | SettingsPage  | any auth | Profile + preferences                    |

---

## 6. "OOP classes" — what actually exists

There are **no domain OOP classes** in this codebase. The architecture is deliberately
**functional + modular**: each layer exports plain functions over `module.exports`, and
state is passed as arguments rather than held on objects. This is a common and valid Node
style — worth calling out explicitly so nobody goes hunting for class hierarchies.

The only classes are **framework-provided / instantiated**, not authored domain types:

| Class               | Source            | Used as                                            |
|---------------------|-------------------|----------------------------------------------------|
| `PrismaClient`      | `@prisma/client`  | One instance per repository (DB gateway)           |
| `Redis` (ioredis)   | `ioredis`         | Two instances: `publisher` (commands) + `subscriber` (SUBSCRIBE mode) |
| `WebSocketServer`   | `ws`              | One `wss` instance in `ws/server.js`               |
| `express.Router`    | `express`         | One router per route module                        |

The closest things to "domain objects" are the **Prisma models** (§4) — they're the schema
types, not behavior-bearing classes. The "structures" that matter are the Redis state record
shape and the WebSocket message envelopes (§3.9).

```mermaid
classDiagram
    class StateStore {
        <<module>>
        +setState(key, sensorId, state, ts)
        +getState(key)
        +getAllStates()
        +deleteState(key)
    }
    class RedisClient {
        <<module>>
        +publisher : Redis
        +subscriber : Redis
    }
    class IngestService {
        <<module>>
        +ingest(sensorKey, state, ts)
    }
    class SensorService {
        <<module>>
        +createSensor(dto)
        +buildSensorKey(roomId, name)
        +setActive(id, isActive)
    }
    class AreaService {
        <<module>>
        +createArea(dto)
        +validateParent(type, parentId)
        +getTree(id)
    }
    IngestService ..> StateStore : updates
    IngestService ..> RedisClient : publishes state_changed
    StateStore ..> RedisClient : HSET/HGET
    SensorService ..> StateStore : clears on deactivate
```

---

## 7. Sequence diagrams

### 7.1 Login & authenticated request

```mermaid
sequenceDiagram
    actor U as User
    participant FE as React SPA
    participant API as Express
    participant AS as auth.service
    participant UR as user.repo
    participant DB as PostgreSQL

    U->>FE: enter username/password
    FE->>API: POST /auth/login
    API->>AS: login(username, password)
    AS->>UR: findByUsername
    UR->>DB: SELECT user
    DB-->>AS: user (+ password_hash)
    AS->>AS: bcrypt.compare()
    AS-->>API: signed JWT (sub, username, role)
    API-->>FE: { token }
    FE->>FE: sessionStorage.setItem(token)
    FE->>API: GET /auth/me (Bearer)
    API->>API: requireAuth → verify JWT,<br/>updateLastActive (fire-and-forget)
    API-->>FE: { id, username, role, ... }
    FE->>FE: store user, route to /dashboard
```

### 7.2 Sensor ingestion → persistence → live UI (the core pipeline)

```mermaid
sequenceDiagram
    participant S as Sensor
    participant API as ingest.controller
    participant IS as ingest.service
    participant SR as sensor.repo
    participant ST as state.store
    participant RD as Redis
    participant APP as app.js subscriber
    participant WS as ws/server
    participant FE as Dashboard

    S->>API: POST /api/states/:sensor_key {state, ts?}
    API->>IS: ingest(key, state, ts)
    IS->>SR: findBySensorKey(key)
    alt unknown key
        SR-->>API: 404
    else inactive
        SR-->>API: 403
    else ok
        Note over IS,ST: read previous value
        IS->>ST: getState(key)
        IS->>ST: setState(key, sensorId, state, ts)
        ST->>RD: HSET sensor_states
        IS->>RD: PUBLISH state_changed {old,new,...}
        IS-->>API: { sensor_key, state, ts }
        API-->>S: 200 OK
    end

    par Async DB write
        RD-->>APP: message(state_changed)
        APP->>SR: appendEvent(sensorId, state, ts)
        Note over SR: INSERT SensorEvent (Postgres)
    and Live broadcast
        RD-->>WS: message(state_changed)
        WS->>FE: { type: state_changed, key, state, ts }
        FE->>FE: update sensorStates → recolor map
    end
```

**Why two subscribers?** `app.js` subscribes to persist history (write to `SensorEvent`);
`ws/server.js` subscribes to broadcast to browsers. Both react to the same Redis
`state_changed` message — decoupling persistence from realtime delivery. The HTTP push
returns immediately after the Redis publish; DB write and fan-out happen asynchronously.

### 7.3 Sensor creation with auto-generated key

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as sensor.controller
    participant SS as sensor.service
    participant AR as area.repo
    participant SR as sensor.repo

    FE->>API: POST /sensors {name, kind, room_area_id}
    API->>SS: createSensor(dto)
    SS->>AR: findById(room_area_id)
    Note over SS: must be type ROOM (else 400)
    SS->>SR: findByRoomAndKind(room, kind)
    Note over SS: reject duplicate kind in room (409)
    SS->>AR: findWithAncestors(room_area_id)
    Note over SS: walk up: building, floor, room codes<br/>(each must have a code, else 400)
    SS->>SS: key = "{B}.{F}.{R}.{slug(name)}"
    loop while key taken
        SS->>SR: findBySensorKey(key)
        SS->>SS: append _2, _3, ...
    end
    SS->>SR: create({sensor_key, name, kind, room})
    SR-->>API: sensor
    API-->>FE: 201 sensor
```

### 7.4 WebSocket lifecycle

```mermaid
sequenceDiagram
    participant FE as useWebSocket
    participant WS as ws/server
    participant AS as auth.service
    participant ST as state.store

    FE->>WS: GET /ws?token=JWT (HTTP upgrade)
    WS->>AS: verifyToken(token)
    alt invalid / missing
        WS-->>FE: 401, socket destroyed
    else valid
        WS->>WS: handleUpgrade → connection
        WS->>ST: getAllStates()
        WS-->>FE: { type: snapshot, states }
        loop on each Redis message
            WS-->>FE: state_changed / sensor_deactivated
        end
    end
    Note over FE: onclose → reconnect with<br/>exponential backoff (1s→10s)
```

---

## 8. Workflow diagrams

### 8.1 Area hierarchy & creation rules

```mermaid
graph TD
    SITE[SITE - singleton, has map image] --> B[BUILDING - has code + map_x/y icon]
    B --> F[FLOOR - has code + floor map image]
    F --> R[ROOM - has code + map_x/y icon]
    R --> SENSORS[Sensors - 1 per kind]

    classDef note fill:#f6f8fa,stroke:#999,color:#333;
```

Creation validation (`area.service.validateParent`):

```mermaid
flowchart TD
    Start([POST /areas]) --> T{type?}
    T -->|SITE| S1{site exists?}
    S1 -->|yes| E1[409 site already exists]
    S1 -->|no| OK1{has parent_id?}
    OK1 -->|yes| E2[400 SITE cannot have parent]
    OK1 -->|no| Create
    T -->|BUILDING/FLOOR/ROOM| P1{parent_id given?}
    P1 -->|no| E3[400 requires a parent]
    P1 -->|yes| P2{parent exists?}
    P2 -->|no| E4[404 parent not found]
    P2 -->|yes| P3{parent.type == expected?}
    P3 -->|no| E5[400 must be under correct type]
    P3 -->|yes| P4{code unique among siblings?}
    P4 -->|no| E6[409 code already used]
    P4 -->|yes| Create[(create area)]
```

### 8.2 Sensor state classification → map color

The dashboard derives a status from the raw string value (`DashboardPage.classifySensorState`):

```mermaid
flowchart LR
    V[raw state string] --> C{value}
    C -->|on / active / detected| A[active - green]
    C -->|off / idle| I[idle - blue]
    C -->|fault / error| F[fault - amber]
    C -->|none / unknown other| U[idle / unconfigured]
```

**Room color = worst-of aggregation** across its sensors: `fault` > `active` > `idle` >
`unconfigured`. A room with no sensors renders as `unconfigured` (grey).

### 8.3 Role-based access (RBAC)

```mermaid
flowchart TD
    Req([Request]) --> Auth{requireAuth:<br/>valid JWT?}
    Auth -->|no| R401[401]
    Auth -->|yes| Role{requireRole?}
    Role -->|no role gate| Allow[handler runs]
    Role -->|yes| Lvl{userLevel >= requiredLevel?}
    Lvl -->|no| R403[403 insufficient permissions]
    Lvl -->|yes| Allow

    subgraph Hierarchy
        direction LR
        VIEWER0[VIEWER = 0] --- MANAGER1[MANAGER = 1] --- ADMIN2[ADMIN = 2]
    end
```

The same hierarchy is mirrored on the frontend (`ProtectedRoute` in `App.jsx`,
`AppLayout` nav filtering) — but it is **enforced** server-side by `requireRole`.

### 8.4 Sensor deactivation side-effects

```mermaid
flowchart TD
    D([PATCH /sensors/:id/active false]) --> U[sensor.repo.update is_active=false]
    U --> CL[state.store.deleteState - HDEL from Redis]
    CL --> PUB[PUBLISH sensor_deactivated]
    PUB --> WS[ws broadcasts to clients]
    WS --> FE[Dashboard removes sensor_key from state - dot greys out]
    Note1[Future pushes to this sensor_key now return 403]
```

---

## 9. End-to-end data flow summary

```mermaid
graph LR
    A[Sensor pushes reading] --> B[ingest.service validates + timestamps]
    B --> C[Redis hash: current state]
    B --> D[Redis pub: state_changed]
    D --> E[app.js: append SensorEvent to Postgres]
    D --> F[ws server: broadcast to browsers]
    F --> G[useWebSocket updates sensorStates]
    G --> H[Dashboard recolors map in real time]
    C --> I[GET /api/states + WS snapshot on connect]
    E --> J[GET /events - history / Logs + Analytics pages]
```

---

## 10. Glossary

| Term            | Meaning                                                                 |
|-----------------|------------------------------------------------------------------------|
| `sensor_key`    | Stable dotted ID `building.floor.room.name_slug` (e.g. `b01.f02.r103.motion_1`); how sensors address pushes |
| Current state   | Latest value per sensor, kept in Redis hash `sensor_states` (not in Postgres) |
| Event           | Immutable historical record of one state change (`SensorEvent` table)   |
| SITE            | Single root area holding the campus map image                           |
| `map_x`/`map_y` | Icon coordinates in *natural image* pixels; scaled to canvas at render  |
| Snapshot        | Full current-state map sent to a client right after WS connect          |
| `preferences`   | Per-user JSON blob for UI settings                                       |
```
