Analyze the latest Prisma schema changes in this project and produce any required data migration file.

## Your job

1. Run `git diff HEAD -- prisma/schema.prisma` (and `git diff HEAD~1 -- prisma/schema.prisma` if HEAD has no staged diff) to see exactly what changed.
2. For every change, reason through whether **existing rows in the live database** could be left in a broken or inconsistent state after `prisma migrate deploy` runs on the next deployment.
3. If a data migration is needed, create `data-migrations/NNN_description.js` (where NNN is the next sequential number based on files already in that directory). If no data migration is needed, explain clearly why each change is safe.

## DB architecture reference

**Stack**: SQLite via Prisma ORM. Data migrations run via `scripts/migrate-data.js` immediately after `prisma migrate deploy` on every deployment. Each migration runs exactly once — tracked in `_data_migrations` table.

**Models and their key constraints / defaults**:

- `User` — `approvalStatus` defaults `"APPROVED"`, `role` defaults `"MEMBER"`, `language` defaults `"he"`, `theme` defaults `"light"`, `otpEnabled` defaults `false`. Relations: household (optional), events, financialAssets, financialGoals, notifications, assetSnapshots, tasksAssigned/tasksReceived (UserTask).
- `Household` — has many Users, Categories, Events, Invites, UserTasks.
- `Invite` — belongs to Household; `usedById` is nullable.
- `Category` — `key` is unique (global); `householdId` is nullable (null = global seed category). `isActive` defaults `true`, `position` defaults `0`.
- `Activity` — `key` is unique (global); belongs to Category (cascade delete). `defaultPoints` defaults `10`, `frequency` defaults `"DAILY"`, `isActive` defaults `true`, `requiresNote/Photo` default `false`.
- `Task` — legacy model, `key` unique, no relations enforced via FK in app code.
- `Event` — belongs to User (recordedBy) and Household; `activityId` and `taskId` are nullable; `points` defaults `0`.
- `UserTask` — assigned between two Users within a Household; cascade deletes on User/Household removal.
- `BugReport` — standalone, `resolved` defaults `false`.
- `FinancialAsset` — belongs to User (cascade delete); many optional fields (ticker, quantity, purchasePrice, interestRate, etc.); `currency` defaults `"ILS"`, `isActive` defaults `true`.
- `AssetSnapshot` — belongs to FinancialAsset and User (both cascade delete).
- `FinancialGoal` — belongs to User (cascade delete); `currentAmount` defaults `0`, `isActive` defaults `true`.
- `Notification` — belongs to User (cascade delete); `titleHe`/`messageHe` are nullable (bilingual support); `isRead` defaults `false`.
- `OtpCode` — standalone; `type` defaults `"2fa"` (values: `"2fa"` | `"password-reset"`); `used` defaults `false`.

## Classifying risky schema changes

Treat these as **requiring a data migration**:

| Change type | Risk | Migration needed |
|---|---|---|
| New NOT NULL column with no default | Existing rows get NULL → breaks queries | Backfill with sensible value |
| New NOT NULL column with a default that is wrong for existing rows | Rows get a misleading default | Backfill correct values |
| Column renamed | Existing data stays under old name | Copy old → new, then nullify old if kept nullable |
| Column removed | Data lost if not handled | Rarely needed; confirm intentional |
| Unique constraint added | May fail if duplicates exist | Deduplicate first |
| Enum-like string column added (NOT NULL, no default) | Same as first row | Backfill |
| Relation made required (nullable → non-nullable FK) | Orphaned rows break | Assign or delete orphans |
| `@default` value changed | Only affects new rows — existing rows are safe | No migration needed |
| New nullable column added | Existing rows get NULL — usually fine | Only if NULLs are invalid for app logic |
| New model added | No existing rows | No migration needed |
| Index added | Schema only | No migration needed |

## Data migration file format

```js
// data-migrations/NNN_short_description.js
module.exports = {
  description: 'Human-readable one-liner',

  async up(prisma) {
    // Use prisma.$executeRawUnsafe() for UPDATE/INSERT
    // Use prisma.$queryRawUnsafe() for SELECT
    // Keep idempotent: safe to reason about, even if run twice
  },

  async validate(prisma) {
    // Assert the data is now correct — throw an Error to abort deployment
    // This runs BOTH on first apply AND on every subsequent deploy (as a health check)
  }
}
```

**Rules**:
- `validate()` is mandatory — the runner will exit(1) if it is missing.
- Use `$executeRawUnsafe` / `$queryRawUnsafe` for raw SQL (Prisma Client types may not reflect the new schema yet at migration time).
- File name prefix NNN must be zero-padded to 3 digits (e.g. `002_`, `003_`).
- The migration must be idempotent: running `up()` twice must not corrupt data.

## Output

- If a data migration is needed: write the file, then summarise what it does and why.
- If no data migration is needed: list each schema change and one sentence explaining why it is safe for existing data.
- Never skip the analysis step — always show your reasoning before writing or declining.

## Lessons learned

### New model added via migration — always use CREATE TABLE, never ALTER TABLE

**Incident (2026-03-20):** A migration for the new `UserTask` model used `ALTER TABLE "UserTask" ADD COLUMN "activityId" TEXT`. Because `UserTask` had never been created by any prior migration, `ALTER TABLE` failed with `no such table: UserTask` on Fly.io. Prisma recorded the migration as **failed** in `_prisma_migrations`, which caused every subsequent deploy to abort with *"migrate found failed migrations in the target database"*.

**Rule:** When adding a brand-new model, the migration SQL **must** use `CREATE TABLE`, not `ALTER TABLE`. Check the migration history for `CREATE TABLE "<ModelName>"` before writing any `ALTER TABLE` that references it. If no `CREATE TABLE` exists in any prior migration, the correct SQL is a full `CREATE TABLE` with all columns and constraints.

**Recovery pattern (if a migration is already recorded as failed in production):**
Add a step to `start.sh` **before** `prisma migrate deploy` that marks the failed migration as rolled-back only when it is in a failed state:
```js
p.$executeRawUnsafe(
  "UPDATE _prisma_migrations SET rolled_back_at = datetime('now') WHERE migration_name = ? AND finished_at IS NULL AND rolled_back_at IS NULL",
  '<migration_name>'
)
```
This is safe to run on every startup — the `WHERE` clause ensures it is a no-op once the migration has been successfully applied.
