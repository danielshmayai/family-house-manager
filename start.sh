#!/bin/sh
set -e

# Remove the broken PostgreSQL migration record if it exists in the DB
# (it was accidentally added and can never run on SQLite)
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$executeRawUnsafe('DELETE FROM _prisma_migrations WHERE migration_name = ?', '20260224220000_postgresql_init')
  .then(() => p.\$disconnect())
  .catch(() => p.\$disconnect());
" 2>/dev/null || true

# Resolve the failed UserTask migration so migrate deploy can re-apply it with fixed SQL.
# The original migration used ALTER TABLE on a table that didn't exist yet, causing it to
# be marked as "failed" in _prisma_migrations. We mark it as rolled-back only if it is
# currently in a failed state (started but not finished and not already rolled-back).
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$executeRawUnsafe(
  \"UPDATE _prisma_migrations SET rolled_back_at = datetime('now') WHERE migration_name = ? AND finished_at IS NULL AND rolled_back_at IS NULL\",
  '20260320000000_add_activity_to_user_task'
)
  .then(() => p.\$disconnect())
  .catch(() => p.\$disconnect());
" 2>/dev/null || true

# Run database schema migrations (DDL)
node_modules/.bin/prisma migrate deploy

# Run data migrations (backward-compatible data upgrades)
node scripts/migrate-data.js

# Start the Next.js server
node server.js
