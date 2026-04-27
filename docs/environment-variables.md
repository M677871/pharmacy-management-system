# Environment Variables

This document lists environment variables present in repository configuration and runtime code.

## Root-level Compose Variables
Defined in `.env.example` and consumed by `compose.yaml`.

Database and ports:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `BACKEND_PORT`
- `FRONTEND_PORT`

Cross-service URLs:

- `FRONTEND_URL`
- `ALLOWED_ORIGINS`
- `FRONTEND_RESET_PASSWORD_URL`
- `VITE_API_URL`
- `VITE_SOCKET_URL`

Backend runtime toggles:

- `DATABASE_SYNCHRONIZE`

JWT:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRATION`
- `JWT_REFRESH_EXPIRATION`

OAuth:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `FACEBOOK_CLIENT_ID`
- `FACEBOOK_CLIENT_SECRET`
- `FACEBOOK_CALLBACK_URL`
- `INSTAGRAM_CLIENT_ID`
- `INSTAGRAM_CLIENT_SECRET`
- `INSTAGRAM_CALLBACK_URL`

## Backend Variables
Primary template: `backend/.env.example`

Application:

- `PORT`
- `HOST`
- `NODE_ENV`

Database:

- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`
- `DATABASE_SYNCHRONIZE`

JWT:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRATION`
- `JWT_REFRESH_EXPIRATION`

OAuth callbacks and credentials:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `FACEBOOK_CLIENT_ID`
- `FACEBOOK_CLIENT_SECRET`
- `FACEBOOK_CALLBACK_URL`
- `INSTAGRAM_CLIENT_ID`
- `INSTAGRAM_CLIENT_SECRET`
- `INSTAGRAM_CALLBACK_URL`

Frontend callback/cors integration:

- `FRONTEND_URL`
- `ALLOWED_ORIGINS`
- `FRONTEND_RESET_PASSWORD_URL`

SMTP/mail:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

Password reset:

- `PASSWORD_RESET_MODE`
- `PASSWORD_RESET_TOKEN_TTL_MINUTES`
- `PASSWORD_RESET_OTP_LENGTH`
- `PASSWORD_RESET_OTP_TTL_MINUTES`
- `PASSWORD_RESET_OTP_MAX_ATTEMPTS`
- `PASSWORD_RESET_EXPOSE_OTP`

Realtime communication:

- `RECORDINGS_STORAGE_DIR`
- `MAX_RECORDING_UPLOAD_BYTES`
- `TRANSLATION_PROVIDER`
- `TRANSLATION_API_URL`
- `TRANSLATION_API_KEY`

## Backend Test Variables
Defined in `backend/.env.test`.

Includes:

- Test port and node env
- Separate test database credentials (`pharmacy_test`)
- Test JWT secrets
- Test OAuth placeholders
- `FRONTEND_URL`

## Frontend Variables

Consumed from runtime code (`frontend/src/shared/api/axios.ts`, `frontend/src/features/auth/components/SocialLoginButtons.tsx`):

- `VITE_API_URL`
- `VITE_SOCKET_URL`
- `VITE_RTC_ICE_SERVERS`

Observed frontend env file:

- `frontend/.env` contains `VITE_API_URL`.

Fallback behavior:

- If `VITE_API_URL` is absent, the frontend build/runtime fails with a clear configuration error.
- If `VITE_SOCKET_URL` is absent, socket base is derived from API URL by removing `/api`.
- `VITE_RTC_ICE_SERVERS` may contain a JSON array of WebRTC ICE server objects. Keep TURN credentials out of source and inject them through environment configuration.

## Security Requirements

- `ALLOWED_ORIGINS` and `FRONTEND_URL` must never contain `*`.
- `DATABASE_SYNCHRONIZE` must be `false` in production.
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be strong random values. Production startup rejects known placeholder values and short secrets.
- Real `.env` files are ignored by Git. Keep secrets in deployment secret storage and only commit `.env.example` templates.
- `compose.yaml` uses required-variable substitution for sensitive settings instead of insecure defaults.

## Realtime Communication Notes

- Recordings are stored as private server files under `RECORDINGS_STORAGE_DIR` and are downloaded only through authenticated API routes that re-check call or meeting membership.
- `TRANSLATION_PROVIDER=none` disables translation gracefully. `generic-http` sends translation requests to `TRANSLATION_API_URL` with `TRANSLATION_API_KEY` as a bearer token and expects a JSON response with `translatedText`.

## Notes on Resolution

- Runtime backend config uses Nest `ConfigService` and loaded env files.
- TypeORM CLI config explicitly loads `.env` or `.env.test` depending on `NODE_ENV`.
- Docker Compose passes or defaults many variables at service startup.
