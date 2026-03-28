Generate a health report for the Family House Manager project.

## Run these checks:

### 1. Test health
```
npm test -- --reporter=verbose 2>&1
```
Report: total tests, passed, failed, skipped.

### 2. Type safety
```
npx tsc --noEmit 2>&1
```
Report: clean or list of errors.

### 3. Migration status
```
npx prisma migrate status 2>&1
```
Report: all applied, pending, or drift detected.

### 4. Code quality scan
Search for common issues:
- `console.log` in `pages/api/` or `app/api/` (should use withLogging instead)
- `TODO` or `FIXME` comments across the codebase
- API routes missing `withLogging` wrapper
- API routes missing `getSessionUser` auth check
- Hardcoded strings that look like secrets or API keys

### 5. Dependency check
```
npm audit --omit=dev 2>&1
```
Report: vulnerabilities found or clean.

### 6. Build check
```
npm run build 2>&1
```
Report: success or failure with errors.

## Output format

```
## Health Report — [date]

| Check | Status | Details |
|-------|--------|---------|
| Tests | .../... | ... |
| Types | ... | ... |
| Migrations | ... | ... |
| Code quality | ... | ... |
| Dependencies | ... | ... |
| Build | ... | ... |

### Issues found
(list any problems with recommended fixes)

### Overall: HEALTHY / NEEDS ATTENTION
```
