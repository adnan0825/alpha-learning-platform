#!/usr/bin/env bash
# One-time setup: install PostgreSQL (Arch Linux), start service, create role + database for Alpha.
# Run: cd backend && npm run db:setup
set -euo pipefail

if [[ "${EUID}" -ne 0 ]] && ! sudo -n true 2>/dev/null; then
  echo "This script uses sudo. Enter your password when asked."
fi

if command -v pacman >/dev/null 2>&1; then
  echo "==> Installing postgresql (Arch)..."
  sudo pacman -S --needed --noconfirm postgresql
fi

PGROOT="${PGROOT:-/var/lib/postgres}"
PGDATA="${PGDATA:-${PGROOT}/data}"

# Ensure postgres owns the tree (Arch tmpfiles + initdb edge cases)
sudo install -d -o postgres -g postgres -m 0700 "${PGROOT}"

# initdb refuses a non-empty directory; partial failed inits leave junk without PG_VERSION
if sudo test -f "${PGDATA}/PG_VERSION"; then
  echo "==> PostgreSQL cluster already present at ${PGDATA}"
elif ! sudo test -d "${PGDATA}" || sudo test -z "$(sudo ls -A "${PGDATA}" 2>/dev/null || true)"; then
  echo "==> Initializing database cluster at ${PGDATA}..."
  # Arch recommends C.UTF-8 to avoid glibc/ICU collation drift (see Arch Wiki)
  sudo -u postgres initdb --locale=C.UTF-8 --encoding=UTF8 -D "${PGDATA}"
else
  echo "ERROR: ${PGDATA} is not empty but has no PG_VERSION (broken or partial init)."
  echo "Stop Postgres, then remove the cluster and re-run (destructive):"
  echo "  sudo systemctl stop postgresql 2>/dev/null || true"
  echo "  sudo rm -rf ${PGDATA:?}/*"
  echo "  npm run db:setup"
  exit 1
fi

echo "==> Fixing ownership on ${PGROOT}..."
sudo chown -R postgres:postgres "${PGROOT}"
sudo chmod 0700 "${PGDATA}" 2>/dev/null || true

echo "==> Verifying data directory (postgresql-check-db-dir)..."
if ! sudo -u postgres /usr/bin/postgresql-check-db-dir "${PGDATA}"; then
  echo "Check failed. See: https://wiki.archlinux.org/title/PostgreSQL"
  exit 1
fi

apply_simple_type_dropin() {
  echo "==> Applying systemd drop-in: Type=simple (fixes many Arch failures with Type=notify)..."
  sudo mkdir -p /etc/systemd/system/postgresql.service.d
  sudo tee /etc/systemd/system/postgresql.service.d/10-alpha-type-simple.conf >/dev/null <<'EOF'
[Service]
Type=simple
EOF
  sudo systemctl daemon-reload
}

try_start_postgres() {
  sudo systemctl enable postgresql
  sudo systemctl reset-failed postgresql 2>/dev/null || true
  sudo systemctl start postgresql
}

# True if any process is listening on TCP port 5432 (not necessarily Arch postgresql.service).
listening_on_5432() {
  command -v ss >/dev/null 2>&1 || return 1
  ss -Hltn 'sport = :5432' 2>/dev/null | grep -q .
}

print_port_5432_hint() {
  echo "What is using 5432:"
  sudo ss -ltnp 2>/dev/null | grep 5432 || ss -ltn 2>/dev/null | grep 5432 || true
  echo ""
  echo "Stop that server (common: Docker  docker ps  then  docker stop <id>), then:"
  echo "  cd backend && npm run db:setup"
}

if sudo systemctl is-active --quiet postgresql 2>/dev/null; then
  echo "==> postgresql.service is already active."
else
  if listening_on_5432; then
    echo "ERROR: TCP port 5432 is already in use, but postgresql.service is not running."
    echo "The Arch package cannot start; pg_isready would lie (it talks to the wrong server)."
    print_port_5432_hint
    exit 1
  fi

  echo "==> Starting PostgreSQL (systemd)..."
  set +e
  try_start_postgres
  rc=$?
  set -e

  if [[ "${rc}" -ne 0 ]]; then
    echo "First start failed. Recent logs:"
    sudo journalctl -u postgresql -n 50 --no-pager || true
    apply_simple_type_dropin
    set +e
    try_start_postgres
    rc=$?
    set -e
    if [[ "${rc}" -ne 0 ]]; then
      echo "Still failing. Full recent logs:"
      sudo journalctl -u postgresql -n 80 --no-pager || true
      exit 1
    fi
  fi
fi

echo "==> Waiting for server to accept connections..."
ready=0
for _ in $(seq 1 40); do
  if pg_isready -h 127.0.0.1 -p 5432 -q 2>/dev/null; then
    ready=1
    break
  fi
  sleep 0.5
done

if [[ "${ready}" -ne 1 ]]; then
  echo "PostgreSQL did not become ready on 127.0.0.1:5432."
  sudo journalctl -u postgresql -n 40 --no-pager || true
  exit 1
fi

if ! sudo systemctl is-active --quiet postgresql 2>/dev/null; then
  echo "ERROR: Something answers on 127.0.0.1:5432, but postgresql.service is not active."
  echo "This script only configures the system PostgreSQL unit; fix the port conflict first."
  print_port_5432_hint
  exit 1
fi

# Local peer auth uses the distro socket, not TCP — must match the running unit.
PG_SOCK_DEFAULT="/run/postgresql/.s.PGSQL.5432"
if ! sudo test -S "${PG_SOCK_DEFAULT}"; then
  echo "ERROR: Unix socket missing at ${PG_SOCK_DEFAULT} (system PostgreSQL is not the process on 5432)."
  print_port_5432_hint
  exit 1
fi

echo "==> Creating role and database (idempotent)..."
# Use local peer/socket (not -h 127.0.0.1) so pg_hba.conf does not need host rules yet
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'alpha') THEN
    CREATE ROLE alpha LOGIN PASSWORD 'alpha_password';
  END IF;
END
$$;
SQL

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='alpha'" | grep -q 1; then
  sudo -u postgres createdb -O alpha alpha
fi

echo "==> Verifying TCP (same path the Node app uses)..."
export PGPASSWORD='alpha_password'
if ! psql -h 127.0.0.1 -p 5432 -U alpha -d alpha -tAc 'SELECT 1' | grep -q 1; then
  echo "TCP login to alpha@127.0.0.1:5432 failed. Check listen_addresses and pg_hba.conf under ${PGDATA}."
  echo "Arch default initdb usually allows 127.0.0.1; see: https://wiki.archlinux.org/title/PostgreSQL"
  exit 1
fi
unset PGPASSWORD

echo ""
echo "PostgreSQL is running. Next:"
echo "  cd backend && npm run db:schema && npm run db:seed"
echo ""
echo "backend/.env should include:"
echo "  DB_HOST=127.0.0.1"
echo "  DB_PORT=5432"
echo "  DB_USER=alpha"
echo "  DB_PASSWORD=alpha_password"
echo "  DB_NAME=alpha"
echo ""
echo "Sign in with Google (configure VITE_GOOGLE_CLIENT_ID + backend GOOGLE_* in .env). db:seed only adds showcase courses if an instructor/admin user exists."
