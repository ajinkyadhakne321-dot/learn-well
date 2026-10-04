# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

# Learnwell Student Learning Platform

An accessibility-first student learning platform with a React and TypeScript frontend, plus an Express and TypeScript API. Learning content remains sample data; account authentication is backed by PostgreSQL.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- PostgreSQL 13+

## Configure the database

Create a PostgreSQL database named `learnwell`, or use another database and update `DATABASE_URL` below. Copy `.env.example` to `.env`, then set the database connection and a fresh session secret. Keep `.env` private; it is ignored by Git.

For a local PostgreSQL installation, create the database with:

```sh
createdb learnwell
```

```sh
cp .env.example .env
```

Generate a session secret with `openssl rand -base64 48`. Set it as `SESSION_SECRET` in `.env`. For managed PostgreSQL that requires TLS, set `DATABASE_SSL=true`.

Apply the user schema. The PostgreSQL session table is created automatically by the session store.

```sh
npm run db:migrate
```

## Run locally

Start the API and frontend in separate terminals from the project root:

```sh
npm run server:dev
```

```sh
npm run dev
```

Vite proxies `/api` requests to `http://localhost:3001`. Add the frontend origin printed by Vite to `CLIENT_ORIGINS` in `.env` if it is not already listed.

For a production build, run `npm run build`, then start the compiled API with `npm run server:start`. Serve the frontend build from `dist` using a static host or reverse proxy that forwards `/api` to the API server.

## Environment variables

- `NODE_ENV`: `development`, `test`, or `production`.
- `PORT`: API port; defaults to `3001`.
- `DATABASE_URL`: PostgreSQL connection URL.
- `DATABASE_SSL`: set to `true` when the database requires TLS.
- `SESSION_SECRET`: at least 32 characters; keep it only in `.env` or the deployment secret manager.
- `CLIENT_ORIGINS`: comma-separated frontend origins permitted by CORS and auth mutation origin checks.

## Authentication API

- `GET /api/health`: reports API and database status.
- `POST /api/auth/register`: JSON body `{ "name", "email", "password" }`; creates a student and starts a session.
- `POST /api/auth/login`: JSON body `{ "email", "password" }`; starts a session.
- `POST /api/auth/logout`: destroys the current session and clears its cookie; returns `204`.
- `GET /api/auth/me`: returns the signed-in student or `401`.

Passwords are hashed with bcrypt. Session IDs are stored in PostgreSQL and sent only in HttpOnly, SameSite cookies; the browser does not receive a bearer token or server secret. Registration requires a password of at least 12 characters and at most 72 UTF-8 bytes.

## Checks

```sh
npm run build
npm run lint
```

Student pages require a signed-in account. The dashboard, subjects, materials, notes, assignments, quiz, calendar, progress, profile, accessibility settings, and help retain their existing routes and interface. Learning content and progress are still sample/in-memory data; only student accounts and sessions are stored in PostgreSQL.

The interface retains keyboard navigation, visible focus, semantic forms, and screen-reader announcements for authentication errors and pending states. Manual testing with assistive technology and a configured PostgreSQL database is still recommended.
# learn-well
