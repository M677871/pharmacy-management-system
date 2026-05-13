# Backend

The backend is a NestJS application that provides the business API, persistence layer, security model, realtime gateway, and communication workflows for PharmaFlow.

## Responsibilities

- Authenticate users and issue JWT access/refresh tokens.
- Enforce role-based access for admins, employees, and customers.
- Manage inventory, categories, products, batches, suppliers, purchases, sales, returns, and stock movements.
- Support customer catalog orders, assignment, approval/rejection, delivery handoff, and payment completion.
- Produce dashboard and reporting data for operations, revenue, profit, products, and employee performance.
- Deliver realtime notifications, unread counters, presence, messaging, calls, and meeting events.
- Store and protect call/meeting recordings and captions.

## Main Modules

- Auth: login, registration, refresh tokens, logout, password reset, TOTP, social auth hooks.
- Users: admin-managed user creation and profile-safe user data.
- Inventory: products, categories, batches, suppliers, purchases, sales, allocations, returns, and stock movements.
- Orders: customer orders, assignment to online staff, delivery drivers, approval/rejection, location sharing, and payment completion.
- Dashboard: metrics, trends, catalog insights, reporting, and employee analytics.
- Notifications: persisted notifications, read states, and realtime delivery.
- Messaging: contacts, direct threads, broadcasts, message states, and presence.
- Calls: direct voice/video call lifecycle, signaling, recordings, and captions.
- Meetings: staff meetings, participants, notes, recordings, captions, and invitations.
- Realtime: Socket.IO gateway, user/role rooms, and event fan-out.

## API Style

The backend exposes both REST endpoints and GraphQL operations. REST is used heavily for operational resources and media-style actions; GraphQL is used by the frontend for typed application queries and mutations.

## Data Model

PostgreSQL stores the durable state for the platform. TypeORM entities model the major business areas: users, inventory, orders, sale allocations, messages, notifications, calls, meetings, captions, recordings, and reporting source data.

## Security

The backend protects workflows with:

- JWT access tokens
- Refresh token rotation and storage checks
- Role guards
- DTO validation
- TOTP setup and verification
- Protected recording download endpoints
- Authenticated realtime socket handshakes

## Realtime Backend

The Socket.IO gateway is used for operational events and collaboration features. It supports targeted user events, role-scoped events, live presence, notifications, messaging, calls, and meetings.
