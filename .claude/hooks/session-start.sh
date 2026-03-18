#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "==> Installing npm dependencies..."
cd "$CLAUDE_PROJECT_DIR"
npm install --legacy-peer-deps

echo "==> Setting up DATABASE_URL..."
if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="file:./prisma/dev.db"
  echo "export DATABASE_URL=\"file:./prisma/dev.db\"" >> "$CLAUDE_ENV_FILE"
fi

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Applying pending schema migrations..."
npx prisma migrate deploy

echo "==> Session start complete."
