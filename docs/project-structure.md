# Project Structure

## Top Level

- `compose.yaml`
- `README.md`
- `.env.example`
- `backend/`
- `frontend/`
- `docs/`

## Backend Structure

Root:

- `backend/package.json`
- `backend/jest.config.js`
- `backend/Dockerfile`
- `backend/.env.example`
- `backend/.env.test`

Source:

- `backend/src/main.ts`
- `backend/src/app.module.ts`
- `backend/src/database/`
  - `database.config.ts`
  - `typeorm-cli.config.ts`
  - `migrations/`

Feature slices under `backend/src/features`:

- `auth/`
- `dashboard/`
- `inventory/`
- `mail/`
- `messaging/`
- `notifications/`
- `orders/`
- `realtime/`
- `users/`

Testing:

- `backend/test/e2e/`
- `backend/test/unit/`
- `backend/test/helpers/`

## Inventory Slice Layout (Backend)

Within `backend/src/features/inventory`, structure is grouped by domain component:

- `batches/`
- `categories/`
- `products/`
- `purchase-items/`
- `purchases/`
- `return-items/`
- `sale-item-allocations/`
- `sale-items/`
- `sale-returns/`
- `sales/`
- `stock-movements/`
- `suppliers/`
- `realtime/`

Most components follow a repeating pattern:

- `*.controller.ts`
- `*.service.ts`
- `*.repository.ts`
- `dto/`
- `entities/`

## Frontend Structure

Root:

- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `frontend/index.html`

Source entry:

- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.css`

Feature folders under `frontend/src/features`:

- `auth/`
- `catalog/`
- `dashboard/`
- `inventory/`
- `messaging/`
- `notifications/`
- `orders/`
- `purchases/`
- `realtime/`
- `reports/`
- `sales/`
- `settings/`
- `users/`

Shared cross-feature assets:

- `frontend/src/shared/api/`
- `frontend/src/shared/components/`
- `frontend/src/shared/navigation/`
- `frontend/src/shared/utils/`

## Documentation Structure

The documentation package is organized as:

- `docs/architecture.md`
- `docs/backend.md`
- `docs/frontend.md`
- `docs/api-structure.md`
- `docs/setup-configuration.md`
- `docs/environment-variables.md`
- `docs/key-flows.md`
- `docs/developer-onboarding.md`
- `docs/project-structure.md`
