# Developer Onboarding

This guide gives new contributors the quickest path to understanding PharmaFlow.

## Start Here

1. Read the root `README.md` for the product overview and screenshot gallery.
2. Read `docs/architecture.md` for the system shape.
3. Run the backend and frontend locally.
4. Explore the app with one staff/admin user and one customer user.

## Important Concepts

- The app is role-aware: admin, employee, and customer see different routes.
- The frontend is a React SPA with protected routes and shared shell components.
- The backend is modular NestJS with TypeORM persistence.
- Realtime events are central to the product experience.
- Video calls and meetings are implemented as communication features integrated with auth, realtime, recordings, captions, and notifications.

## Key Frontend Entry Points

- `frontend/src/App.tsx`
- `frontend/src/shared/components/AppShell.tsx`
- `frontend/src/shared/navigation/app-navigation.tsx`
- `frontend/src/features/realtime/context/RealtimeContext.tsx`
- `frontend/src/App.css`

## Key Backend Entry Points

- `backend/src/app.module.ts`
- `backend/src/main.ts`
- `backend/src/features/auth`
- `backend/src/features/inventory`
- `backend/src/features/orders`
- `backend/src/features/messaging`
- `backend/src/features/notifications`
- `backend/src/features/calls`
- `backend/src/features/meetings`
- `backend/src/features/realtime`
- `backend/src/features/dashboard`

## Useful Commands

Frontend:

```bash
cd frontend
npm run dev
npm run build
```

Backend:

```bash
cd backend
npm run start:dev
npm test
```

Docker:

```bash
docker compose up --build
```

## Quality Bar

When changing the project, preserve the existing flows first. Then verify the affected role, route, API calls, realtime behavior, loading state, empty state, and responsive layout.
