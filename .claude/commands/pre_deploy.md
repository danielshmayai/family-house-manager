Run a full pre-deploy check before pushing to master. Master deploys directly to production.

## Steps (run all of these):

1. **Git status** — Show what's changed and what's staged
   ```
   git status
   git diff --stat
   ```

2. **TypeScript check** — Verify no type errors
   ```
   npx tsc --noEmit
   ```

3. **Unit tests** — All must pass
   ```
   npm test
   ```

4. **Migration status** — Check for unapplied migrations or schema drift
   ```
   npx prisma migrate status
   ```

5. **Schema safety** — If schema.prisma was modified, check for dangerous changes
   ```
   git diff HEAD -- prisma/schema.prisma
   ```

## Report format

Summarize results as a checklist:
- [ ] or [x] TypeScript — pass/fail
- [ ] or [x] Tests — X passed, Y failed
- [ ] or [x] Migrations — applied/pending/drift
- [ ] or [x] Schema safety — safe/needs review

End with a clear **GO** or **NO-GO** verdict.
