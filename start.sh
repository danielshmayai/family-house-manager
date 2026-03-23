#!/bin/sh
set -e

log() {
  echo "[start.sh $(date -u +%H:%M:%S)] $*"
}

log "=== STARTUP BEGIN ==="
log "NODE_ENV=$NODE_ENV PORT=$PORT HOSTNAME=$HOSTNAME"
log "DATABASE_URL=$DATABASE_URL"

log "Checking /data volume..."
ls -la /data || log "WARNING: /data is empty or missing"
df -h /data || true

# Remove the broken PostgreSQL migration record if it exists in the DB
# (it was accidentally added and can never run on SQLite)
log "Removing broken PostgreSQL migration record (if exists)..."
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$executeRawUnsafe('DELETE FROM _prisma_migrations WHERE migration_name = ?', '20260224220000_postgresql_init')
  .then(() => { console.log('[cleanup-pg] done'); return p.\$disconnect(); })
  .catch((e) => { console.log('[cleanup-pg] skipped:', e.message); return p.\$disconnect(); });
" || true

# Resolve the failed UserTask migration so migrate deploy can re-apply it with fixed SQL.
# The original migration used ALTER TABLE on a table that didn't exist yet, causing it to
# be marked as "failed" in _prisma_migrations. We mark it as rolled-back only if it is
# currently in a failed state (started but not finished and not already rolled-back).
log "Resolving failed UserTask migration (if needed)..."
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$executeRawUnsafe(
  \"UPDATE _prisma_migrations SET rolled_back_at = datetime('now') WHERE migration_name = ? AND finished_at IS NULL AND rolled_back_at IS NULL\",
  '20260320000000_add_activity_to_user_task'
)
  .then((count) => { console.log('[fix-migration] rows updated:', count); return p.\$disconnect(); })
  .catch((e) => { console.log('[fix-migration] skipped:', e.message); return p.\$disconnect(); });
" || true

# Run database schema migrations (DDL)
log "Running prisma migrate deploy..."
node_modules/.bin/prisma migrate deploy
log "prisma migrate deploy complete"

# Run data migrations (backward-compatible data upgrades)
log "Running data migrations..."
node scripts/migrate-data.js
log "Data migrations complete"

# Start the Next.js server
log "Starting Next.js server on $HOSTNAME:$PORT..."
exec node server.js
