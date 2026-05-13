# Setup and Configuration

This document summarizes local setup for running PharmaFlow.

## Prerequisites

- Node.js and npm
- PostgreSQL, or Docker Compose
- Backend and frontend environment files

## Backend

```bash
cd backend
npm install
npm run start:dev
```

The backend normally runs on:

```text
http://localhost:3000
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend normally runs on:

```text
http://localhost:5173
```

## Docker Compose

From the repository root:

```bash
docker compose up --build
```

## Runtime Configuration

The backend reads database, JWT, OAuth, mail, recording, translation, and frontend URL settings from environment variables.

The frontend reads API, GraphQL, and socket URLs from Vite environment variables.

## Verification

Frontend production build:

```bash
cd frontend
npm run build
```

Backend tests:

```bash
cd backend
npm test
```
