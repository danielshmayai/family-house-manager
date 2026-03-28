---
globs: prisma/**
---

# Prisma Rules

You are editing database schema or migrations. These changes go directly to production.

## Before modifying schema.prisma:
1. Consider impact on existing rows in the production database
2. New NOT NULL columns MUST have a default value, or need a data migration
3. New models MUST use CREATE TABLE in the migration SQL — never ALTER TABLE on a table that doesn't exist yet
4. Removing a column = losing production data. Confirm this is intentional.
5. Adding a unique constraint can fail if duplicates already exist

## After modifying schema.prisma:
1. Run `npx prisma migrate dev --name <description>` to generate the migration
2. Review the generated SQL in `prisma/migrations/` — don't blindly trust it
3. Run `/schema_changes` to check if a data migration is needed
4. If a data migration is needed, create it in `data-migrations/NNN_description.js`

## Never:
- Edit migration files that have already been applied to production
- Use raw SQL in app code (use Prisma Client, except in data migrations)
- Skip the validate() function in data migrations
