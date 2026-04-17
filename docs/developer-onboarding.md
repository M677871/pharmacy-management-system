# Developer Onboarding

## Purpose
This guide helps new contributors run, understand, and work with the PharmaFlow codebase efficiently.

## 1. Initial Setup

1. Install prerequisites:
   - Node.js
   - npm
   - PostgreSQL (or Docker)
2. Clone repository and install dependencies:
   - `backend`: `npm install`
   - `frontend`: `npm install`
3. Configure environment files:
   - Backend: create `backend/.env` from `backend/.env.example`
   - Frontend: set `frontend/.env` with `VITE_API_URL` if needed

## 2. Start Development Environment

### Local processes

- Backend: run `npm run start:dev` in `backend`
- Frontend: run `npm run dev` in `frontend`

### Docker Compose

- From root run `docker compose up --build`

Expected local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api`

## 3. Read This Code First

Backend foundation:

- `backend/src/main.ts`
- `backend/src/app.module.ts`
- `backend/src/database/database.config.ts`

Core domain slices:

- Auth: `backend/src/features/auth`
- Inventory: `backend/src/features/inventory`
- Orders: `backend/src/features/orders`
- Realtime: `backend/src/features/realtime`
- Messaging/notifications: `backend/src/features/messaging`, `backend/src/features/notifications`

Frontend foundation:

- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/shared/api/axios.ts`
- `frontend/src/features/auth/context/AuthContext.tsx`
- `frontend/src/features/realtime/context/RealtimeContext.tsx`

## 4. Understand Access Control Early

Backend role model:

- `admin`
- `employee`
- `customer`

Enforcement points:

- JWT guard
- Roles guard
- `@Roles` decorator on protected controllers and methods

Frontend role model is reflected in:

- Route guards in `frontend/src/App.tsx`
- Sidebar navigation in `frontend/src/shared/navigation/app-navigation.tsx`

## 5. Run Tests

Backend test commands:

- `npm run test`
- `npm run test:unit`
- `npm run test:e2e`
- `npm run test:cov`

Test scaffolding and DB lifecycle helpers:

- `backend/test/helpers/test-app.ts`
- `backend/test/helpers/auth.helper.ts`

Recommended first suites for familiarization:

- `backend/test/e2e/auth.e2e.spec.ts`
- `backend/test/e2e/inventory.e2e.spec.ts`
- `backend/test/e2e/orders.e2e.spec.ts`

## 6. Debugging and Runtime Tracing

Useful backend flow anchors:

- Auth issuance/refresh: `backend/src/features/auth/auth.service.ts`
- Inventory checkout allocation: `backend/src/features/inventory/sales/services/allocation.service.ts`
- Order transitions and notifications: `backend/src/features/orders/orders.service.ts`
- Realtime event wiring: `backend/src/features/realtime/realtime.gateway.ts`

Useful frontend flow anchors:

- Token refresh interceptor: `frontend/src/shared/api/axios.ts`
- Auth bootstrap and token storage: `frontend/src/features/auth/context/AuthContext.tsx`
- Live socket event handling: `frontend/src/features/realtime/context/RealtimeContext.tsx`

## 7. Documentation Map

For architecture and operational detail, use:

- `docs/architecture.md`
- `docs/backend.md`
- `docs/frontend.md`
- `docs/api-structure.md`
- `docs/setup-configuration.md`
- `docs/environment-variables.md`
- `docs/project-structure.md`
- `docs/key-flows.md`
