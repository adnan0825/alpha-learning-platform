# Alpha Learning Platform

This repository contains a full-stack learning platform built with an Express.js API, a Vite + React frontend, and a PostgreSQL database. The app includes course browsing, instructor and admin tooling, progress tracking, quizzes, assignments, certificates, and Google-based sign-in.

The code in this repository is the source of truth. The information below matches the actual implementation in the current project rather than the earlier project notes or stale README text.

## Overview

The platform is organized as:

- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript + PostgreSQL
- Auth: JWT-based session tokens plus Google OAuth
- Storage: local filesystem uploads by default; Cloudflare R2 support is available when configured
- Deployment: Render web service for the backend; frontend is a static build served by Nginx in Docker and can be hosted separately

## Architecture

```text
                         ┌─────────────────────────────┐
                         │        Frontend React       │
                         │        frontend/            │
                         │  Vite + TS + Tailwind       │
                         │  React Router               │
                         └──────────────┬──────────────┘
                                        │ HTTP / JSON
                                        │ `/api/*`
                                        ▼
                         ┌─────────────────────────────┐
                         │       Express Backend       │
                         │        backend/             │
                         │  Auth / API / Uploads       │
                         │  Middleware / Services      │
                         └────────────┬───────┬────────┘
                                      │       │
                           SQL / pg   │       │ S3-compatible API
                                      ▼       ▼
                         ┌───────────────┐  ┌────────────────────┐
                         │ PostgreSQL    │  │ Object Storage     │
                         │ schema +      │  │ Cloudflare R2      │
                         │ extensions +  │  │ (production path)  │
                         │ migrations    │  └────────────────────┘
                         └───────────────┘
```

## Features implemented in the current codebase

### Public / unauthenticated

- Landing page and marketing-style homepage
- Public course preview pages
- Public certificate verification page at `/verify/:certificateNumber`
- Google OAuth redirect flow
- Help center and public content sections

### Student features

- Role-based dashboard routing
- Course catalog and course enrollment flow
- My courses and course progress tracking
- Quizzes and quiz submission flow
- Assignments and grade-related views
- Bookmarks, notifications, notes, and learning-path browsing
- Certificates generation and verification
- Leaderboard and analytics views
- Profile page and account session handling

### Instructor features

- Instructor dashboards and revenue/progress views
- Course creation, editing, and course management pages
- Intro video support and upload handling
- Quiz management
- Assignment review flows
- Course announcements

### Administrator features

- Admin dashboard and analytics
- User administration
- Course moderation and management
- Revenue and manual-payment review
- Settings pages, FAQ, appearance, translations, moderation, reports, and logs
- Role-based authorization checks

## Project structure

```text
alpha-learning-platform-main/
├── backend/              # Express + TypeScript + PostgreSQL API
├── frontend/             # React + TypeScript + Vite UI
├── docker-compose.yml
├── render.yaml
├── .env.example
├── .gitignore
└── README.md
```

```
backend/
├── scripts/               # DB/build/operational scripts
├── src/
│ ├── config/              # DB, env, runtime, storage, schema, migrations
│ ├── middleware/          # Auth, authorization, error handling
│ ├── routes/              # API endpoints
│ └── services/            # Business/data logic
├── uploads/               # Runtime uploads
└── private-media/         # Private/application-managed media
```

```
frontend/
├── public/                 # Static hosting assets
└── src/
    ├── pages/              # Route-level pages
    ├── components/         # Reusable feature components
    │   ├── landing/
    │   └── ui/             # shadcn/Radix UI primitives
    ├── contexts/           # Auth + language state
    ├── hooks/
    ├── lib/                # API/service/domain utilities
    ├── assets/
    ├── test/
    ├── App.tsx
    └── main.tsx
```

Key directories:

- `backend/src/config`: database config, schema SQL, migrations, runtime env checks, and storage helpers
- `backend/src/routes`: API routers for auth, courses, progress, uploads, admin, settings, etc.
- `backend/src/services`: business logic and database access abstractions
- `backend/src/middleware`: JWT auth and authorization middleware
- `frontend/src/pages`: route-level pages and dashboard areas
- `frontend/src/components`: UI, forms, layout, and reusable platform widgets
- `frontend/src/lib`: API functions, auth storage, and frontend utilities

## Tech stack

### Frontend

- React 18
- TypeScript
- Vite
- React Router DOM
- Tailwind CSS
- TanStack React Query
- Vitest + Testing Library

### Backend

- Node.js
- TypeScript
- Express.js
- PostgreSQL via `pg`
- JWT for authentication
- Multer for file uploads
- Helmet, CORS, rate limiting
- Google OAuth verification via `google-auth-library`
- Cloudflare R2 support via AWS S3 SDK

### Database

- PostgreSQL
- Schema scripts are bundled in `backend/src/config/*.sql`
- Migrations are tracked in `schema_migrations`

## Prerequisites

The current code expects:

- Node.js
- npm
- PostgreSQL running locally or a reachable PostgreSQL service
- Google OAuth web client configured when using Google sign-in
- Optional: Cloudflare R2 credentials for production media uploads

## Local development

### 1) Clone the repository

```bash
git clone <repository-url>
cd alpha-main
```

### 2) Configure the backend

```bash
cd backend
cp .env.example .env
```

Use values appropriate for your local PostgreSQL setup. The project’s backend `.env.example` is the reference file.

Example:

```env
PORT=3000
HOST=0.0.0.0
JWT_SECRET=replace-with-a-long-random-secret
DATABASE_URL=postgresql://alpha:alpha_password@127.0.0.1:5432/alpha
# or use DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
```

Important notes:

- `JWT_SECRET` is required in production mode and should be a long random value.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are required for Google sign-in.
- Password login is disabled unless `AUTH_ALLOW_PASSWORD_LOGIN=true` is explicitly set.
- `DATABASE_URL` takes precedence over `DB_*` values if it is set.

### 3) Create the database and initialize schema

Run the database setup scripts from the `backend` directory:

```bash
cd backend
npm install
npm run db:setup
npm run db:schema
npm run db:migrate
npm run db:seed
```

Current behavior:

- `db:setup` creates the PostgreSQL database if it does not exist.
- `db:schema` applies the main schema and extension SQL files.
- `db:migrate` applies the numbered migration SQL files in order and records them in `schema_migrations`.
- `db:seed` currently prints a status message and exits; the current implementation does not add user-generated course content automatically.

### 4) Start the backend

```bash
cd backend
npm run dev
```

The default local backend URL is:

- http://127.0.0.1:3000
- health endpoint: http://127.0.0.1:3000/health

### 5) Configure the frontend

```bash
cd frontend
cp .env.example .env
```

Typical values:

```env
VITE_API_URL=/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
# Optional override for local proxy target:
# VITE_PROXY_API_TARGET=http://127.0.0.1:3000
```

### 6) Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server uses port 8080 by default:

- http://localhost:8080

The dev server proxies `/api` and `/uploads` to `http://127.0.0.1:3000` unless `VITE_PROXY_API_TARGET` is overridden.

## Environment variables

The repository contains actual environment-variable references in code and config. The most important values are:

### Backend variables

| Variable                       | Required                     | Used by                  | Notes                                                   |
| ------------------------------ | ---------------------------- | ------------------------ | ------------------------------------------------------- |
| `PORT`                         | No                           | backend runtime          | Default is `3000` in code; `HOST` defaults to `0.0.0.0` |
| `HOST`                         | No                           | backend runtime          | Bind address for the Express app                        |
| `JWT_SECRET`                   | Yes in production            | auth middleware          | Required when `NODE_ENV=production`                     |
| `DATABASE_URL`                 | No                           | PostgreSQL connection    | Overrides `DB_*` if present                             |
| `DB_HOST`                      | No                           | PostgreSQL connection    | Local default: `127.0.0.1`                              |
| `DB_PORT`                      | No                           | PostgreSQL connection    | Local default: `5432`                                   |
| `DB_USER`                      | No                           | PostgreSQL connection    | Local default: `alpha`                                  |
| `DB_PASSWORD`                  | No                           | PostgreSQL connection    | Local default: `alpha_password`                         |
| `DB_NAME`                      | No                           | PostgreSQL connection    | Local default: `alpha`                                  |
| `DB_SSL`                       | No                           | PostgreSQL connection    | Set to `true` for managed Postgres providers            |
| `DB_SSL_REJECT_UNAUTHORIZED`   | No                           | PostgreSQL connection    | Optional TLS setting                                    |
| `GOOGLE_CLIENT_ID`             | Yes for Google sign-in       | Google auth              | Web client ID                                           |
| `GOOGLE_CLIENT_SECRET`         | Yes for Google redirect flow | Google auth exchange     | Secret; never expose publicly                           |
| `GOOGLE_BOOTSTRAP_ADMIN_EMAIL` | No                           | admin bootstrap          | Optional first-user admin promotion                     |
| `CORS_ORIGINS`                 | No                           | Express CORS             | Comma-separated origin list                             |
| `PUBLIC_BASE_URL`              | No                           | generated public URLs    | Used for public asset URL generation                    |
| `RATE_LIMIT_WINDOW_MS`         | No                           | Express rate limits      | Optional tuning                                         |
| `RATE_LIMIT_MAX`               | No                           | Express rate limits      | Optional tuning                                         |
| `AUTH_RATE_LIMIT_WINDOW_MS`    | No                           | auth limit               | Optional tuning                                         |
| `AUTH_RATE_LIMIT_MAX`          | No                           | auth limit               | Optional tuning                                         |
| `AUTH_ALLOW_PASSWORD_LOGIN`    | No                           | `/api/auth/login`        | Only enables email/password auth for local testing      |
| `R2_ENDPOINT`                  | No                           | storage                  | Cloudflare R2 endpoint                                  |
| `R2_REGION`                    | No                           | storage                  | Usually `auto`                                          |
| `R2_ACCESS_KEY_ID`             | No                           | storage                  | Secret                                                  |
| `R2_SECRET_ACCESS_KEY`         | No                           | storage                  | Secret                                                  |
| `R2_BUCKET`                    | No                           | storage                  | Storage bucket name                                     |
| `R2_PUBLIC_URL`                | No                           | public URLs              | Public media origin                                     |
| `MAX_VIDEO_SIZE_MB`            | No                           | video upload validation  | Default `200`                                           |
| `FRONTEND_URL`                 | No                           | certificate generation   | Optional public frontend URL                            |
| `API_URL`                      | No                           | manual payment callbacks | Optional API base URL                                   |

### Frontend variables

| Variable                       | Required             | Used by            | Notes                               |
| ------------------------------ | -------------------- | ------------------ | ----------------------------------- |
| `VITE_API_URL`                 | No                   | API client         | Defaults to `/api`                  |
| `VITE_GOOGLE_CLIENT_ID`        | Yes for Google login | OAuth login button | Public client ID                    |
| `VITE_PROXY_API_TARGET`        | No                   | Vite dev proxy     | Defaults to `http://127.0.0.1:3000` |
| `VITE_HERO_INTRO_VIDEO_URL`    | No                   | landing page video | Optional mock hero video            |
| `VITE_HERO_INTRO_VIDEO_POSTER` | No                   | landing page video | Optional poster image               |

## Database and schema

### Fresh setup

The project is designed around PostgreSQL. The required database is usually named `alpha` unless overridden by `DB_NAME` or `DATABASE_URL`.

```bash
cd backend
npm run db:setup
npm run db:schema
npm run db:migrate
npm run db:seed
```

`db:schema` applies:

- `schema.sql`
- `schema-extensions.sql`

`db:migrate` applies migrations in this order:

1. `migration.sql`
2. `migration-add-tables.sql`
3. `migration-certificates.sql`
4. `migration-videos.sql`
5. `migration-video-progress.sql`

The migration runner records each migration name in a `schema_migrations` table to avoid re-running completed migrations.

### Existing database upgrade

If the project is already running against an existing database, the intended migration flow is:

```bash
cd backend
npm run db:migrate
```

The migrations are designed to be applied once per name.

### Destructive reset

A full reset is destructive and drops the app’s schema data. The project does not ship a built-in reset script. The typical manual reset is:

```bash
psql -U postgres -h 127.0.0.1 -d postgres
DROP DATABASE alpha;
```

Then recreate it:

```bash
cd backend
npm run db:setup
npm run db:schema
npm run db:migrate
```

Do not run destructive resets against a production database.

## Authentication

### JWT and cookies

The backend sets an `alpha_token` cookie with `httpOnly`, `sameSite: "lax"`, and a 7-day max age. JWT tokens are also accepted from the `Authorization: Bearer ...` header.

Middleware in `backend/src/middleware/auth.ts` checks token validity and assigns a user object with `id`, `email`, and `role`.

### Google OAuth

The platform supports Google Sign-In using the OAuth web client flow.

Verified behavior:

- Frontend builds a Google authorization URL with `VITE_GOOGLE_CLIENT_ID` and redirects to `/oauth/google/callback`
- Backend verifies Google ID tokens and also supports the OAuth code exchange flow using `GOOGLE_CLIENT_SECRET`
- User records are created or updated in the `users` table on successful Google login
- The first user may become admin via the `enforce_first_user_admin_role` schema trigger, or admin assignment may be influenced by `GOOGLE_BOOTSTRAP_ADMIN_EMAIL` in deployment config

Local development Google redirect URL pattern:

- http://localhost:8080/oauth/google/callback
- http://127.0.0.1:8080/oauth/google/callback

The project is configured to use Vite port 8080, not 5173, in the frontend config.

### Password auth

Email/password routes exist but they are disabled unless `AUTH_ALLOW_PASSWORD_LOGIN=true` is set explicitly in the backend environment.

That means:

- password signup or login is development/testing-only by default
- production usage is expected to rely on Google sign-in

## File uploads and media

### Upload routes

The API includes these upload routes:

- `POST /api/uploads/image` for image uploads (max 5MB)
- `POST /api/uploads/file` for document files (max 25MB)
- `POST /api/uploads/video` for instructor/admin-managed video uploads (max `MAX_VIDEO_SIZE_MB`, default 200MB)

### Local upload storage

The backend stores uploaded files under:

- `backend/uploads` for general uploads
- `backend/private-media/video-temp` for temporary uploaded videos
- `backend/private-media/videos` for finalized video files

### Production object storage

If `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET` are all configured, the app uses Cloudflare R2 for uploaded video and file content. Otherwise it falls back to local storage and public URLs based on `PUBLIC_BASE_URL` or relative `/uploads` paths.

The storage helper supports:

- public URL generation via `R2_PUBLIC_URL`
- signed URLs via S3 presigner
- local fallback paths when object storage is not configured

### Video access rules

- Video upload requires instructor/admin auth.
- Videos are validated by extension and magic bytes before final storage.
- Protected videos are served via signed URLs and access tokens.
- HTTP range requests are supported for local video streaming (`Accept-Ranges: bytes` and partial content responses).
- External URLs and legacy content are not removed by the code; the app supports both app-managed and legacy URLs.

## API map

The backend mounts these major API routers under `/api`:

- `/api/auth` — login, signup/register, logout, Google auth, profile endpoints
- `/api/users` — user profiles and updates
- `/api/courses` — courses, modules, instructor listings
- `/api/modules` — lesson and module access
- `/api/enrollments` — enrollment handling
- `/api/progress` — learning progress updates
- `/api/quizzes` — quiz retrieval and submissions
- `/api/assignments` — assignment-related routes
- `/api/certificates` — certificate creation and verification support
- `/api/uploads` — image, file, and video upload endpoints
- `/api/analytics` — notes, leaderboard, learning paths, reports
- `/api/discussions` — discussions and replies
- `/api/settings` — appearance, FAQ, translations
- `/api/feedback` — user feedback entry point
- `/api/manual-payments` — manual payment and receipt flows
- `/api/admin` — admin-only management endpoints

The root API health route is:

```bash
GET /health
GET /api
```

## Frontend routing

The frontend uses `BrowserRouter` and route guards. Verified route groups include:

- Public: `/`, `/login`, `/course/:courseId`, `/verify/:certificateNumber`, `/oauth/google/callback`
- Shared authenticated area: `/dashboard`, `/profile`, `/courses`, `/browse`, `/bookmarks`, `/help`, `/notes`, `/notifications`, `/leaderboard`
- Student: `/student/dashboard`, `/student/assignments`, `/student/calendar`, `/certificates`, `/learning-path`
- Instructor: `/instructor/*`
- Admin: `/admin/*`
- Catch-all: `*` -> `NotFound`

The `ProtectedRoute` component redirects unauthenticated users to `/login`.

## Testing and validation

### Frontend

The project defines these frontend scripts in `frontend/package.json`:

```bash
cd frontend
npm run dev
npm run build
npm run build:dev
npm run lint
npm run preview
npm run test
npm run test:watch
```

Verified locally:

- `npm run test` passed: 12 test files, 22 tests passed
- `npm run build` passed
- `npm run lint` currently fails because of existing `@typescript-eslint/no-explicit-any` and related lint issues in older code paths

### Backend

The backend scripts are:

```bash
cd backend
npm run dev
npm run build
npm run start
npm run db:setup
npm run db:schema
npm run db:extensions
npm run db:migrate
npm run db:seed
npm run db:init
```

Verified locally:

- `npm run build` succeeded
- There is no `npm test` script in the backend package.json

## Production build and runtime

### Backend

Production build command:

```bash
cd backend
npm install
npm run build
```

The backend build script copies the TypeScript output and SQL config files into `backend/dist`.

Runtime start:

```bash
cd backend
npm run start
```

This runs:

```bash
node dist/index.js
```

### Frontend

Production build command:

```bash
cd frontend
npm install
npm run build
```

The build output directory is `frontend/dist`.

A preview server can be started with:

```bash
cd frontend
npm run preview
```

## Docker

The repository includes Docker support for both frontend and backend.

### Compose quick start

```bash
cp .env.example .env
# then edit the file as needed if you want to supply DB and OAuth settings

docker compose up --build
```

The docker-compose file defines:

- `postgres` service with a named volume for PostgreSQL state
- `backend` service built from `backend/Dockerfile`
- `frontend` service built from `frontend/Dockerfile` and served by Nginx on port 80 inside the container

The compose file uses environment variables such as:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `CORS_ORIGINS`

## Deployment

The repository is configured for Render in `render.yaml`.

Verified deployment configuration:

- backend web service at `rootDir: backend`
- build command: `npm ci --include=dev && npm run build`
- start command: `npm run start`
- health check: `/health`
- backend public port: `PORT=10000`
- `JWT_SECRET` generated automatically by Render
- `DATABASE_URL` is set externally
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `R2_*` variables are also expected to be set externally

The Render config is a strong hint that the app is intended to run with:

- frontend hosted separately from backend
- backend exposed as an API service
- object storage optional but intended for production media

## Security notes

This project contains sensitive values and local-only files. Keep them out of public repositories.

never commit:

- `.env` files with real secrets
- OAuth client secrets
- database passwords
- R2 access keys
- generated upload directories with private media

The repository’s `.gitignore` explicitly ignores `.env` files and local upload data.

## Troubleshooting

### Database connection failure

Check:

- PostgreSQL is running
- `DATABASE_URL` or `DB_*` values are correct
- the database exists
- the user has permission to connect

Typical command:

```bash
cd backend
npm run db:setup
```

### Port conflicts

- backend default: `3000`
- frontend default: `8080`
- override values using environment variables or Vite config if needed

### CORS issues

Ensure `CORS_ORIGINS` includes the exact frontend origin, especially in production.

### Google OAuth issues

Confirm:

- `GOOGLE_CLIENT_ID` matches the frontend and backend config
- `GOOGLE_CLIENT_SECRET` is set on the backend
- redirect URIs in Google Cloud Console match the actual app URLs
- the frontend is using the correct `VITE_GOOGLE_CLIENT_ID`

### Upload / media issues

If uploads fail:

- verify `MAX_VIDEO_SIZE_MB` if a video is too large
- ensure the app can write to `backend/uploads` and `backend/private-media` directories
- check whether R2 is configured; if not, local file storage is expected

### Build issues

- backend: `npm run build` is the configured production build
- frontend: `npm run build` is the configured production build
- lint is separate and currently reports existing TypeScript ESLint issues in the source tree

---

## Tech Stack

- **Backend:** Node.js, Express.js, TypeScript, PostgreSQL
- **Frontend:** Vite, React, TypeScript, Tailwind CSS, shadcn-ui
- **Database:** PostgreSQL (v14+)
- **Authentication:** JWT, Google OAuth
- **Deployment:** Docker, Systemd, PM2, or cloud platforms
