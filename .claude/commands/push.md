Run full pre-deploy checks, commit all changes, and push to master. Master deploys directly to production on Fly.io — this command is the single safe path from local changes to production.

## Step 1 — Safety gate (abort if anything fails)

Run all checks in parallel:

```bash
npx tsc --noEmit
npm test
npx prisma migrate status
```

If **any check fails**, stop immediately. Report what failed and do NOT proceed to commit or push.

If schema.prisma was modified, also run:
```bash
git diff HEAD -- prisma/schema.prisma
```
Verify no dangerous changes (NOT NULL without default, DROP COLUMN, missing migration file).

## Step 2 — Show what will be committed

```bash
git diff --stat
git status --short
```

Summarise the change set in plain English (e.g. "3 files changed: new wallet API, updated tests, i18n fix").

## Step 3 — Generate a commit message

Write a conventional commit message based on the actual diff:

- `feat:` — new feature or capability
- `fix:` — bug fix
- `test:` — test-only changes
- `chore:` — tooling, config, docs, refactoring with no behaviour change
- `refactor:` — code restructure without new features

Rules:
- Subject line ≤ 72 characters, imperative mood ("Add wallet" not "Added wallet")
- Body: 2–5 bullet points covering the *why* and key technical decisions
- End with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- Do NOT use `--no-verify` or skip hooks

## Step 4 — Stage, commit, push

```bash
git add -A
git commit -m "<generated message>"
git push origin master
```

If the pre-commit hook fails, fix the issue and retry — do NOT bypass with `--no-verify`.

## Step 5 — Confirm deployment

After a successful push:
```bash
flyctl status --app family-house-manager
```

Report the deploy status (running / deploying / failed) and the commit SHA that triggered it.

## Output format

```
✅ TypeScript — clean
✅ Tests — 100/100 passed
✅ Migrations — 12/12 applied, no drift
✅ Schema — no dangerous changes

📦 Committing: <subject line>
🚀 Pushed → master (<short sha>)
🛫 Fly.io deploy triggered — status: <status>
```

If anything goes wrong at any step, stop and report clearly what failed and what to fix before retrying.
