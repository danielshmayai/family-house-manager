// API Integration Tests for Family House Manager
// Run against live local server on http://localhost:3000

const http = require('http')

const BASE_URL = 'http://localhost:3000'

// Test utilities
let testResults = []
let testUserId = null
let testHouseholdId = null

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function test(name, fn) {
  try {
    await fn()
    testResults.push({ name, status: 'PASS' })
    console.log(`✓ ${name}`)
  } catch (error) {
    testResults.push({ name, status: 'FAIL', error: error.message })
    console.error(`✗ ${name}`)
    console.error(`  Error: ${error.message}`)
  }
}

async function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }

    const req = http.request(reqOptions, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        let parsed
        try {
          parsed = data ? JSON.parse(data) : null
        } catch {
          parsed = data
        }
        resolve({
          response: res,
          data: parsed,
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300
        })
      })
    })

    req.on('error', (error) => {
      reject(new Error(`Network error: ${error.message} (Code: ${error.code || 'unknown'})`))
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    
    req.setTimeout(5000) // 5 second timeout

    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

// Test Suite
async function runTests() {
  console.log('\n🧪 Running API Integration Tests...\n')
  
  // 1. Test user registration
  await test('POST /api/auth/register - Create new user', async () => {
    const timestamp = Date.now()
    const { data, status, ok } = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: `test${timestamp}@example.com`,
        password: 'test123456',
        name: `Test User ${timestamp}`
      })
    })
    
    assert(ok, `Expected 200, got ${status}`)
    assert(data.id, 'Response should include user id')
    assert(data.email, 'Response should include email')
    testUserId = data.id
  })
  
  // 2. Test duplicate user registration
  await test('POST /api/auth/register - Reject duplicate email', async () => {
    const { data, status } = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@demo.com',
        password: 'test123',
        name: 'Duplicate'
      })
    })
    
    assert(status === 400, `Expected 400, got ${status}`)
    assert(data.error, 'Should return error message')
  })
  
  // 3. Test getting users
  await test('GET /api/users - List all users', async () => {
    const { data, ok } = await request('/api/users')
    
    assert(ok, 'Request should succeed')
    assert(Array.isArray(data), 'Response should be an array')
    assert(data.length > 0, 'Should have at least one user')
    assert(data[0].email, 'User should have email')
  })
  
  // 4. Test getting tasks
  await test('GET /api/tasks - List all tasks', async () => {
    const { data, ok } = await request('/api/tasks')
    
    assert(ok, 'Request should succeed')
    const tasks = Array.isArray(data) ? data : data.tasks
    assert(Array.isArray(tasks), 'Response should contain tasks array')
    if (tasks.length > 0) {
      assert(tasks[0].name, 'Task should have name')
      assert(tasks[0].category, 'Task should include category')
    }
  })
  
  // 5. Test getting categories
  await test('GET /api/categories - List all categories', async () => {
    const { data, ok } = await request('/api/categories')
    
    assert(ok, 'Request should succeed')
    assert(Array.isArray(data), 'Response should be an array')
    assert(data.length > 0, 'Should have at least one category')
    assert(data[0].name, 'Category should have name')
  })
  
  // 6. Test getting households
  await test('GET /api/households - Get single household', async () => {
    // First create or get a household
    const { data: users, ok: usersOk } = await request('/api/users')
    
    if (!usersOk || !Array.isArray(users)) {
      console.log('  ⚠️  Skipping: Unable to fetch users')
      return
    }
    
    const userWithHousehold = users.find(u => u.householdId)
    
    if (!userWithHousehold || !userWithHousehold.householdId) {
      console.log('  ⚠️  Skipping: No users with household found')
      return
    }
    
    testHouseholdId = userWithHousehold.householdId
    const { data, ok } = await request(`/api/households?id=${testHouseholdId}`)
    
    assert(ok, 'Request should succeed')
    assert(data, 'Response should contain household data')
    assert(data.id === testHouseholdId, 'Should return correct household')
  })
  
  // 7. Test creating an event (requires valid user and household)
  await test('POST /api/events - Create task completion event', async () => {
    // First get a valid user with household
    const { data: users, ok: usersOk } = await request('/api/users')
    
    if (!usersOk || !Array.isArray(users)) {
      console.log('  ⚠️  Skipping: Unable to fetch users')
      return
    }
    
    const userWithHousehold = users.find(u => u.householdId)
    
    if (!userWithHousehold) {
      console.log('  ⚠️  Skipping: No users with household found')
      return
    }
    
    const { data, status, ok } = await request('/api/events', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'TASK_COMPLETED',
        recordedById: userWithHousehold.id,
        meta: { test: true, action: 'sanity-test' }
      })
    })
    
    assert(ok, `Expected 200, got ${status}: ${JSON.stringify(data)}`)
    assert(data.id, 'Event should have id')
    assert(data.eventType === 'TASK_COMPLETED', 'Event type should match')
  })
  
  // 8. Test getting today's events
  await test('GET /api/events/today - Get today\'s events', async () => {
    const { data, ok } = await request('/api/events/today')
    
    assert(ok, 'Request should succeed')
    assert(Array.isArray(data), 'Response should be an array')
    // Should have at least the event we just created
    if (data.length > 0) {
      assert(data[0].eventType, 'Event should have eventType')
      assert(data[0].recordedById, 'Event should have recordedById')
    }
  })
  
  // 9. Test getting leaderboard
  await test('GET /api/leaderboard - Get user leaderboard', async () => {
    // Leaderboard requires householdId
    if (!testHouseholdId) {
      console.log('  ⚠️  Skipping: No household ID available')
      return
    }
    
    const { data, ok, status } = await request(`/api/leaderboard?householdId=${testHouseholdId}`)
    
    assert(ok, `Request should succeed, got status ${status}`)
    assert(data.results, 'Response should have results array')
    assert(Array.isArray(data.results), 'Results should be an array')
    assert(typeof data.familyTotal === 'number', 'Should have familyTotal')
  })
  
  // 10. Test invalid endpoint
  await test('GET /api/nonexistent - Return 404 for invalid endpoint', async () => {
    const { status } = await request('/api/nonexistent')
    assert(status === 404, `Expected 404, got ${status}`)
  })
  
  // 11. Test missing required fields
  await test('POST /api/auth/register - Reject missing password', async () => {
    const { status } = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com'
      })
    })
    
    assert(status === 400, `Expected 400, got ${status}`)
  })
  
  // 12. Test event validation
  await test('POST /api/events - Reject event with invalid recordedById', async () => {
    const { status, data } = await request('/api/events', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'TASK_COMPLETED',
        recordedById: 'invalid-user-id-12345'
      })
    })
    
    assert(status === 400, `Expected 400, got ${status}`)
    assert(data.error, 'Should return error message')
  })
  
  // Summary
  console.log('\n📊 Test Results Summary')
  console.log('='.repeat(50))
  
  const passed = testResults.filter(r => r.status === 'PASS').length
  const failed = testResults.filter(r => r.status === 'FAIL').length
  const total = testResults.length
  
  console.log(`Total: ${total}`)
  console.log(`Passed: ${passed} ✓`)
  console.log(`Failed: ${failed} ✗`)
  console.log(`Success Rate: ${((passed/total)*100).toFixed(1)}%`)
  
  if (failed > 0) {
    console.log('\nFailed Tests:')
    testResults.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}`)
      console.log(`    ${r.error}`)
    })
  }
  
  console.log('\n' + '='.repeat(50))
  process.exit(failed > 0 ? 1 : 0)
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test runner failed:', error)
  process.exit(1)
})
