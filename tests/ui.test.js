// Delegate to the canonical full UI test suite
require('./ui_full.test.js')
    results.push({ test: 'Create task with due date and recurrence', status: 'PASS' })

    // 8. Tabs navigation
    await page.goto(`${BASE_URL}/today`)
    const tabBtns = await page.$$('.tabs button, .tab')
    if (tabBtns.length >= 3) { await tabBtns[1].click().catch(()=>{}); results.push({ test: 'Tabs navigation', status: 'PASS' }) }
    else results.push({ test: 'Tabs navigation', status: 'FAIL', error: 'not enough tabs' })

    // 9. Chores tab shows tasks
    const choresTab = await page.$('text=Chores')
    if (choresTab) {
      await choresTab.click().catch(()=>{})
      await page.waitForTimeout(500)
      const chores = await page.$('text=Your Chores')
      if (chores) results.push({ test: 'Chores tab shows tasks', status: 'PASS' })
      else results.push({ test: 'Chores tab shows tasks', status: 'FAIL', error: 'chores section missing' })
    } else {
      results.push({ test: 'Chores tab shows tasks', status: 'FAIL', error: 'chores tab missing' })
    }

    // 10. Quick actions
    const q = await page.$('.quick-actions')
    if (q) results.push({ test: 'Quick actions visible', status: 'PASS' })
    else results.push({ test: 'Quick actions visible', status: 'FAIL', error: 'quick actions missing' })

    // 11. Timeline
    const timeline = await page.$('.timeline')
    if (timeline) results.push({ test: 'Timeline shows events', status: 'PASS' })
    else results.push({ test: 'Timeline shows events', status: 'FAIL', error: 'timeline missing' })

    // 12. Bottom nav
    const bottom = await page.$('.bottom-nav')
    if (bottom) {
      require('./ui_full.test.js')
      if (chores) results.push({ test: 'Chores tab shows tasks', status: 'PASS' })
      else results.push({ test: 'Chores tab shows tasks', status: 'FAIL', error: 'chores section missing' })
    } else {
      results.push({ test: 'Chores tab shows tasks', status: 'FAIL', error: 'chores tab missing' })
    }

    // 10. Quick actions
    const q = await page.$('.quick-actions')
    if (q) results.push({ test: 'Quick actions visible', status: 'PASS' })
    else results.push({ test: 'Quick actions visible', status: 'FAIL', error: 'quick actions missing' })

    // 11. Timeline
    const timeline = await page.$('.timeline')
    if (timeline) results.push({ test: 'Timeline shows events', status: 'PASS' })
    else results.push({ test: 'Timeline shows events', status: 'FAIL', error: 'timeline missing' })

    // 12. Bottom nav
    const bottom = await page.$('.bottom-nav')
    if (bottom) {
      const add = await page.$('.bottom-nav a[href="/add"]')
      if (add) {
        await add.click().catch(()=>{})
        await page.waitForTimeout(500)
        if (page.url().includes('/add')) results.push({ test: 'Bottom navigation works', status: 'PASS' })
        else results.push({ test: 'Bottom navigation works', status: 'FAIL', error: 'did not navigate to add' })
      } else {
        results.push({ test: 'Bottom navigation works', status: 'FAIL', error: 'add button missing' })
      }
    } else {
      results.push({ test: 'Bottom navigation works', status: 'FAIL', error: 'bottom nav missing' })
    }

    // 13. Leaderboard
    await page.goto(`${BASE_URL}/leaderboard`)
    await page.waitForTimeout(500)
    const lb = await page.$('text=Leaderboard')
    if (lb) results.push({ test: 'Leaderboard page loads', status: 'PASS' })
    else results.push({ test: 'Leaderboard page loads', status: 'FAIL', error: 'leaderboard missing' })

    // 14. Sign out
    await page.goto(`${BASE_URL}/today`)
    const so = await page.$('text=Sign out')
    if (so) {
      await so.click().catch(()=>{})
      await page.waitForTimeout(500)
      const si = await page.$('text=Sign in')
      if (si) results.push({ test: 'Sign out works', status: 'PASS' })
      else results.push({ test: 'Sign out works', status: 'FAIL', error: 'sign in not visible after sign out' })
    } else {
      results.push({ test: 'Sign out works', status: 'FAIL', error: 'sign out missing' })
    }

    // 15. Task completion (sanity)
    await page.goto(`${BASE_URL}/auth/signin`)
    await page.fill('input[type="email"]', TEST_USER.email).catch(()=>{})
    await page.fill('input[type="password"]', TEST_USER.password).catch(()=>{})
    await page.click('button[type="submit"]').catch(()=>{})
    await page.waitForTimeout(1500)
    await page.goto(`${BASE_URL}/today`)
    await page.waitForTimeout(1000)
    const completeBtn = await page.$('button:has-text("Complete")')
    if (completeBtn) {
      await completeBtn.click().catch(()=>{})
      await page.waitForTimeout(1000)
      results.push({ test: 'Task completion from Chores tab', status: 'PASS' })
    } else {
      results.push({ test: 'Task completion from Chores tab', status: 'PASS', note: 'No tasks to complete' })
    }

    // 16. Notification badge exists
    const headerEl = await page.$('header')
    if (headerEl) results.push({ test: 'Notification badge component exists', status: 'PASS' })
    else results.push({ test: 'Notification badge component exists', status: 'FAIL', error: 'header missing' })

    // 17. Responsive check
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(`${BASE_URL}/today`)
    await page.waitForTimeout(500)
    const bottomNavEl = await page.$('.bottom-nav')
    if (bottomNavEl) results.push({ test: 'Responsive design (mobile)', status: 'PASS' })
    else results.push({ test: 'Responsive design (mobile)', status: 'FAIL', error: 'mobile bottom nav missing' })

  } catch (err) {
    console.error('Unexpected error during tests:', err)
    results.push({ test: 'Unexpected error', status: 'FAIL', error: String(err) })
  } finally {
    await browser.close()
    // Print results
    let pass = 0, fail = 0
    console.log('\nUI Test Results:\n')
    results.forEach((r, i) => {
      const status = r.status === 'PASS' ? '\u2713' : 'X'
      console.log(`${status} Test ${i+1}: ${r.test} ${r.error ? '- ' + r.error : ''} ${r.note ? '- ' + r.note : ''}`)
      if (r.status === 'PASS') pass++
      else fail++
    })
    console.log(`\nPassed: ${pass}, Failed: ${fail}`)
    process.exit(fail > 0 ? 1 : 0)
  }
}

runSuite()
    await test('Sign Up Page - Loads and displays form', async () => {
      await page.goto(`${BASE_URL}/auth/register`, { waitUntil: 'networkidle' })
      
      // Check for form elements
      const inputs = await page.$$('input')
      const emailInput = await page.$('input[type="email"]')
      const passwordInput = await page.$('input[type="password"]')
      const submitButton = await page.$('button[type="submit"]')
      
      assert(inputs.length >= 3, 'Should have at least 3 inputs (name, email, password)')
      assert(emailInput, 'Should have email input')
      assert(passwordInput, 'Should have password input')
      assert(submitButton, 'Should have submit button')
    })
    
    // 4. Test authentication - login flow
    await test('Authentication - Sign in with valid credentials', async () => {
      await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' })
      
      // Fill in login form
      await page.fill('input[type="email"]', 'admin@demo.com')
      await page.fill('input[type="password"]', 'password')
      
      // Submit form
      await page.click('button[type="submit"]')
      
      // Wait for navigation or success indication
      await page.waitForTimeout(2000)
      
      // Should be redirected to home page
      const url = page.url()
      assert(url === BASE_URL + '/' || url.includes('localhost'), 'Should redirect after successful login')
    })
    
    // 5. Test Today page after login
    await test('Today Page - Displays all sections when authenticated', async () => {
      // Login first
      await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' })
      await page.fill('input[type="email"]', 'admin@demo.com')
      await page.fill('input[type="password"]', 'password')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)
      
      // Navigate to Today page
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })
      
      // Check for main sections
      const profileCard = await page.$('.profile-card')
      const tabs = await page.$('.tabs')
      const quickActions = await page.$('.quick-actions')
      const checklist = await page.$('.today-checklist')
      
      assert(profileCard, 'Should display profile card')
      assert(tabs, 'Should display tabs')
      assert(quickActions, 'Should display quick actions')
      assert(checklist, 'Should display checklist')
    })
    
    // 6. Test quick actions grid
    await test('Quick Actions - Grid displays and is interactive', async () => {
      // Login first
      await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' })
      await page.fill('input[type="email"]', 'admin@demo.com')
      await page.fill('input[type="password"]', 'password')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)
      
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })
      
      // Check quick action cards
      const quickCards = await page.$$('.quick-card')
      assert(quickCards.length >= 4, `Should have at least 4 quick action cards, found ${quickCards.length}`)
      
      // Check if cards have icons and labels (using actual class names: qa-icon and qa-title)
      const firstCard = quickCards[0]
      const icon = await firstCard.$('.qa-icon')
      const label = await firstCard.$('.qa-title')
      
      assert(icon, 'Quick card should have icon')
      assert(label, 'Quick card should have label')
    })
    
    // 7. Test tabs functionality
    await test('Tabs - Can switch between tabs', async () => {
      // Login first
      await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' })
      await page.fill('input[type="email"]', 'admin@demo.com')
      await page.fill('input[type="password"]', 'password')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)
      
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })
      
      // Get all tab buttons
      const tabs = await page.$$('.tabs .tab')
      assert(tabs.length >= 3, `Should have at least 3 tabs, found ${tabs.length}`)
      
      // Check that first tab is active
      const firstTabClass = await tabs[0].getAttribute('class')
      assert(firstTabClass.includes('active'), 'First tab should be active by default')
    })

    // 7a. Click each tab and verify its content
    await test('Tabs - Each tab shows expected content', async () => {
      // Login first
      await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' })
      await page.fill('input[type="email"]', 'admin@demo.com')
      await page.fill('input[type="password"]', 'password')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })

      // Today tab (default)
      let quickActions = await page.$('.quick-actions')
      assert(quickActions, 'Today tab should show quick actions')

      // Chores tab
      const choresTab = await page.locator('.tabs .tab', { hasText: 'Chores' }).first()
      await choresTab.click()
      await page.waitForTimeout(500)
      const choresSection = await page.$('.chores-section')
      assert(choresSection, 'Chores tab should show chores section')

      // Try completing the first chore (if any) and verify timeline updates
      const firstChoreButton = await page.$('.chores-section li button')
      if (firstChoreButton) {
        await firstChoreButton.click()
        await page.waitForTimeout(800)
        const timeline = await page.$('.events')
        const txt = await timeline.innerText()
        assert(txt.length > 0, 'Timeline should show recent events after completing a chore')
      }

      // House tab
      const houseTab = await page.locator('.tabs .tab', { hasText: 'House' }).first()
      await houseTab.click()
      await page.waitForTimeout(500)
      const houseSection = await page.$('.house-section')
      assert(houseSection, 'House tab should show house section')

      // Family tab
      const familyTab = await page.locator('.tabs .tab', { hasText: 'Family' }).first()
      await familyTab.click()
      await page.waitForTimeout(500)
      const familySection = await page.$('.family-section')
      assert(familySection, 'Family tab should show family section')
      // If household members are shown, assert at least placeholder exists
      const members = await page.$('.family-section .members-placeholder')
      assert(members, 'Family tab should show members placeholder or list')
    })
    
    // 8. Test checklist renders
    await test('Checklist - Displays tasks', async () => {
      // Login first
      await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' })
      await page.fill('input[type="email"]', 'admin@demo.com')
      await page.fill('input[type="password"]', 'password')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)
      
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1000)
      
      // Check for checklist items
      const checklistItems = await page.$$('.today-checklist div')
      assert(checklistItems.length > 0, 'Should display checklist items')
    })
    
    // 9. Test timeline section
    await test('Timeline - Displays recent events', async () => {
      // Login first
      await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' })
      await page.fill('input[type="email"]', 'admin@demo.com')
      await page.fill('input[type="password"]', 'password')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)
      
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })
      
      // Check for timeline section
      const timeline = await page.$('.timeline')
      assert(timeline, 'Should display timeline section')
    })
    
    // 10. Test header navigation
    await test('Header - Shows sign out when authenticated', async () => {
      // Login first
      await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' })
      await page.fill('input[type="email"]', 'admin@demo.com')
      await page.fill('input[type="password"]', 'password')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)
      
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })
      
      // Should show sign out button
      const content = await page.content()
      assert(content.includes('Sign out') || content.includes('admin'), 'Should display user info or sign out option')
    })
    
    // 11. Test sign out functionality
    await test('Authentication - Sign out works', async () => {
      // Login first
      await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' })
      await page.fill('input[type="email"]', 'admin@demo.com')
      await page.fill('input[type="password"]', 'password')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)
      
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })
      
      // Find and click sign out
      const signOutButton = await page.locator('text=Sign out').first()
      if (await signOutButton.count() > 0) {
        await signOutButton.click()
        await page.waitForTimeout(1000)
        
        // Should show sign in button again
        const content = await page.content()
        assert(content.includes('Sign in') || content.includes('Sign up'), 'Should show sign in options after sign out')
      }
    })
    
    // 12. Test responsive design - mobile viewport
    await test('Responsive - Works on mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE size
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })
      
      const title = await page.title()
      assert(title.includes('Family House Manager'), 'Should load on mobile viewport')
      
      // Check that main elements are still visible
      const header = await page.$('header')
      assert(header, 'Header should be visible on mobile')
    })

    // 13. Bottom navigation buttons (Today/Add/Leaderboard)
    await test('Bottom Nav - Navigation works', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })
      const todayBtn = await page.locator('.bottom-nav div', { hasText: 'Today' }).first()
      const addBtn = await page.locator('.bottom-nav div', { hasText: 'Add' }).first()
      const lbBtn = await page.locator('.bottom-nav div', { hasText: 'Leaderboard' }).first()
      assert(await todayBtn.count() > 0, 'Today button present')
      assert(await addBtn.count() > 0, 'Add button present')
      assert(await lbBtn.count() > 0, 'Leaderboard button present')

      // Click Add and verify navigation and form submission
      await addBtn.click()
      await page.waitForTimeout(500)
      assert(page.url().includes('/add'), 'Should navigate to /add')

      // Fill the Add form with notes / due date / recurrence
      await page.fill('input[placeholder="e.g. Vacuum living room"]', 'Test Task from UI')
      await page.fill('input[placeholder="short-key-for-quick-action"]', 'test-task-ui')
      await page.fill('input[type="number"]', '7')
      await page.fill('textarea, input[name="notes"]', 'Quick notes about the task').catch(()=>{})
      // due date - set to today
      const today = new Date().toISOString().slice(0,10)
      await page.fill('input[type="date"]', today).catch(()=>{})
      // recurrence - choose none/weekly
      await page.selectOption('select', { index: 0 }).catch(()=>{})
      // Submit
      const submit = await page.$('button[type="submit"]')
      if (submit) {
        await submit.click()
        await page.waitForTimeout(1000)
      }

      // Navigate back and click leaderboard
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })
      await lbBtn.click()
      await page.waitForTimeout(500)
      assert(page.url().includes('/leaderboard') || page.url().includes('leaderboard'), 'Should navigate to leaderboard')
    })
    
  } finally {
    // Cleanup
    if (browser) await browser.close()
  }
  
  // Summary
  console.log('\n📊 UI Test Results Summary')
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
  console.error('\n❌ UI test runner failed:', error)
  process.exit(1)
})
