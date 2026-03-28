# CLAUDE.md — Family House Manager

## Project Overview
Mobile-first family task management app with gamification (points, streaks, achievements).
Frontend: React 19 + Next.js 15 (App Router) + Tailwind CSS | Backend: Next.js API routes
Database: SQLite (Prisma ORM) | Auth: NextAuth (JWT) | Deploy: Fly.io + Docker

## Key Commands
- `npm run dev`           — Start development server
- `npm run test`          — Run Vitest unit tests
- `npm run test:coverage` — Tests with coverage report
- `npx playwright test`   — Run E2E tests
- `npm run build`         — Production build
- `npx prisma migrate dev` — Run database migrations
- `npx prisma studio`     — Database GUI

## Architecture
- Auth: NextAuth with credentials provider + JWT sessions
- Roles: ADMIN > MANAGER > MEMBER (household-scoped)
- Points: Event-sourced (Activity completions stored as Events)
- Approval: New family heads require product admin approval via email
- i18n: Hebrew (RTL) + English, stored in User model

## Coding Standards
- TypeScript strict mode
- Prisma ORM for all database access (no raw SQL except data migrations)
- API responses: consistent error format with status codes
- All protected endpoints: session check + household access verification
- Schema changes: follow `.claude/commands/schema_changes.md` guidelines

## Database
- SQLite in development and production (persistent volume on Fly.io)
- Prisma migrations in `prisma/migrations/`
- Data migrations in `data-migrations/` (idempotent, with validation)
- New models MUST use CREATE TABLE, never ALTER TABLE (past incident on Fly.io)

## When Compacting
Preserve: list of modified files, current test status, Prisma schema changes
in progress, any migration issues found, API endpoints being worked on,
and lessons learned during this session.

## Critical Production Rules
- `master` branch deploys DIRECTLY to production — no staging environment
- NEVER push to master without running tests first (`npm test`)
- NEVER push schema changes without verifying migration safety (see `/schema_changes`)
- Prisma schema changes can break production data — always check migration SQL
- Deployments should be fast — avoid unnecessary build steps or large dependencies

## Reference Infrastructure
For security hardening, testing patterns, deployment best practices,
performance optimization, and architecture guidance, refer to:
`C:/Daniel/AI/claude/claude-app-infrastructure/`

Key references:
- Security: `claude-app-infrastructure/skills/security/SKILL.md`
- Testing/evals: `claude-app-infrastructure/skills/testing/SKILL.md`
- Deployment: `claude-app-infrastructure/skills/deployment/SKILL.md`
- Performance: `claude-app-infrastructure/skills/performance/SKILL.md`
- Auth (OAuth/JWT): `claude-app-infrastructure/skills/auth/SKILL.md`
- Hooks: `claude-app-infrastructure/skills/hooks/SKILL.md`
