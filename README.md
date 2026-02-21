Family House Manager

Mobile-first playful app for family shared tasks, points and leaderboards.

Run (Windows):

1. cd into the project

```bash
cd C:/Daniel/AI/apps/family-house-manager
npm install
```

2. Set up environment variable `DATABASE_URL` in a `.env` file, e.g.:

```
DATABASE_URL="file:./dev.db"
```

3. Generate Prisma client and migrate

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run seed
```

4. Run dev server

```bash
npm run dev
```

Notes:
- This project uses Next.js App Router and Prisma with SQLite.
- API routes exist under `pages/api/*` for auth, households, tasks, events, leaderboard.
- `lib/rulesEngine.ts` contains the rules engine; extend `pointsForEvent` for new rules.
- To add a new category, create a `Category` row and add tasks with metadata.

## Testing

The project includes comprehensive test suites covering both API and UI functionality.

### API Integration Tests (100% passing)

Tests all backend endpoints including user registration, authentication, tasks, events, households, and leaderboard.

**Run tests (Windows):**

```bash
# Using batch script (starts server automatically):
cmd /c run-tests.bat

# Or manually:
# Terminal 1 - Start server:
set DATABASE_URL=file:./dev.db
npm run dev

# Terminal 2 - Run tests:
node tests/api.test.js
```

**Test Coverage:**
- User registration and validation
- Duplicate email detection
- User listing
- Task and category management
- Household operations
- Event creation and retrieval
- Leaderboard functionality
- 404 error handling
- Input validation

### UI Sanity Tests (100% passing)

Tests critical user flows and UI components using Playwright for browser automation.

**Run tests (Windows):**

```bash
# Using batch script (starts server automatically):
cmd /c run-ui-tests.bat

# Or manually:
# Terminal 1 - Start server:
set DATABASE_URL=file:./dev.db
npm run dev

# Terminal 2 - Run tests:
node tests/ui.test.js
```

**Test Coverage:**
- Homepage loads correctly
- Sign in/Sign up pages render forms
- Authentication flows (login/logout)
- Today page displays all sections (profile, tabs, quick actions, checklist, timeline)
- Quick actions grid is interactive
- Tab navigation works
- Checklist displays tasks
- Timeline shows recent events
- Header shows correct auth state
- Responsive design (mobile viewport)

See [tests/README.md](tests/README.md) for manual testing instructions and troubleshooting.

## Demo Credentials

After seeding, you can log in with:
- Email: `admin@demo.com`
- Password: `password`
