# Alpha

E-learning platform: **Express + PostgreSQL** backend, **Vite + React** frontend. Runs on **Node.js** with **PostgreSQL** database. Works on **Ubuntu/Linux**, **macOS**, and **Windows**.

## Prerequisites

- **Node.js** (v18 or higher) — [download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **PostgreSQL** (v14 or higher) — [download](https://www.postgresql.org/download/)

### PostgreSQL Setup

PostgreSQL must be **installed and running** on your system before starting the application.

#### Ubuntu/Linux

```bash
# Debian/Ubuntu
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Auto-start on boot
```

#### macOS

```bash
# Using Homebrew
brew install postgresql

# Start PostgreSQL
brew services start postgresql
```

#### Windows

- Download the official PostgreSQL installer from [postgresql.org](https://www.postgresql.org/download/windows/)
- Run the installer and follow the setup wizard
- Remember the password you set for the `postgres` superuser
- PostgreSQL will start automatically

### Verify PostgreSQL Connection

After installation, verify PostgreSQL is accessible:

```bash
# Linux/macOS
psql --version
psql -U postgres -h 127.0.0.1 -c "SELECT version();"

# Windows (using psql from PostgreSQL bin directory, or add it to PATH)
psql --version
psql -U postgres -h 127.0.0.1 -c "SELECT version();"
```

---

## Run Locally (Node.js + PostgreSQL)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd alpha
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env from template
cp .env.example .env
```

Edit `.env` and configure PostgreSQL:

```env
# PostgreSQL credentials (must match your PostgreSQL installation)
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres              # Default PostgreSQL superuser
DB_PASSWORD=your_db_password  # Password set during PostgreSQL installation
DB_NAME=alpha

# Other required settings
JWT_SECRET=your_jwt_secret_min_32_characters_required_change_this_value
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. Initialize Database

The following commands will create and configure your PostgreSQL database:

```bash
# Create the 'alpha' database (if it doesn't exist)
npm run db:setup

# Create tables and schema
npm run db:schema

# Seed initial data (showcase courses, FAQs, etc.)
npm run db:seed
```

### 4. Start Backend

```bash
npm run dev
# Backend runs at http://127.0.0.1:5000 (or your configured PORT)
```

### 5. Frontend Setup (new terminal)

```bash
cd frontend

# Install dependencies
npm install

# Create .env from template (optional)
cp .env.example .env

# Start dev server
npm run dev
# Frontend runs at http://localhost:5173
```

### 6. Access the Application

Open your browser to:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api
- **Health check:** http://localhost:5000/health

### Video uploads

- Only authenticated administrators and instructors can upload videos.
- Supported containers are MP4, WebM, MOV, OGV, MKV, and AVI. The server checks both the declared type and container signature.
- The default maximum upload size is 200 MB. Set `MAX_VIDEO_SIZE_MB` in the backend environment to change it.
- New videos are staged under `backend/private-media/video-temp`, then moved to `backend/private-media/videos` after validation. They are never served through the public `/uploads` directory.
- Video metadata is stored in PostgreSQL in the `media` table; existing course and lesson URL fields remain compatible.
- Application-managed videos are streamed through `/api/uploads/video/:filename` with HTTP range support. Existing external URLs and legacy files remain unchanged.
- Run `npm run db:schema` for a fresh database, or `npm run db:extensions` for an existing database, to apply the media metadata table. `npm run db:migrate` also applies the dedicated video migration.

---

## Database Management

### Database Commands

```bash
cd backend

# Create database if it doesn't exist
npm run db:setup

# Apply schema (tables, indexes, constraints)
npm run db:schema

# Seed showcase courses and initial data
npm run db:seed

# Apply pending numbered/ordered migrations to an existing database
npm run db:migrate

# Run schema + seed together
npm run db:init
```

`db:schema` bootstraps a new database from the base and extension schemas. For
an existing database, `db:migrate` applies the ordered SQL files
(`migration.sql`, `migration-add-tables.sql`, `migration-certificates.sql`, and
`migration-videos.sql`) once each and records them in `schema_migrations`.

### Check Database Status

```bash
# Connect to the database directly
psql -U postgres -h 127.0.0.1 -d alpha

# In psql, common commands:
\dt                    # List tables
\du                    # List users
SELECT version();      # PostgreSQL version
\q                     # Exit psql
```

### Reset Database (DESTRUCTIVE)

```bash
cd backend

# Delete the entire database and recreate it
psql -U postgres -h 127.0.0.1 -c "DROP DATABASE IF EXISTS alpha;"
npm run db:setup
npm run db:schema
npm run db:seed
```

---

## Authentication

### Google Sign-In (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 **Web** client credential
3. Set Authorized origins and redirect URIs:

**For local development:**

- **Authorized JavaScript origins:** `http://localhost:5173`, `http://127.0.0.1:5173`
- **Authorized redirect URIs:** `http://localhost:5173/oauth/google/callback`, `http://127.0.0.1:5173/oauth/google/callback`

**For production:**

- **Authorized JavaScript origins:** `https://your-domain.com`
- **Authorized redirect URIs:** `https://your-domain.com/oauth/google/callback`

4. Copy your **Client ID** and **Client Secret** to backend `.env`:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Password Authentication (Optional)

By default, password login is disabled. To enable:

```env
AUTH_ALLOW_PASSWORD_LOGIN=true
```

Note: This should only be used for development/testing. Production should use OAuth.

---

## Building for Production

### Frontend Build

```bash
cd frontend
npm install
npm run build
# Output: frontend/dist/
```

### Backend Build

```bash
cd backend
npm install
npm run build
# Output: backend/dist/
```

---

## Troubleshooting

### PostgreSQL Connection Failed

**Error:** `Unable to connect to PostgreSQL`

**Solution:**

1. Verify PostgreSQL is running:
   - **Linux:** `sudo systemctl status postgresql`
   - **macOS:** `brew services list | grep postgresql`
   - **Windows:** Check Services (postgresql should be running)

2. Verify credentials in `.env`:

   ```bash
   psql -U postgres -h 127.0.0.1
   ```

3. If password is wrong, reset it (as superuser):
   ```bash
   sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'new_password';"
   ```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::5000`

**Solution:** Either:

1. Stop the process using port 5000: `lsof -i :5000` (macOS/Linux) or Task Manager (Windows)
2. Change the port in `.env`: `PORT=3000`

### Database Setup Hangs

If `npm run db:setup` appears to hang:

1. Press Ctrl+C to cancel
2. Check PostgreSQL status (see above)
3. Verify no firewall is blocking localhost:5432

### API Returns 500 Errors

**Solution:** The database tables may not exist. Run:

```bash
npm run db:schema
npm run db:seed
```

---

## Production Deploy

### Prerequisites

- Server with Node.js, npm, and PostgreSQL installed
- SSL certificates (for HTTPS)
- Reverse proxy (Nginx, Caddy, etc.)

### Deployment Scripts (optional)

Copy templates and edit with your credentials:

```bash
cp deploy-all.sh.example deploy-all.sh && chmod +x deploy-all.sh
cp sync-db.sh.example sync-db.sh && chmod +x sync-db.sh
```

### Systemd Service (Linux)

Example service file: [`deploy/alpha-backend.service.example`](deploy/alpha-backend.service.example)

### Environment Variables

Create `.env` on the server with production values:

```env
DB_HOST=your-db-host
DB_PORT=5432
DB_USER=alpha_user
DB_PASSWORD=strong_password
DB_NAME=alpha
DB_SSL=true                    # For remote managed databases
NODE_ENV=production
JWT_SECRET=long_random_string
GOOGLE_CLIENT_ID=prod_id
GOOGLE_CLIENT_SECRET=prod_secret
CORS_ORIGINS=https://your-domain.com
```

### Build and Deploy

```bash
cd backend
npm install
npm run build
npm run db:schema
npm run db:seed

# Start with Node process manager (PM2, systemd, etc.)
npm start
```

---

## Tech Stack

- **Backend:** Node.js, Express.js, TypeScript, PostgreSQL
- **Frontend:** Vite, React, TypeScript, Tailwind CSS, shadcn-ui
- **Database:** PostgreSQL (v14+)
- **Authentication:** JWT, Google OAuth
- **Deployment:** Docker, Systemd, PM2, or cloud platforms
