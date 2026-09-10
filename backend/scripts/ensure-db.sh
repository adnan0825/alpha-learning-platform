#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-alpha}"
DB_PASSWORD="${DB_PASSWORD:-alpha_password}"
DB_NAME="${DB_NAME:-alpha}"

export PGPASSWORD="$DB_PASSWORD"

echo "=== ensure-db: Checking ${DB_HOST}:${DB_PORT}/${DB_NAME} ==="

run_psql_admin() {
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "$1" 2>/dev/null
}

run_psql_target() {
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "$1" 2>/dev/null
}

run_as_postgres() {
    sudo -u postgres psql -tAc "$1" 2>/dev/null
}

run_as_postgres_db() {
    sudo -u postgres psql -d "$1" -tAc "$2" 2>/dev/null
}

# Step 1: Check if database exists
DB_EXISTS=$(run_psql_admin "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null || echo "")

if [ "$DB_EXISTS" != "1" ]; then
    echo "Database ${DB_NAME} does NOT exist. Creating..."
    CREATED=$(run_psql_admin "CREATE DATABASE ${DB_NAME};" 2>&1 || echo "")

    if [ -z "$CREATED" ] || echo "$CREATED" | grep -qi "error\|denied\|cannot"; then
        echo "   App user lacks CREATEDB. Using postgres superuser..."
        run_as_postgres "CREATE DATABASE ${DB_NAME};" | tail -1
    fi

    run_as_postgres_db "$DB_NAME" "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" >/dev/null
    run_as_postgres_db "$DB_NAME" "GRANT ALL ON SCHEMA public TO ${DB_USER};" >/dev/null
    run_as_postgres "ALTER USER ${DB_USER} CREATEDB;" >/dev/null
    echo "Database ${DB_NAME} created."
else
    echo "Database ${DB_NAME} already exists."
fi

# Step 2: Core tables
TABLES_EXIST=$(run_psql_target "SELECT 1 FROM information_schema.tables WHERE table_name='users' AND table_schema='public'" 2>/dev/null || echo "")

if [ "$TABLES_EXIST" != "1" ]; then
    echo "Core tables missing. Applying schema.sql..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /srv/projects/alpha/backend/src/config/schema.sql 2>&1 | tail -3
    echo "schema.sql applied."
fi

# Step 3: Extension tables
EXT_EXISTS=$(run_psql_target "SELECT 1 FROM information_schema.tables WHERE table_name='settings' AND table_schema='public'" 2>/dev/null || echo "")

if [ "$EXT_EXISTS" != "1" ]; then
    echo "Extension tables missing. Applying schema-extensions.sql..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /srv/projects/alpha/backend/src/config/schema-extensions.sql 2>&1 | tail -3
    echo "schema-extensions.sql applied."
fi

# Step 4: ui_translations
run_psql_target "INSERT INTO settings (key, value) VALUES ('ui_translations', '{}') ON CONFLICT (key) DO NOTHING;" 2>/dev/null || true

# Step 5: Admin user (generate hash via openssl to avoid $ issues)
USER_EXISTS=$(run_psql_target "SELECT 1 FROM users WHERE role IN ('instructor','admin') LIMIT 1" 2>/dev/null || echo "")

if [ "$USER_EXISTS" != "1" ]; then
    echo "No admin/instructor user. Creating fallback..."
    # Generate a bcrypt hash using openssl + python to avoid shell interpolation issues
    HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw(b'seeded-admin-temp', bcrypt.gensalt()).decode())" 2>/dev/null || echo "")
    if [ -n "$HASH" ]; then
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO users (name, email, password, role, provider) VALUES ('System Admin', 'admin@alpha.local', '${HASH}', 'admin', 'local') ON CONFLICT (email) DO NOTHING;" 2>/dev/null || true
        echo "Fallback admin created."
    else
        echo "WARNING: Could not generate password hash. Skipping admin creation."
    fi
fi

# Step 6: Seed courses
echo "Running course seed..."
cd /srv/projects/alpha/backend
npx tsx src/config/seed.ts 2>&1 | grep -E "Seeded|skipped|completed" || true

echo ""
echo "=== Verification ==="
COURSES=$(run_psql_target "SELECT COUNT(*) FROM courses" 2>/dev/null || echo "0")
SETTINGS=$(run_psql_target "SELECT COUNT(*) FROM settings" 2>/dev/null || echo "0")
USERS=$(run_psql_target "SELECT COUNT(*) FROM users" 2>/dev/null || echo "0")

echo "  Courses:  ${COURSES}"
echo "  Settings: ${SETTINGS}"
echo "  Users:    ${USERS}"

if [ "$COURSES" -gt 0 ] && [ "$SETTINGS" -gt 0 ] && [ "$USERS" -gt 0 ]; then
    echo "Database is healthy and fully seeded."
    exit 0
else
    echo "Database is incomplete."
    exit 1
fi
