#!/usr/bin/env bash
# Starts the local test stack: Postgres (schema + seed + fixtures), PostgREST and the fake backend.
# Needs Postgres 16+ binaries and `postgrest` (PATH or POSTGREST_BIN). Stops everything on exit.
set -euo pipefail
cd "$(dirname "$0")/../.."
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
POSTGREST_BIN="${POSTGREST_BIN:-$(command -v postgrest || echo /opt/pgrst/postgrest)}"
export PG_PORT="${PG_PORT:-54330}"
DIR="${TMPDIR:-/tmp}/freezbee-e2e-pg"
export PG_HOST="$DIR"
if [ "$(id -u)" = 0 ]; then RUN="su postgres -c"; else RUN="bash -c"; fi
# Stop a stack left over from an interrupted run.
[ -d "$DIR/data" ] && $RUN "$PG_BIN/pg_ctl -D $DIR/data -m immediate stop" >/dev/null 2>&1 || true
fuser -k 3001/tcp 54321/tcp >/dev/null 2>&1 || true
rm -rf "$DIR"; mkdir -p "$DIR"
if [ "$(id -u)" = 0 ]; then chown postgres "$DIR"; chmod 755 "$DIR"; fi
$RUN "$PG_BIN/initdb -D $DIR/data -A trust -U postgres >/dev/null && $PG_BIN/pg_ctl -D $DIR/data -o '-p $PG_PORT -k $DIR -c listen_addresses=127.0.0.1' -l $DIR/log -w start >/dev/null"
PGRST_PID=""
cleanup() { [ -n "$PGRST_PID" ] && kill "$PGRST_PID" 2>/dev/null; $RUN "$PG_BIN/pg_ctl -D $DIR/data -m fast stop >/dev/null" || true; rm -rf "$DIR"; }
trap cleanup EXIT INT TERM
P="psql -h $DIR -p $PG_PORT -U postgres -v ON_ERROR_STOP=1 -q"
$P -c "create database crm"
$P -d crm -f tests/db/auth_stub.sql
$P -d crm -f supabase/migrations/20261019000000_init.sql
$P -d crm -f supabase/seed.sql
$P -d crm -f tests/e2e/fixtures.sql

JWT_SECRET="$(node -e "import('./tests/e2e/jwt.mjs').then(m=>console.log(m.JWT_SECRET))")"
PGRST_DB_URI="postgres://authenticator:authenticator@127.0.0.1:$PG_PORT/crm" PGRST_DB_SCHEMAS=public PGRST_DB_ANON_ROLE=anon \
  PGRST_JWT_SECRET="$JWT_SECRET" PGRST_SERVER_PORT=3001 PGRST_LOG_LEVEL=warn "$POSTGREST_BIN" &
PGRST_PID=$!
for _ in $(seq 1 50); do curl -s -o /dev/null http://127.0.0.1:3001/ && break; sleep 0.2; done
node tests/e2e/fake-backend.mjs &
wait $!
