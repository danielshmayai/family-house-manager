#!/bin/bash

# Read JSON input from stdin (required for Stop hooks)
input=$(cat)

# Prevent recursion
stop_hook_active=$(echo "$input" | jq -r '.stop_hook_active // empty')
if [[ "$stop_hook_active" == "true" ]]; then
  exit 0
fi

# Only run if this is a Prisma project
if [ ! -f "$CLAUDE_PROJECT_DIR/prisma/schema.prisma" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

migrate_status=$(DATABASE_URL="${DATABASE_URL:-file:./prisma/dev.db}" npx prisma migrate status 2>&1)

# Check for unapplied migrations
if echo "$migrate_status" | grep -q "have not yet been applied"; then
  pending=$(echo "$migrate_status" | grep -E "^\s+[0-9]{14}_" | sed 's/^[[:space:]]*//' | tr '\n' ', ' | sed 's/,$//')
  echo "⚠️  Unapplied Prisma migrations: ${pending}. Run: npx prisma migrate deploy" >&2
  exit 2
fi

# Check for schema drift (schema.prisma changed without a migration)
if echo "$migrate_status" | grep -q "schema drift\|not in sync"; then
  echo "⚠️  Prisma schema drift — schema.prisma has changes without a migration. Run: npx prisma migrate dev --name <name>" >&2
  exit 2
fi

exit 0
