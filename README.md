# PharmaFlow

PharmaFlow is a full-stack pharmacy operations platform for staff, administrators, and customers. It brings pharmacy inventory, sales, purchasing, delivery orders, analytics, realtime messaging, notifications, meetings, and video calls into one role-aware workspace.

The project is implemented as a production-style application using React, TypeScript, NestJS, PostgreSQL, GraphQL, REST APIs, Socket.IO, and WebRTC-oriented communication workflows.

## Product Scope

PharmaFlow supports:

- Secure authentication with JWT access/refresh tokens, social login hooks, password reset, and optional TOTP two-factor authentication.
- Staff and admin workspaces for inventory, batches, categories, purchasing, POS checkout, returns, reporting, users, and settings.
- Customer catalog, cart, order tracking, delivery handoff, and customer-to-pharmacy messaging.
- Realtime notifications, unread counters, targeted notification drawers, and notification center workflows.
- Direct messaging with live presence, read states, broadcasts, message editing/deletion, and staff/customer conversations.
- Voice and video call workflows connected to messaging, including call lifecycle APIs, protected recordings, captions, and signaling.
- Staff meetings with participants, join/leave/end/cancel flows, notes, recordings, captions, and meeting invitations.
- Analytics dashboards for revenue, profit, inventory health, product performance, employee performance, and operational trends.

## Platform Gallery

The images below were captured from the running local platform.

### Access

![Login screen](docs/images/login.png)

### Staff Operations

![Dashboard](docs/images/dashboard.png)

![Inventory management](docs/images/inventory.png)

![Point of sale](docs/images/sales-pos.png)

![Purchases](docs/images/purchases.png)

![Orders](docs/images/orders.png)

![Settings and security](docs/images/settings.png)

### Analytics

![Reports and analytics](docs/images/reports.png)

### Realtime Communication

![Messages workspace](docs/images/messages.png)

![Meetings workspace](docs/images/meetings.png)

![Active meeting room](docs/images/meeting-room-active.png)

![Two-user video call](docs/images/video-call-active.png)

![Notification drawer above dashboard cards](docs/images/notifications-drawer-fixed.png)

### Customer Experience

![Customer catalog](docs/images/customer-catalog.png)

![Customer cart](docs/images/customer-cart.png)

![Customer orders](docs/images/customer-orders.png)

![Customer messaging](docs/images/customer-messages.png)

### Responsive Mobile

![Mobile catalog](docs/images/mobile-catalog.png)

## Experience Highlights

- Staff get a dense operational workspace with persistent navigation, live counters, quick access to notifications, and role-aware pages.
- Customers get a simplified catalog and delivery experience focused on ordering, tracking, and communication.
- Notifications, messages, orders, inventory changes, meetings, and calls are connected through realtime infrastructure.
- Video calls and meetings are treated as first-class collaboration features, not separate prototypes.
- The UI is responsive across desktop and mobile, with polished cards, tables, empty states, forms, focus states, and navigation.

## Architecture

PharmaFlow is organized as two applications:

- `backend/`: NestJS API, GraphQL resolvers, REST controllers, TypeORM persistence, Socket.IO realtime gateway, calls, meetings, notifications, messaging, auth, orders, inventory, dashboard, and user management.
- `frontend/`: React + Vite single-page application with protected routes, role-aware shells, shared components, realtime context, GraphQL/REST clients, and responsive UI.

Core runtime services:

- PostgreSQL stores users, auth metadata, inventory records, orders, messages, notifications, calls, meetings, captions, recordings, and reporting data.
- Socket.IO powers live presence, notifications, messaging, order updates, inventory updates, call signaling, and meeting signaling.
- JWT authentication protects both API requests and realtime connections.

## Local Development

Prerequisites:

- Node.js and npm
- PostgreSQL, or Docker Compose

Typical local startup:

```bash
cd backend
npm install
npm run start:dev
```

```bash
cd frontend
npm install
npm run dev
```

Containerized startup:

```bash
docker compose up --build
```

## Documentation

- [Architecture](docs/architecture.md)
- [Backend](docs/backend.md)
- [Frontend](docs/frontend.md)
- [API Structure](docs/api-structure.md)
- [Key Flows](docs/key-flows.md)
- [Setup and Configuration](docs/setup-configuration.md)
- [Environment Variables](docs/environment-variables.md)
- [Project Structure](docs/project-structure.md)
- [Developer Onboarding](docs/developer-onboarding.md)

## Verification

The frontend production build is expected to pass with:

```bash
cd frontend
npm run build
```

The backend test suite is available with:

```bash
cd backend
npm test
```
