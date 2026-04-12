# PharmaFlow (pharmacy-management-system)

PharmaFlow is a full-stack pharmacy ERP built with NestJS + React + PostgreSQL.
It covers authentication, inventory operations, POS checkout, purchases, returns, dashboard analytics, direct messaging, and real-time notifications.

## Why this project is useful

Pharma teams can manage inventory and sales in one workspace, with real-time updates across users.

Examples of real-time behavior already implemented:
- When stock drops to low/out thresholds, staff receive notifications immediately without refresh.
- When a batch becomes near expiry, warning notifications are pushed in real time.
- When purchases/sales/returns are processed, inventory and analytics views auto-refresh via socket events.
- Messaging presence, direct messages, read receipts, and broadcast announcements update live.

## Architecture

- Backend: NestJS (REST + Socket.IO gateway), TypeORM, PostgreSQL
- Frontend: React + Vite + TypeScript + React Router
- Realtime transport: Socket.IO namespace `/realtime`
- API base path: `/api`

## Core feature modules

- Auth and accounts
  - Register/login/refresh/logout
  - TOTP (generate/enable/verify/disable)
  - Social auth callbacks (Google, Facebook, Instagram)
  - Password reset (OTP or link mode)
- Inventory
  - Categories, suppliers, products, batches
  - Purchase receiving
  - POS checkout with FEFO allocation
  - Returns against sale items
  - Stock movement audit trail
- Dashboard and reports
  - Overview, catalog, reporting endpoints
  - Realtime analytics refresh events
- Realtime notifications
  - Low stock, out-of-stock, expiry warnings, broadcasts
- Messaging
  - Contacts, threads, read state
  - Direct message send/update/delete via socket events
  - Staff broadcasts

## Monorepo structure

```text
pharmacy/
  backend/   # NestJS API + WebSocket gateway + TypeORM
  frontend/  # React/Vite client
  compose.yaml
```

## Third-party libraries and tools used

### Backend
- `@nestjs/*` (modular API architecture)
- `typeorm` + `pg` (ORM + PostgreSQL driver)
- `class-validator` + `class-transformer` (DTO validation/transformation)
- `passport`, `passport-jwt`, `passport-local`, `passport-google-oauth20`, `passport-facebook`, `passport-oauth2`
- `bcrypt` (password hashing)
- `otplib` + `qrcode` (TOTP/2FA)
- `nodemailer` (mail transport)
- `socket.io` (realtime server)
- `jest`, `supertest`, `ts-jest` (testing)

### Frontend
- `react`, `react-dom`, `react-router-dom`
- `axios` (HTTP client + token refresh interceptor)
- `socket.io-client` (realtime client)
- `vite`, `typescript`, `@vitejs/plugin-react`

### Tooling/runtime
- Docker + Docker Compose
- PostgreSQL 16 (in `compose.yaml`)
- Node.js + npm

## Prerequisites

- Node.js 18+ (recommended)
- npm 9+
- Docker Desktop (optional but recommended)
- PostgreSQL if running without Docker

## Project setup instructions

## 1) Clone and install

```bash
git clone https://github.com/M677871/pharmacy-management-system.git
cd pharmacy-management-system

cd backend
npm install
cd ../frontend
npm install
cd ..
```

## 2) Environment configuration

Create backend env file:

```bash
cd backend
cp .env.example .env
```

Important backend variables:
- `PORT`, `NODE_ENV`
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- Social auth IDs/secrets if used
- SMTP and password reset settings

Frontend env is optional because defaults are provided in code:
- `VITE_API_URL` default: `http://localhost:3000/api`
- `VITE_SOCKET_URL` default: derived from `VITE_API_URL`

## 3) Start the app

### Option A: Docker Compose (full stack)

```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api`
- PostgreSQL: `localhost:5432`

### Option B: Local development

Start PostgreSQL first, then:

```bash
cd backend
npm run start:dev
```

In another terminal:

```bash
cd frontend
npm run dev
```

## Database and schema description

The project uses PostgreSQL with TypeORM entities and migration files under `backend/src/database/migrations`.

Main tables:

### Identity and auth
- `users`
  - profile + role (`admin`, `employee`, `customer`)
  - refresh token
  - TOTP fields
  - password reset metadata
  - social identity fields

### Inventory domain
- `categories`
- `suppliers`
- `products` (belongs to category)
- `batches` (belongs to product, optional supplier)
- `purchases` + `purchase_items`
- `sales` + `sale_items`
- `sale_item_allocations` (links sale items to source batches for FEFO traceability)
- `sale_returns` + `return_items`
- `stock_movements` (audit log across purchase/sale/return)

### Communication and alerts
- `notifications` (read/resolved state, dedupe keys, metadata)
- `chat_messages` (direct messages)
- `broadcast_messages` (staff announcements with audience roles)

Key relationship highlights:
- One product has many batches.
- One sale has many sale items; each sale item can have many allocations to batches.
- Returns reference original sale items.
- Notifications belong to users and are pushed in real time.

## API endpoints and usage

Base URL: `http://localhost:3000/api`

Authentication:
- Most endpoints require `Authorization: Bearer <accessToken>`.
- Tokens are issued by login/register/refresh endpoints.

### Auth endpoints
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/profile`
- `POST /auth/totp/generate`
- `POST /auth/totp/enable`
- `POST /auth/totp/verify`
- `POST /auth/totp/disable`
- `GET /auth/google`, `GET /auth/google/callback`
- `GET /auth/facebook`, `GET /auth/facebook/callback`
- `GET /auth/instagram`, `GET /auth/instagram/callback`

Example login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Password123!"}'
```

### Dashboard endpoints
- `GET /dashboard/overview`
- `GET /dashboard/catalog`
- `GET /dashboard/reports`

### Users endpoints
- `GET /users`
- `POST /users`

### Inventory endpoints

Categories:
- `GET /inventory/categories`
- `GET /inventory/categories/:categoryId`
- `POST /inventory/categories`
- `PATCH /inventory/categories/:categoryId`
- `DELETE /inventory/categories/:categoryId`

Suppliers:
- `GET /inventory/suppliers`
- `GET /inventory/suppliers/:supplierId`
- `POST /inventory/suppliers`
- `PATCH /inventory/suppliers/:supplierId`
- `DELETE /inventory/suppliers/:supplierId`

Products:
- `GET /inventory/products`
- `GET /inventory/products/:productId`
- `POST /inventory/products`
- `PATCH /inventory/products/:productId`
- `DELETE /inventory/products/:productId`

Batches:
- `GET /inventory/batches`
- `GET /inventory/batches/:batchId`
- `GET /inventory/products/:productId/batches`
- `POST /inventory/batches`
- `PATCH /inventory/batches/:batchId`
- `DELETE /inventory/batches/:batchId`

Purchases:
- `GET /inventory/purchases`
- `GET /inventory/purchases/:purchaseId`
- `POST /inventory/purchases`
- `POST /inventory/purchases/receive`
- `PATCH /inventory/purchases/:purchaseId`
- `DELETE /inventory/purchases/:purchaseId`

Sales:
- `GET /inventory/sales`
- `GET /inventory/sales/:saleId`
- `POST /inventory/sales`
- `POST /inventory/sales/checkout`
- `PATCH /inventory/sales/:saleId`
- `DELETE /inventory/sales/:saleId`

Returns:
- `GET /inventory/returns`
- `GET /inventory/returns/:returnId`
- `POST /inventory/returns`
- `PATCH /inventory/returns/:returnId`
- `DELETE /inventory/returns/:returnId`

Other inventory resources:
- `inventory/purchase-items`
- `inventory/sale-items`
- `inventory/sale-item-allocations`
- `inventory/return-items`
- `inventory/stock-movements`
(each supports standard list/get/create/update/delete routes)

Example receive purchase:

```bash
curl -X POST http://localhost:3000/api/inventory/purchases/receive \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "supplierId":"<uuid>",
    "invoiceNumber":"INV-2026-0001",
    "items":[
      {
        "productId":"<uuid>",
        "batchNumber":"B-APR-01",
        "expiryDate":"2027-04-01",
        "quantity":50,
        "unitCost":4.25
      }
    ]
  }'
```

Example checkout sale:

```bash
curl -X POST http://localhost:3000/api/inventory/sales/checkout \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "items":[
      {"productId":"<uuid>","quantity":2}
    ]
  }'
```

### Notifications endpoints
- `GET /notifications`
- `PATCH /notifications/:notificationId/read`
- `POST /notifications/read-all`

### Messaging REST endpoints
- `GET /messages/contacts`
- `GET /messages/threads`
- `GET /messages/threads/:contactId`
- `GET /messages/broadcasts` (staff)

## Realtime API (Socket.IO)

Namespace: `/realtime`

Client emits:
- `presence.ping`
- `notification.markRead`
- `notification.markAllRead`
- `chat.send`
- `chat.update`
- `chat.delete`
- `chat.markThreadRead`
- `broadcast.send`

Server emits:
- `system.connected`
- `presence.snapshot`, `presence.changed`
- `inventory.changed`
- `analytics.refresh`
- `users.changed`
- `notification.created`, `notification.updated`, `notifications.readAll`
- `chat.message.created`, `chat.message.updated`, `chat.message.deleted`, `chat.thread.read`
- `broadcast.created`

Example realtime effect:
- User A completes a sale.
- Backend recalculates product/batch state.
- If stock falls below threshold, backend creates low-stock notifications.
- Staff clients immediately receive `notification.created` and `inventory.changed` over socket.
- UI updates without page refresh.

## How to run and test the application

### Backend

```bash
cd backend
npm run build
npm run test
npm run test:unit
npm run test:e2e
npm run test:cov
```

### Frontend

```bash
cd frontend
npm run build
npm run preview
```

Notes:
- Frontend currently has no dedicated test script in `package.json`; validation is done via TypeScript build and manual flow checks.
- Backend tests include unit + e2e suites (Jest).

## Quick manual E2E checks

1. Register or login.
2. Open Inventory and create category/supplier/product.
3. Receive stock (`/inventory/purchases/receive`).
4. Complete a sale (`/inventory/sales/checkout`).
5. Observe live inventory/notification updates without refresh.
6. Open Messages and verify live presence + direct messages.
7. Send staff broadcast and verify connected users receive it immediately.

## Production notes

- Set `DATABASE_SYNCHRONIZE=false` in production.
- Use strong JWT secrets and secure SMTP credentials.
- Configure `FRONTEND_URL`, social callback URLs, and CORS correctly.
- Run behind HTTPS and a reverse proxy/load balancer.

## License

This repository currently does not define a license file. Add one before public distribution.
