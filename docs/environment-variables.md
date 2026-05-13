# Environment Variables

PharmaFlow is configured through environment variables so local, containerized, and production deployments can use different infrastructure without changing source code.

## Backend Groups

- Server: port, host, allowed frontend origins, and environment mode.
- Database: PostgreSQL host, port, username, password, database name, and synchronization behavior.
- JWT: access secret, refresh secret, access lifetime, and refresh lifetime.
- OAuth: Google, Facebook, and Instagram client IDs, secrets, and callback URLs.
- Mail: SMTP host, port, user, password, sender, and transport mode.
- Password reset: reset mode, token TTL, OTP length, OTP TTL, attempt limits, and optional OTP exposure for development.
- Recordings: storage directory and upload size limits.
- Translation and captions: optional provider URL and API key.

## Frontend Groups

- `VITE_API_URL`: backend REST API base URL.
- `VITE_GRAPHQL_URL`: GraphQL endpoint override when different from the API default.
- `VITE_SOCKET_URL`: Socket.IO backend URL override when different from the API default.

## Templates

Use these templates as the source of truth for local setup:

- Root: `.env.example`
- Backend: `backend/.env.example`
- Frontend: `frontend/.env`

## Security Note

Secrets should stay out of committed documentation. Use local `.env` files or deployment secrets for real credentials.
