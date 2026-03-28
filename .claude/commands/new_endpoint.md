Scaffold a new API endpoint with all required patterns for this project.

Ask the user for:
1. **Endpoint path** — e.g., `/api/rewards`
2. **HTTP methods** — which methods to support (GET, POST, PUT, DELETE)
3. **What it does** — brief description of the functionality
4. **Role access** — who can access it (all members, managers only, admin only)
5. **Needs rate limiting?** — yes for write endpoints, usually no for reads

Then generate:

## 1. API route file

In `pages/api/` with this pattern:
- Import: prisma, getSessionUser, verifyHouseholdAccess, rateLimit, withLogging
- Session check on all protected methods
- Household access verification for household-scoped data
- Role-based permission checks
- Rate limiting on write methods (with unique keyPrefix)
- Proper status codes (400, 401, 403, 404, 405, 409, 429)
- Wrapped with `withLogging(handler)`

## 2. Unit test file

In `tests/unit/` with:
- Test success cases for each HTTP method
- Test 401 (no session)
- Test 403 (wrong role, wrong household)
- Test 400 (missing/invalid fields)
- Use mocked Prisma client

## 3. Prisma schema update (if needed)

- Add model to `prisma/schema.prisma`
- Generate migration
- Check data safety with `/schema_changes`

After generating, run `npx tsc --noEmit` and `npm test` to verify everything works.
