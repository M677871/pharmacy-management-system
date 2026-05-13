# Project Structure

PharmaFlow is organized as a two-application repository with shared documentation and local orchestration files.

## Root

- `README.md`: product overview, screenshot gallery, and documentation index.
- `compose.yaml`: local container orchestration.
- `.env.example`: root-level environment template for local services.
- `docs/`: high-level product and technical documentation.
- `docs/images/`: screenshots captured from the running platform.

## Backend

- `backend/src/`: NestJS source code.
- `backend/src/features/`: product domains such as auth, inventory, dashboard, orders, messaging, notifications, calls, meetings, realtime, and users.
- `backend/src/database/`: database configuration and migrations.
- `backend/test/`: unit and end-to-end tests.
- `backend/storage/`: local storage area for uploaded recordings.

## Frontend

- `frontend/src/App.tsx`: route map and protected route composition.
- `frontend/src/App.css`: global product styling and responsive UI system.
- `frontend/src/app/`: Redux store and typed hooks.
- `frontend/src/features/`: page and feature modules for auth, dashboard, inventory, sales, purchases, reports, catalog, orders, messaging, meetings, notifications, settings, calls, and realtime.
- `frontend/src/shared/`: shared API clients, components, icons, navigation, charts, and formatting utilities.

## Documentation

The docs are intentionally high level. They explain the product, architecture, APIs, setup, and workflows without duplicating every implementation detail from the source code.
