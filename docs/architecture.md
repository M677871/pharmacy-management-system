# Architecture

## Overview
PharmaFlow is a full-stack pharmacy management platform composed of:

- A NestJS backend exposing REST APIs and a Socket.IO gateway.
- A React + Vite frontend consuming REST and realtime events.
- A PostgreSQL database managed through TypeORM entities and migrations.

Core integration points:

- REST API base path: `/api`.
- Realtime namespace: `/realtime`.
- Default local topology: frontend on 5173, backend on 3000, PostgreSQL on 5432.

## System Context

- Frontend
  - Authenticates via JWT access/refresh tokens.
  - Uses Axios interceptors for bearer token attachment and token refresh.
  - Uses Socket.IO client for notifications, presence, messaging, and order/inventory updates.
- Backend
  - Implements modular NestJS feature slices (auth, inventory, orders, messaging, notifications, dashboard, users, realtime).
  - Applies global validation, API prefixing, and CORS policy.
  - Publishes realtime events from domain services through a central emitter service.
- Database
  - Stores identity/auth data, inventory lifecycle records, catalog orders, messaging, and notifications.

## Backend Composition
Defined in `backend/src/app.module.ts`:

- `ConfigModule` (global)
- `DatabaseModule`
- `AuthModule`
- `DashboardModule`
- `InventoryModule`
- `OrdersModule`
- `RealtimeModule`
- `MessagingModule`
- `MediaModule`
- `CallsModule`
- `MeetingsModule`
- `UsersModule`

## Request Lifecycle

1. Client calls a REST endpoint under `/api`.
2. Global `ValidationPipe` sanitizes and validates DTOs.
3. Guards enforce JWT authentication and role authorization where required.
4. Services execute business rules and persistence with TypeORM.
5. Relevant workflows emit realtime events to user/role rooms.
6. Frontend updates local state from REST response and/or socket payloads.

## Realtime Architecture
Realtime implementation is split across:

- Gateway: `backend/src/features/realtime/realtime.gateway.ts`
- Event constants/room helpers: `backend/src/features/realtime/realtime.events.ts`
- Emitter service: `backend/src/features/realtime/core/realtime-emitter.service.ts`

Connection model:

- Clients authenticate during handshake using JWT.
- Connected sockets join:
  - `user:{userId}`
  - `role:{role}`

This enables targeted fan-out for personal and role-scoped events.

Calls and meetings reuse this namespace for protected WebRTC signaling. The backend validates JWT identity, call participation, meeting membership, and staff-only meeting roles before relaying any signaling payload.

## Communication Architecture

One-to-one chat calls are separate from regular chat messages:

- Call lifecycle, participants, recordings, and captions are owned by `backend/src/features/calls`.
- Call signaling uses Socket.IO events and persists lifecycle state in PostgreSQL.
- Recordings are uploaded by authenticated participants and served through protected download endpoints.

Meetings are staff-only and live outside the chat UI:

- Meeting lifecycle, participants, notes, recordings, and captions are owned by `backend/src/features/meetings`.
- Only `admin` and `employee` users can access meeting APIs and frontend routes.
- Meeting join and signaling require invited membership.

Shared media services live under `backend/src/features/media`:

- Private recording storage.
- Transcript segment persistence.
- Translation provider abstraction.

## Persistence Architecture

- Database module: `backend/src/database/database.config.ts`
- TypeORM CLI datasource: `backend/src/database/typeorm-cli.config.ts`
- Migration set: `backend/src/database/migrations`

Runtime behavior:

- `autoLoadEntities: true`
- `synchronize` is configurable via `DATABASE_SYNCHRONIZE`, otherwise defaults to non-production auto-sync behavior.
- CLI datasource keeps `synchronize: false` for migration-driven operations.

## Frontend Composition

Bootstrapping and providers:

- `frontend/src/main.tsx` wraps application with:
  - `BrowserRouter`
  - `AuthProvider`
  - `RealtimeProvider`

Routing and access control:

- `frontend/src/App.tsx` defines guest and protected routes.
- `frontend/src/shared/components/ProtectedRoute.tsx` enforces authenticated and role-based route access.
- `frontend/src/shared/navigation/app-navigation.tsx` drives role-aware sidebar navigation.

## Deployment Topology
Containerized topology in `compose.yaml`:

- `db`: postgres 16-alpine with persistent volume.
- `backend`: multi-stage Node 20 image, exposes 3000.
- `frontend`: Vite build served by Nginx, exposed as 5173 externally mapped to container port 80.

Relevant build/runtime files:

- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
