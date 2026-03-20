#!/bin/bash

# PreToolUse hook — intercepts `git push` commands run by Claude.
# 1. Runs the unit test suite; if any test fails, blocks the push and asks Claude to fix.
# 2. Checks if prisma/schema.prisma has uncommitted changes; if so, blocks and asks
#    Claude to run /schema_changes to generate any required data migration first.

input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name // empty')
command=$(echo "$input"  | jq -r '.tool_input.command // empty')

# Only fire on Bash tool calls that look like a git push
if [[ "$tool_name" != "Bash" ]] || ! echo "$command" | grep -qE '^\s*git push'; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# ── 1. Check for uncommitted schema changes ──────────────────────────────────
if ! git diff --quiet -- prisma/schema.prisma 2>/dev/null || \
   ! git diff --cached --quiet -- prisma/schema.prisma 2>/dev/null; then
  cat <<'MSG'
⛔ PUSH BLOCKED — prisma/schema.prisma has uncommitted changes.

Before pushing, run /schema_changes to analyse whether these changes require a
data migration. If a migration file is needed, create it under data-migrations/
and stage it along with the schema changes. Then retry the push.
MSG
  exit 2
fi

# ── 2. TypeScript compilation check ─────────────────────────────────────────
echo "[pre-push] Running TypeScript type check…"
tsc_output=$(npx tsc --noEmit 2>&1)
tsc_exit=$?

if [ $tsc_exit -ne 0 ]; then
  echo "$tsc_output"
  cat <<'MSG'

⛔ PUSH BLOCKED — TypeScript compilation errors detected.

Fix all type errors shown above, then retry the push.
MSG
  exit 2
fi

echo "[pre-push] ✓ TypeScript OK."

# ── 3. Run the unit test suite ───────────────────────────────────────────────
echo "[pre-push] Running unit tests…"
test_output=$(npm test -- --reporter=verbose 2>&1)
test_exit=$?

if [ $test_exit -ne 0 ]; then
  echo "$test_output"
  cat <<'MSG'

⛔ PUSH BLOCKED — unit tests are failing.

Fix the failing tests shown above, then retry the push.
Do NOT skip or delete tests to make them pass — fix the underlying code.
MSG
  exit 2
fi

echo "[pre-push] ✓ All tests passed."
exit 0
