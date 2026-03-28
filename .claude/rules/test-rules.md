---
globs: tests/**
---

# Testing Rules

## Unit tests (Vitest):
- Located in `tests/unit/`
- Use the mocked Prisma client from `tests/helpers/prisma-mock.ts`
- Run with `npm test` or `npm run test:coverage`
- Must pass before any push to master (enforced by pre-push hook)

## E2E tests (Playwright):
- Located in `tests/*.test.js`
- Run with `npx playwright test`
- Not required pre-push, but should be run for UI changes

## When writing tests:
- Test both success and error cases
- Test role-based access (ADMIN vs MANAGER vs MEMBER)
- Test household isolation (user A can't access user B's household)
- For API tests, check the status code AND the response body
- Don't mock too much — test the actual logic, mock only external dependencies (DB, email)
