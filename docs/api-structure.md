# API Structure

PharmaFlow exposes a practical API surface for operational screens, realtime collaboration, and reporting.

## API Families

- Auth: registration, login, refresh, logout, profile, password reset, TOTP, and social callback support.
- Users: admin-managed user creation and account administration.
- Inventory: products, categories, batches, suppliers, purchases, purchase items, sales, sale items, allocations, returns, and stock movements.
- Dashboard: operational metrics, catalog insights, reporting, trends, and employee analytics.
- Orders: customer orders, delivery drivers, approval/rejection, location sharing, and payment completion.
- Notifications: notification list, read state, and read-all actions.
- Messaging: contacts, direct threads, messages, broadcasts, unread state, and conversation metadata.
- Calls: voice/video call lifecycle, signaling-related records, captions, recordings, and protected downloads.
- Meetings: staff meeting list, creation, joining, leaving, ending, cancellation, notes, captions, recordings, and invitations.

## REST and GraphQL

The project uses both REST and GraphQL:

- REST is used for resource-oriented workflows and media-style actions.
- GraphQL is used by the frontend for application-level queries and mutations.

Both styles share the same authentication and role model.

## Realtime Events

Socket.IO events support:

- Notification delivery
- Message delivery and read updates
- Presence updates
- Inventory and order refresh events
- Analytics refresh events
- Direct call signaling
- Meeting signaling and meeting invitations

Realtime events are scoped to authenticated users and roles.

## Authorization

Customers can access customer-facing catalog, order, message, notification, and account features. Staff users can access operational pharmacy workflows. Admins can access the full platform, including user management.

Calls and meetings are protected by both authentication and participation rules. Staff meetings are limited to admin and employee users.
