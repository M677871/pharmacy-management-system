# Architecture

PharmaFlow is a production-style full-stack pharmacy platform. The architecture separates the operational API, realtime collaboration layer, and role-aware frontend while keeping the product workflows connected end to end.

## High-Level Topology

- Frontend: React, Vite, TypeScript, GraphQL/REST clients, Socket.IO client, protected routing, and responsive workspace UI.
- Backend: NestJS modules, REST controllers, GraphQL resolvers, TypeORM repositories, Socket.IO gateway, JWT guards, and domain services.
- Database: PostgreSQL for users, inventory, orders, sales, purchases, returns, messages, notifications, calls, meetings, captions, recordings, and analytics data.
- Realtime layer: Socket.IO namespace used for live notifications, presence, messaging, inventory/order updates, video call signaling, and meeting signaling.

## Product Domains

The platform is organized around these domains:

- Identity and security
- Inventory and stock lifecycle
- Purchases and receiving
- POS checkout and returns
- Customer catalog and delivery orders
- Notifications and realtime activity
- Direct messaging and broadcasts
- Voice/video calls
- Staff meetings
- Analytics and reporting
- User and role management

## Role Model

PharmaFlow supports three primary roles:

- Admin: full workspace access, user management, reporting, inventory, sales, purchases, orders, messages, notifications, calls, and meetings.
- Employee: staff operations, inventory, POS, purchases, reports, assigned orders, messages, calls, notifications, and meetings.
- Customer: catalog, cart, order tracking, notifications, account security, and pharmacy messaging.

## Request Lifecycle

1. The frontend sends a REST or GraphQL request with a JWT access token.
2. Backend guards validate authentication and role authorization.
3. DTO validation protects request shape and business boundaries.
4. Domain services apply business rules and persist changes through TypeORM.
5. Realtime events are emitted for affected users or roles.
6. The frontend updates the active workspace through API responses and socket events.

## Realtime Collaboration

Realtime functionality is a core part of the product:

- Personal notifications and unread counters
- Staff/customer messaging
- Presence indicators
- Order assignment and status updates
- Inventory and analytics refresh events
- Voice/video call signaling
- Meeting invitations and meeting-room activity

JWT-authenticated sockets join user and role rooms, which allows the backend to send targeted events without exposing unrelated data.

## Calls and Meetings

The project includes both direct video call workflows and structured staff meetings:

- Calls are tied to direct communication between users and support lifecycle events such as creation, acceptance, rejection, ending, failure, captions, and recordings.
- Meetings support staff collaboration, participant lists, invitations, join/leave/end/cancel actions, notes, captions, and protected recordings.

These features are integrated with auth, roles, notifications, realtime events, and the frontend workspaces.
