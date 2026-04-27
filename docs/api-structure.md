# API Structure

## Base URL and Conventions

- Base path: `/api`
- Authentication: bearer access token in `Authorization` header for protected routes.
- Validation: DTO validation is globally enabled (whitelist + transform + non-whitelisted rejection).

## Controllers and Route Groups

## Auth
Controller: `backend/src/features/auth/auth.controller.ts`
Base: `/api/auth`

- POST `/register`
- POST `/login`
- POST `/refresh`
- POST `/logout`
- POST `/forgot-password`
- POST `/reset-password`
- GET `/profile`
- POST `/totp/generate`
- POST `/totp/enable`
- POST `/totp/verify`
- POST `/totp/disable`
- GET `/google`
- GET `/google/callback`
- GET `/facebook`
- GET `/facebook/callback`
- GET `/instagram`
- GET `/instagram/callback`

## Dashboard
Controller: `backend/src/features/dashboard/dashboard.controller.ts`
Base: `/api/dashboard`

- GET `/overview`
- GET `/catalog`
- GET `/reports`

## Users
Controller: `backend/src/features/users/users.controller.ts`
Base: `/api/users`

- GET `/`
- POST `/`

## Inventory
Controllers under `backend/src/features/inventory`

### Categories
Base: `/api/inventory/categories`

- GET `/`
- GET `/:categoryId`
- POST `/`
- PATCH `/:categoryId`
- DELETE `/:categoryId`

### Suppliers
Base: `/api/inventory/suppliers`

- GET `/`
- GET `/:supplierId`
- POST `/`
- PATCH `/:supplierId`
- DELETE `/:supplierId`

### Products
Base: `/api/inventory/products`

- GET `/`
- GET `/:productId`
- POST `/`
- PATCH `/:productId`
- DELETE `/:productId`

### Batches
Controller base: `/api/inventory`

- GET `/batches`
- GET `/batches/:batchId`
- GET `/products/:productId/batches`
- POST `/batches`
- PATCH `/batches/:batchId`
- DELETE `/batches/:batchId`

### Purchases
Base: `/api/inventory/purchases`

- GET `/`
- GET `/:purchaseId`
- POST `/`
- POST `/receive`
- PATCH `/:purchaseId`
- DELETE `/:purchaseId`

### Purchase Items
Base: `/api/inventory/purchase-items`

- GET `/`
- GET `/:purchaseItemId`
- POST `/`
- PATCH `/:purchaseItemId`
- DELETE `/:purchaseItemId`

### Sales
Base: `/api/inventory/sales`

- GET `/`
- POST `/`
- POST `/checkout`
- GET `/:saleId`
- PATCH `/:saleId`
- DELETE `/:saleId`

### Sale Items
Base: `/api/inventory/sale-items`

- GET `/`
- GET `/:saleItemId`
- POST `/`
- PATCH `/:saleItemId`
- DELETE `/:saleItemId`

### Sale Item Allocations
Base: `/api/inventory/sale-item-allocations`

- GET `/`
- GET `/:saleItemAllocationId`
- POST `/`
- PATCH `/:saleItemAllocationId`
- DELETE `/:saleItemAllocationId`

### Sale Returns
Base: `/api/inventory/returns`

- GET `/`
- GET `/:returnId`
- POST `/`
- PATCH `/:returnId`
- DELETE `/:returnId`

### Return Items
Base: `/api/inventory/return-items`

- GET `/`
- GET `/:returnItemId`
- POST `/`
- PATCH `/:returnItemId`
- DELETE `/:returnItemId`

### Stock Movements
Base: `/api/inventory/stock-movements`

- GET `/`
- GET `/:stockMovementId`
- POST `/`
- PATCH `/:stockMovementId`
- DELETE `/:stockMovementId`

## Orders
Controller: `backend/src/features/orders/orders.controller.ts`
Base: `/api/orders`

- GET `/`
- GET `/drivers`
- POST `/drivers`
- PATCH `/drivers/:driverId`
- DELETE `/drivers/:driverId`
- POST `/`
- GET `/:orderId`
- POST `/:orderId/approve`
- POST `/:orderId/reject`
- POST `/:orderId/location-shared`
- POST `/:orderId/mark-paid`

## Messages
Controller: `backend/src/features/messaging/messaging.controller.ts`
Base: `/api/messages`

- GET `/contacts`
- GET `/threads`
- GET `/threads/:contactId`
- GET `/broadcasts`

## Calls
Controller: `backend/src/features/calls/calls.controller.ts`
Base: `/api/calls`

- GET `/`
- POST `/`
- GET `/:callId`
- POST `/:callId/accept`
- POST `/:callId/reject`
- POST `/:callId/end`
- POST `/:callId/fail`
- GET `/:callId/recordings`
- POST `/:callId/recordings`
- GET `/recordings/:recordingId/download`
- GET `/:callId/captions`
- POST `/:callId/captions`

## Meetings
Controller: `backend/src/features/meetings/meetings.controller.ts`
Base: `/api/meetings`

All meeting routes require JWT auth and `admin` or `employee` role.

- GET `/eligible-participants`
- GET `/`
- POST `/`
- GET `/:meetingId`
- POST `/:meetingId/join`
- POST `/:meetingId/leave`
- POST `/:meetingId/end`
- POST `/:meetingId/cancel`
- GET `/:meetingId/notes`
- POST `/:meetingId/notes`
- PATCH `/:meetingId/notes/:noteId`
- GET `/:meetingId/recordings`
- POST `/:meetingId/recordings`
- GET `/recordings/:recordingId/download`
- GET `/:meetingId/captions`
- POST `/:meetingId/captions`

## Notifications
Controller: `backend/src/features/notifications/notifications.controller.ts`
Base: `/api/notifications`

- GET `/`
- PATCH `/:notificationId/read`
- POST `/read-all`

## Realtime Socket API
Gateway: `backend/src/features/realtime/realtime.gateway.ts`
Namespace: `/realtime`

### Client events
Defined in `backend/src/features/realtime/realtime.events.ts`:

- `presence.ping`
- `notification.markRead`
- `notification.markAllRead`
- `chat.send`
- `chat.update`
- `chat.delete`
- `chat.markThreadRead`
- `broadcast.send`
- `call.start`
- `call.accept`
- `call.reject`
- `call.end`
- `call.fail`
- `call.signal`
- `meeting.join`
- `meeting.leave`
- `meeting.signal`

### Server events
Defined in `backend/src/features/realtime/realtime.events.ts`:

- `system.connected`
- `presence.snapshot`
- `presence.changed`
- `inventory.changed`
- `analytics.refresh`
- `users.changed`
- `notification.created`
- `notification.updated`
- `notifications.readAll`
- `chat.message.created`
- `chat.message.updated`
- `chat.message.deleted`
- `chat.thread.read`
- `broadcast.created`
- `order.created`
- `order.updated`
- `call.incoming`
- `call.updated`
- `call.lifecycle`
- `call.signal`
- `call.recording.created`
- `meeting.updated`
- `meeting.participant.updated`
- `meeting.signal`
- `meeting.note.created`
- `meeting.note.updated`
- `meeting.recording.created`
- `caption.segment.created`
