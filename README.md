# PharmaFlow

PharmaFlow is a production-style pharmacy management platform built with NestJS, React, TypeScript, Socket.IO, and PostgreSQL.

It supports end-to-end workflows for:

- authentication and account security
- inventory and stock lifecycle management
- point-of-sale checkout and return processing
- catalog ordering with assignment and approval lifecycle
- realtime notifications and staff/customer messaging
- dashboard and reporting experiences

## Documentation Index

- Architecture: [docs/architecture.md](docs/architecture.md)
- Backend (NestJS): [docs/backend.md](docs/backend.md)
- Frontend (React): [docs/frontend.md](docs/frontend.md)
- API Structure: [docs/api-structure.md](docs/api-structure.md)
- Setup and Configuration: [docs/setup-configuration.md](docs/setup-configuration.md)
- Environment Variables: [docs/environment-variables.md](docs/environment-variables.md)
- Project Structure: [docs/project-structure.md](docs/project-structure.md)
- Key Flows: [docs/key-flows.md](docs/key-flows.md)
- Developer Onboarding: [docs/developer-onboarding.md](docs/developer-onboarding.md)

## Overview

PharmaFlow is organized as a two-application repository:

- Backend: NestJS API and realtime gateway (`backend`)
- Frontend: React SPA (`frontend`)

The backend exposes REST APIs under `/api` and realtime events under Socket.IO namespace `/realtime`.

## Architecture

High-level topology:

- Client: React + Vite + Axios + Socket.IO client
- Server: NestJS modules + TypeORM + Socket.IO gateway
- Data: PostgreSQL
- Local orchestration: Docker Compose (`compose.yaml`)

Core backend modules:

- Auth
- Dashboard
- Inventory
- Orders
- Messaging
- Notifications
- Realtime
- Users

## Backend

Backend conventions follow modular NestJS patterns:

- Feature slices under `backend/src/features`
- DTO-based validation and transformation
- Guard-based auth and authorization (`JwtAuthGuard`, `RolesGuard`)
- Typed entities and repository-backed data access
- Service-level transaction handling for inventory and order lifecycle operations

For full backend details, see [docs/backend.md](docs/backend.md).

## Frontend

Frontend conventions follow modern React application patterns:

- Route composition in `frontend/src/App.tsx`
- Auth context and token hydration in `frontend/src/features/auth/context/AuthContext.tsx`
- Axios API client with automatic token refresh in `frontend/src/shared/api/axios.ts`
- Realtime context in `frontend/src/features/realtime/context/RealtimeContext.tsx`
- Role-aware navigation and route protection

For full frontend details, see [docs/frontend.md](docs/frontend.md).

## API Structure

REST API:

- Base path: `/api`
- Controllers grouped by feature (`auth`, `inventory`, `orders`, `messages`, `notifications`, `dashboard`, `users`)

Realtime API:

- Namespace: `/realtime`
- Client/server event contracts are centralized in `backend/src/features/realtime/realtime.events.ts`

Complete route and event map: [docs/api-structure.md](docs/api-structure.md).

## Setup

Prerequisites:

- Node.js
- npm
- PostgreSQL (or Docker)

Local development:

1. Install backend dependencies in `backend`
2. Install frontend dependencies in `frontend`
3. Configure `backend/.env`
4. Start backend (`npm run start:dev`)
5. Start frontend (`npm run dev`)

Containerized development:

- Run from repository root: `docker compose up --build`

Detailed setup: [docs/setup-configuration.md](docs/setup-configuration.md).

## Configuration

Configuration is environment-driven:

- Backend uses Nest `ConfigModule` and `ConfigService`
- Database configuration comes from `backend/src/database/database.config.ts`
- TypeORM CLI datasource is in `backend/src/database/typeorm-cli.config.ts`
- Frontend runtime base URLs are resolved in `frontend/src/shared/api/axios.ts`

## Environment Variables

Templates and active env files:

- Root compose defaults: `.env.example`
- Backend template: `backend/.env.example`
- Backend test env: `backend/.env.test`
- Frontend local env: `frontend/.env`

Complete variable catalog: [docs/environment-variables.md](docs/environment-variables.md).

## Project Structure

Top-level layout:

- `backend/`
- `frontend/`
- `compose.yaml`
- `docs/`

Detailed structure map: [docs/project-structure.md](docs/project-structure.md).

## Key Flows

Documented implementation flows include:

- login, refresh, logout
- password reset (OTP and link)
- TOTP setup and verification
- checkout allocation and stock movement recording
- purchase receiving
- sale return processing
- order assignment, approval/rejection, payment completion
- notifications and direct/broadcast messaging

Flow-level details: [docs/key-flows.md](docs/key-flows.md).

## Developer Onboarding

For first-time contributors, start here:

- [docs/developer-onboarding.md](docs/developer-onboarding.md)

It covers local startup, test execution, key code entry points, and repository navigation.
