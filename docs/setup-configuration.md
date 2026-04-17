# Setup and Configuration

## Prerequisites

- Node.js 20 or later recommended
- npm
- PostgreSQL 16 (if running without Docker)
- Docker + Docker Compose (optional, for full containerized stack)

## Repository Layout

- `backend`: NestJS API service
- `frontend`: React client
- `compose.yaml`: local multi-container orchestration

## Local Development Setup

## 1. Install dependencies

From repository root:

- Backend
  - `cd backend`
  - `npm install`
- Frontend
  - `cd frontend`
  - `npm install`

## 2. Configure environment

Backend:

- Copy `backend/.env.example` to `backend/.env`
- Update values for database, JWT, OAuth, and SMTP as needed

Frontend:

- `frontend/.env` supports `VITE_API_URL`
- If omitted, the frontend defaults to `http://localhost:3000/api`

## 3. Start services

### Option A: local processes

- Start backend from `backend`:
  - `npm run start:dev`
- Start frontend from `frontend`:
  - `npm run dev`

### Option B: Docker Compose

From repository root:

- `docker compose up --build`

Compose services:

- Database: PostgreSQL
- Backend: NestJS API
- Frontend: Nginx-served Vite build

## Runtime Defaults

- Frontend dev server: 5173 (`frontend/vite.config.ts`)
- Backend API: 3000 (`backend/src/main.ts`)
- API prefix: `/api`
- Realtime namespace: `/realtime`

## Build Commands

Backend (`backend/package.json`):

- `npm run build`
- `npm run start:prod`

Frontend (`frontend/package.json`):

- `npm run build`
- `npm run preview`

## Configuration Behavior Notes

- CORS origin is controlled by `FRONTEND_URL` in backend configuration.
- TypeORM runtime sync behavior is controlled by `DATABASE_SYNCHRONIZE` when set.
- Password reset mode uses `PASSWORD_RESET_MODE` when set; otherwise environment-aware fallback applies.

## Database and Schema Management

Runtime configuration:

- `backend/src/database/database.config.ts`

CLI/migration configuration:

- `backend/src/database/typeorm-cli.config.ts`

Migration files:

- `backend/src/database/migrations/1710500000000-CreateInventorySlice.ts`
- `backend/src/database/migrations/1710600000000-AddPasswordResetMetadata.ts`
- `backend/src/database/migrations/1710700000000-SetUserRoleDefaultCustomer.ts`
