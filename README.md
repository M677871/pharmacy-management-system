# PharmaFlow / pharmacy-management-system

full-stack pharmacy workflow built on NestJS + React.

## Inventory + POS slice

This repo now includes an end-to-end inventory workflow after authentication:

- create categories, suppliers, and products
- receive stock into expiry-aware batches
- sell products through a minimal POS screen
- allocate stock with FEFO on the backend
- record stock changes through `stock_movements`
- process constrained returns against original sales

## Run locally

### Docker

```bash
docker compose up --build
```

### Without Docker

Backend:

```bash
cd backend
npm install
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Migrations

The existing dev setup still works with `DATABASE_SYNCHRONIZE=true`, but a reviewable migration and CLI config are now included.

Run migrations from `backend/`:

```bash
npm run migration:run
```

Revert the last migration:

```bash
npm run migration:revert
```

Show pending/applied migrations:

```bash
npm run migration:show
```

For a migration-driven environment, set:

```bash
DATABASE_SYNCHRONIZE=false
```

## Test the workflow

Backend inventory e2e:

```bash
cd backend
npx jest test/e2e/inventory.e2e.spec.ts --runInBand --verbose
```

Full backend e2e suite:

```bash
cd backend
npm run test:e2e
```

Frontend production build:

```bash
cd frontend
npm run build
```

## Password reset configuration

The forgot/reset password flow now switches by environment:

- non-production defaults to OTP reset by email
- production defaults to reset-link emails
- `PASSWORD_RESET_MODE` can override the default when you need to test a specific flow

Required backend mail variables:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASS=your-gmail-app-password
MAIL_FROM=your-gmail-address@gmail.com
FRONTEND_RESET_PASSWORD_URL=http://localhost:5173/auth/reset-password
PASSWORD_RESET_MODE=
PASSWORD_RESET_TOKEN_TTL_MINUTES=60
PASSWORD_RESET_OTP_LENGTH=6
PASSWORD_RESET_OTP_TTL_MINUTES=10
PASSWORD_RESET_OTP_MAX_ATTEMPTS=5
PASSWORD_RESET_EXPOSE_OTP=true
```

Notes:

- `SMTP_PASS` must be a Gmail app password, not your regular Gmail password.
- `MAIL_FROM` should match the Gmail sender you configured.
- In development and test mode, the backend sends an OTP email and also returns the OTP in the API response when `PASSWORD_RESET_EXPOSE_OTP=true`.
- In production or `PASSWORD_RESET_MODE=link`, the backend sends a tokenized reset link and never exposes the token in the API response.
- Automated backend tests use an in-memory mail transport; real SMTP delivery is used when `MAIL_TRANSPORT=smtp` or when running outside the test environment with SMTP variables configured.

Manual OTP flow check:

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"user@example.com\"}"
```

```bash
curl -X POST http://localhost:3000/api/auth/reset-password ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"user@example.com\",\"token\":\"<otp-code>\",\"newPassword\":\"NewSecure1!\"}"
```

Manual reset-link flow check:

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"user@example.com\"}"
```

```bash
curl -X POST http://localhost:3000/api/auth/reset-password ^
  -H "Content-Type: application/json" ^
  -d "{\"token\":\"<reset-token>\",\"newPassword\":\"NewSecure1!\"}"
```

## Manual demo flow

1. Sign in with a staff account.
2. Open `/inventory`.
3. Create a category, supplier, and product.
4. Receive stock with a batch number, expiry date, quantity, and unit cost.
5. Add the product to the cart and checkout.
6. Load the sale ID in the return panel and process a partial return.

## Current assumption

Inventory endpoints are guarded for `admin` and `employee` roles. The repo still does not include a dedicated role-management UI, so for manual testing you need a staff account already present or promoted in the database.
