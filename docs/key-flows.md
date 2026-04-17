# Key Flows

This document describes major runtime flows implemented in source code.

## Authentication Flow
Source: `backend/src/features/auth/auth.service.ts`, `backend/src/features/auth/auth.controller.ts`

1. User submits credentials to `POST /api/auth/login`.
2. Local strategy validates email/password.
3. If TOTP is enabled:
   - Response includes `requiresTwoFactor: true` and a short-lived temp token.
4. Otherwise:
   - Access and refresh tokens are issued.
   - Refresh token hash is persisted for token rotation checks.
5. Frontend stores tokens and hydrates profile via `GET /api/auth/profile`.

Refresh flow:

1. Frontend interceptor receives 401.
2. Calls `POST /api/auth/refresh` with refresh token.
3. Backend validates token signature and stored hash.
4. New token pair is issued and stored client-side.

Logout flow:

1. Client calls `POST /api/auth/logout`.
2. Backend clears stored refresh token hash.
3. Frontend clears local tokens.

## Password Reset Flow
Source: `backend/src/features/auth/password-reset`

The mode is selected by `PASSWORD_RESET_MODE` (or environment fallback).

### OTP mode

1. `POST /api/auth/forgot-password` with email.
2. Backend creates OTP reset token and expiry.
3. Mail service sends OTP content.
4. `POST /api/auth/reset-password` with email + token + new password.
5. Backend validates expiry/attempts and updates password.

### Link mode

1. `POST /api/auth/forgot-password` with email.
2. Backend creates reset token and reset URL.
3. Mail service sends reset link.
4. `POST /api/auth/reset-password` with token + new password.
5. Backend validates token and updates password.

## TOTP Two-Factor Flow
Source: `backend/src/features/auth/auth.service.ts`

1. Authenticated user calls `POST /api/auth/totp/generate`.
2. Backend generates secret and QR data URL.
3. User confirms authenticator code through `POST /api/auth/totp/enable`.
4. Subsequent login returns temp token when TOTP is enabled.
5. Client finalizes login with `POST /api/auth/totp/verify`.
6. `POST /api/auth/totp/disable` turns TOTP off and clears secret.

## Sales Checkout Allocation Flow
Source: `backend/src/features/inventory/sales/sales.service.ts`, `backend/src/features/inventory/sales/services/allocation.service.ts`

1. Checkout request arrives at `POST /api/inventory/sales/checkout`.
2. Allocation service groups line items by product.
3. Eligible batches are selected with constraints:
   - stock available (`quantityOnHand > quantityReserved`)
   - not expired (`expiryDate >= saleDate`)
4. Batch order for allocation:
   - earliest expiry date first
   - then received date
   - then creation time
5. Transaction creates sale, sale items, sale-item allocations, stock movements.
6. Batch on-hand quantities are decremented.
7. Inventory realtime event is emitted.

## Purchase Receiving Flow
Source: `backend/src/features/inventory/purchases/purchases.service.ts`

1. Receive request hits `POST /api/inventory/purchases/receive`.
2. Transaction creates purchase and purchase items.
3. Batch records are created/updated with received quantities.
4. Stock movement records are created as stock-in events.
5. Inventory change event is published for live clients.

## Return Processing Flow
Source: `backend/src/features/inventory/sale-returns/sale-returns.service.ts`

1. Return request enters `POST /api/inventory/returns`.
2. Transaction validates returnable quantities against sale items.
3. Return and return-item records are created.
4. Stock is restored to batches according to allocation mapping.
5. Stock movement records are persisted with return reference.
6. Inventory realtime change event is emitted.

## Catalog Order Lifecycle
Source: `backend/src/features/orders/orders.service.ts`

1. Customer creates order via `POST /api/orders`.
2. Order starts as `pending_assignment`.
3. Assignment worker (`assignPendingOrders`) selects online employees and transitions to `pending_review`.
4. Assigned employee approves (`POST /api/orders/:id/approve`) or rejects (`POST /api/orders/:id/reject`).
5. On approval, stock is reserved into order-item allocations.
6. Customer can mark location shared (`POST /api/orders/:id/location-shared`) once approved.
7. Employee marks payment complete (`POST /api/orders/:id/mark-paid`):
   - creates sale and sale item records
   - converts reserved stock to stock-out
   - transitions order to `completed`

Notifications and automated direct messages are emitted at assignment, approval, rejection, and completion milestones.

## Messaging and Notification Flow
Sources:

- Messaging controller/service: `backend/src/features/messaging`
- Notification controller/service: `backend/src/features/notifications`
- Realtime gateway: `backend/src/features/realtime/realtime.gateway.ts`

Direct messages:

- Sent via socket event `chat.send`.
- Persisted as chat messages.
- Broadcast to relevant users using realtime events.

Broadcasts:

- Sent via socket event `broadcast.send`.
- Persisted as broadcast messages.
- Converted into notifications for target audiences.

Notification read state:

- REST endpoints for single and bulk read.
- Realtime socket equivalents:
  - `notification.markRead`
  - `notification.markAllRead`

## Frontend Auth + Realtime UX Flow
Sources:

- Auth context: `frontend/src/features/auth/context/AuthContext.tsx`
- Axios client: `frontend/src/shared/api/axios.ts`
- Realtime provider: `frontend/src/features/realtime/context/RealtimeContext.tsx`

1. App bootstraps providers and loads auth state.
2. Protected routes gate access based on user and role.
3. Realtime provider connects after user becomes available.
4. Initial refresh pulls notifications/broadcasts/thread state.
5. Incoming socket events update in-memory state and trigger UI toasts.
