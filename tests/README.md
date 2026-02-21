# API Test Suite

## Running the Tests

### Prerequisites
1. Ensure the development server is running:
   ```powershell
   cd C:\Daniel\AI\apps\family-house-manager
   $env:DATABASE_URL="file:./dev.db"
   npm run dev
   ```

2. In a separate terminal, run the tests:
   ```powershell
   node tests/api.test.js
   ```

### Manual Testing Instructions

If automated tests can't connect, you can manually test the API endpoints using your browser or a tool like Postman:

#### 1. Test User Registration
```powershell
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/auth/register -ContentType 'application/json' -Body '{"email":"testuser@example.com","password":"test123","name":"Test User"}'
```

Expected: Returns user object with id, email, and name

#### 2. Test Getting Users
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/users
```

Expected: Returns array of users

#### 3. Test Getting Tasks
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/tasks
```

Expected: Returns array of tasks with categories

#### 4. Test Getting Categories
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/categories
```

Expected: Returns array of categories

#### 5. Test Creating an Event
First, get a valid user ID from the users list, then:
```powershell
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/events -ContentType 'application/json' -Body '{"eventType":"TASK_COMPLETED","recordedById":"<USER_ID>","meta":{"test":true}}'
```

Expected: Returns event object with id and eventType

#### 6. Test Getting Today's Events
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/events/today
```

Expected: Returns array of today's events

#### 7. Test Leaderboard
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/leaderboard
```

Expected: Returns array of users with points

## Test Coverage

The test suite covers:
- ✓ User registration (success and duplicate validation)
- ✓ User listing
- ✓ Task retrieval with categories
- ✓ Category listing
- ✓ Household management
- ✓ Event creation and validation
- ✓ Today's events retrieval  
- ✓ Leaderboard calculation
- ✓ Error handling (invalid IDs, missing fields)
- ✓ 404 handling for non-existent endpoints

## Troubleshooting

### Server Not Responding
- Check if server is running: `netstat -ano | findstr :3000`
- Restart the dev server
- Ensure `DATABASE_URL` is set
- Check for port conflicts

### Tests Failing
- Verify server is accessible in browser: http://localhost:3000
- Check server logs for errors
- Ensure database is seeded: `npm run seed`
- Try manual PowerShell commands above

## Expected Test Results

When all tests pass, you should see:
```
✓ POST /api/auth/register - Create new user
✓ POST /api/auth/register - Reject duplicate email
✓ GET /api/users - List all users
✓ GET /api/tasks - List all tasks
✓ GET /api/categories - List all categories
✓ GET /api/households - List households
✓ POST /api/events - Create task completion event
✓ GET /api/events/today - Get today's events
✓ GET /api/leaderboard - Get user leaderboard
✓ GET /api/nonexistent - Return 404 for invalid endpoint
✓ POST /api/auth/register - Reject missing password
✓ POST /api/events - Reject event with invalid recordedById

Total: 12
Passed: 12 ✓
Failed: 0 ✗
Success Rate: 100.0%
```
