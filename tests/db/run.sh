#!/usr/bin/env bash
# Runs the schema + privacy checks on a throwaway local Postgres (16+).
# Usage: tests/db/run.sh   (needs initdb/pg_ctl on PATH or PG_BIN set)
set -euo pipefail
cd "$(dirname "$0")/../.."
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
DIR="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
if [ "$(id -u)" = 0 ]; then RUN="su postgres -c"; chown postgres "$DIR"; else RUN="bash -c"; fi
$RUN "$PG_BIN/initdb -D $DIR/data -A trust -U postgres >/dev/null && $PG_BIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR' -l $DIR/log -w start >/dev/null"
trap '$RUN "$PG_BIN/pg_ctl -D $DIR/data -m fast stop >/dev/null"; rm -rf "$DIR"' EXIT
P="psql -h $DIR -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$P -c "create database crm"
$P -d crm -f tests/db/auth_stub.sql
for f in supabase/migrations/*.sql; do $P -d crm -f "$f"; done
$P -d crm -f supabase/seed.sql
$P -d crm -f tests/db/rls_test.sql
