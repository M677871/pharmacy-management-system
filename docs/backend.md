# Backend Documentation

## Overview
The backend is a NestJS application with modular feature organization under `backend/src/features`.
It provides:

- JWT-based authentication and role-based authorization.
- Inventory and transaction APIs (purchases, sales, returns, stock movements).
- Catalog order lifecycle APIs.
- Messaging and notification APIs.
- Socket.IO realtime gateway for live updates.

## Bootstrap and Global Behavior
Source: `backend/src/main.ts`

- Global prefix: `/api`
- CORS origin: `FRONTEND_URL` (default `http://localhost:5173`)
- Global validation pipe:
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
  - `transform: true`
- Bind address: `0.0.0.0`
- Port: `PORT` (default 3000)

## Module Structure
Defined in `backend/src/app.module.ts`.

- Platform modules:
  - `ConfigModule` (global)
  - `DatabaseModule`
- Feature modules:
  - `AuthModule`
  - `DashboardModule`
  - `InventoryModule`
  - `OrdersModule`
  - `RealtimeModule`
  - `MessagingModule`
  - `UsersModule`

## Authentication and Authorization

### Strategies
Location: `backend/src/features/auth/strategies`

- `local` (email/password)
- `jwt` (access token)
- `jwt-refresh` (refresh token)
- `google`, `facebook`, `instagram` (social auth)

### Guards and Decorators

- JWT guard: `backend/src/features/auth/guards/jwt-auth.guard.ts`
- Roles guard: `backend/src/features/auth/guards/roles.guard.ts`
- Roles decorator: `backend/src/features/auth/decorators/roles.decorator.ts`
- Current user decorator: `backend/src/features/auth/decorators/current-user.decorator.ts`

### Role Model
Source: `backend/src/features/users/entities/user.entity.ts`

- `admin`
- `employee`
- `customer` (default)

## Password Reset
Password reset orchestration is in `backend/src/features/auth/password-reset/password-reset.service.ts`.

Modes:

- `otp`
- `link`

Mode selection:

- Uses `PASSWORD_RESET_MODE` when explicitly set.
- Falls back to:
  - `link` in production
  - `otp` outside production

Response model and user-facing message are defined in `backend/src/features/auth/password-reset/password-reset.types.ts`.

## Data Access and Persistence

### Runtime DB Module
Source: `backend/src/database/database.config.ts`

- Database: PostgreSQL
- `autoLoadEntities: true`
- Sync behavior:
  - `DATABASE_SYNCHRONIZE` override when provided
  - otherwise sync disabled only in production

### CLI Datasource
Source: `backend/src/database/typeorm-cli.config.ts`

- Explicit entity list for tooling.
- Loads `.env` or `.env.test` depending on `NODE_ENV`.
- Migrations path: `backend/src/database/migrations/*.{js,ts}`
- `synchronize: false`

### Migrations

- `1710500000000-CreateInventorySlice.ts`
- `1710600000000-AddPasswordResetMetadata.ts`
- `1710700000000-SetUserRoleDefaultCustomer.ts`

## Realtime Integration

Gateway: `backend/src/features/realtime/realtime.gateway.ts`

- Namespace: `/realtime`
- Client auth at handshake via socket auth service.
- Room model:
  - `user:{userId}`
  - `role:{role}`

Events are centralized in `backend/src/features/realtime/realtime.events.ts`.

## Testing

Jest config: `backend/jest.config.js`

- Unit and E2E tests use `ts-jest`.
- Coverage output: `backend/coverage`.

Test harness and DB lifecycle utility:

- `backend/test/helpers/test-app.ts`
- `backend/test/helpers/auth.helper.ts`

Test suites:

- Auth: `backend/test/e2e/auth.e2e.spec.ts`
- Password reset: `backend/test/e2e/password-reset.e2e.spec.ts`
- TOTP: `backend/test/e2e/totp.e2e.spec.ts`
- RBAC: `backend/test/e2e/rbac.e2e.spec.ts`
- Inventory: `backend/test/e2e/inventory.e2e.spec.ts`
- Orders: `backend/test/e2e/orders.e2e.spec.ts`
- Social auth: `backend/test/e2e/social-auth.e2e.spec.ts`
- Unit auth service: `backend/test/unit/auth.service.spec.ts`

## Build and Runtime

- Build: `npm run build`
- Dev runtime: `npm run start:dev`
- Prod runtime: `npm run start:prod`

Container build/runtime:

- Multi-stage Dockerfile: `backend/Dockerfile`
- Runtime image installs prod dependencies and runs compiled output.
