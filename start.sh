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

# Run database migrations
node_modules/.bin/prisma migrate deploy

# Start the Next.js server
node server.js
