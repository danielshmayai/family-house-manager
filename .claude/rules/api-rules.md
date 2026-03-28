---
globs: pages/api/**,app/api/**
---

# API Route Rules

## Every API endpoint must:
1. Check session with `getSessionUser(req, res)` (except public endpoints like health)
2. Verify household access with `verifyHouseholdAccess(userId, householdId)` for household-scoped data
3. Be wrapped with `withLogging()` for consistent request logging
4. Return proper HTTP status codes: 400 (bad input), 401 (no session), 403 (no permission), 404 (not found), 409 (conflict), 429 (rate limited)

## Role-based access:
- ADMIN: full household control
- MANAGER: can assign tasks, view/manage others' data
- MEMBER: self-only access

## Rate limiting:
- Apply `rateLimit(req, res, { max, windowMs, keyPrefix })` on write endpoints and auth endpoints
- Use a unique `keyPrefix` per endpoint to avoid cross-endpoint interference

## Pattern to follow:
```typescript
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionUser = await getSessionUser(req, res)
  if (!sessionUser) return // getSessionUser already sends 401

  if (req.method === 'GET') { ... }
  else if (req.method === 'POST') { ... }
  else { return res.status(405).json({ error: 'Method not allowed' }) }
}
export default withLogging(handler)
```
