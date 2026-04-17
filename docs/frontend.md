# Frontend Documentation

## Overview
The frontend is a React 18 + TypeScript single-page application built with Vite.
It provides role-aware experiences for:

- Admin users
- Employee users
- Customer users

Primary concerns implemented by the frontend:

- Authentication workflows (email/password, social callback, TOTP verification).
- Protected and role-based routing.
- Operational pages for inventory, POS, purchases, orders, messages, and reports.
- Realtime UX for notifications, chat, presence, inventory/analytics refresh, and order events.

## Entry Point and Providers
Source: `frontend/src/main.tsx`

Application root composition:

- `BrowserRouter`
- `AuthProvider`
- `RealtimeProvider`

This means all routed pages share authenticated user state and realtime state.

## Routing Model
Source: `frontend/src/App.tsx`

### Public guest routes

- `/auth/login`
- `/auth/register`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/totp-verify`
- `/auth/social-callback`

Guest routes redirect authenticated users to `/dashboard`.

### Protected routes

- `/dashboard`
- `/messages`
- `/inventory` (admin, employee)
- `/sales` (admin, employee)
- `/purchases` (admin, employee)
- `/reports` (admin, employee)
- `/catalog` (customer)
- `/orders`
- `/settings`

Protected route logic is enforced by `frontend/src/shared/components/ProtectedRoute.tsx`.

## Authentication State Management
Source: `frontend/src/features/auth/context/AuthContext.tsx`

Managed state:

- `user`
- `loading`

Operations:

- `login`
- `register`
- `logout`
- `setAuthTokens`
- `refreshProfile`

Token storage:

- Access and refresh tokens are persisted in local storage.
- On startup, presence of access token triggers profile refresh.

## API Client and Token Refresh
Source: `frontend/src/shared/api/axios.ts`

- `API_URL` from `VITE_API_URL` with default `http://localhost:3000/api`
- `SOCKET_URL` from `VITE_SOCKET_URL` or derived from API URL

Interceptors:

- Request interceptor adds bearer token from local storage.
- Response interceptor handles 401 by posting to `/auth/refresh`, then retries original request.
- On refresh failure, tokens are cleared and user is redirected to login.

## Realtime State and Event Handling
Source: `frontend/src/features/realtime/context/RealtimeContext.tsx`

Realtime provider responsibilities:

- Connection lifecycle and heartbeat.
- Notification list and unread counts.
- Broadcast list and unread messaging indicators.
- Presence snapshots and live updates.
- Toast queue for realtime user feedback.
- Socket-driven messaging operations with ack handling.

Socket connection:

- Connects to `${SOCKET_URL}/realtime`
- Auth payload sends token from local storage
- Uses websocket and polling transports

## Navigation and Application Shell

- Shell UI: `frontend/src/shared/components/AppShell.tsx`
- Role-based nav items: `frontend/src/shared/navigation/app-navigation.tsx`

Navigation is filtered by authenticated user role and includes unread message indicators on the Messages entry.

## Feature-Level Service Layer

Feature services encapsulate API calls:

- Auth: `frontend/src/features/auth/services/auth.service.ts`
- Dashboard: `frontend/src/features/dashboard/services/dashboard.service.ts`
- Inventory: `frontend/src/features/inventory/services/inventory.service.ts`
- Orders: `frontend/src/features/orders/services/orders.service.ts`
- Messages: `frontend/src/features/messaging/services/messages.service.ts`
- Notifications: `frontend/src/features/notifications/services/notifications.service.ts`
- Users admin helpers: `frontend/src/features/users/services/users.service.ts`

## Build and Delivery

- Dev server port configured in `frontend/vite.config.ts` as 5173.
- Production build uses Vite output in `frontend/dist`.
- Container runtime serves static assets through Nginx:
  - Dockerfile: `frontend/Dockerfile`
  - Nginx config: `frontend/nginx.conf`
