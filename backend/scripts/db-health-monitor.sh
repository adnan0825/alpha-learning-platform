#!/usr/bin/env bash
# db-health-monitor.sh — Checks if the database is healthy and auto-repairs if not.
# Designed to run via cron every minute, or as a systemd timer.
# Usage: bash scripts/db-health-monitor.sh
#
# If the DB is down, it runs ensure-db.sh to rebuild it automatically.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="/var/log/alpha-db-monitor.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE" 2>/dev/null || echo "$(date '+%Y-%m-%d %H:%M:%S') $1"
}

# Load .env if available
if [ -f "$SCRIPT_DIR/../.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/../.env" | xargs 2>/dev/null || true)
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-alpha}"
DB_PASSWORD="${DB_PASSWORD:-alpha_password}"
DB_NAME="${DB_NAME:-alpha}"

export PGPASSWORD="$DB_PASSWORD"

# Health check: can we query the database?
HEALTHY=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 1" 2>/dev/null || echo "")

if [ "$HEALTHY" != "1" ]; then
    log "❌ Database health check FAILED for ${DB_NAME}@${DB_HOST}:${DB_PORT}. Attempting repair..."
    cd "$SCRIPT_DIR/.."
    bash scripts/ensure-db.sh >> "$LOG_FILE" 2>&1
    log "✅ Repair attempt completed. Check ensure-db output above for details."
else
    # Double-check: do we have courses?
    COURSE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM courses" 2>/dev/null || echo "0")
    if [ "$COURSE_COUNT" -eq 0 ]; then
        log "⚠️  Database is up but has no courses. Running ensure-db to seed..."
        cd "$SCRIPT_DIR/.."
        bash scripts/ensure-db.sh >> "$LOG_FILE" 2>&1
        log "✅ Seed completed."
    fi
    # Silent success — no need to log every minute
fi
