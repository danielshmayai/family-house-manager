// CRUD API Tests for categories and tasks
// Run against local server at http://localhost:3000

const http = require('http')
const BASE_URL = 'http://localhost:3000'

function assert(condition, message){ if (!condition) throw new Error(message) }

function request(path, options = {}){
  return new Promise((resolve,reject)=>{
    const url = new URL(path, BASE_URL)
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(options.headers||{}) }
    }

    const req = http.request(reqOptions, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', ()=>{
        let parsed
        try { parsed = data ? JSON.parse(data) : null } catch(e){ parsed = data }
        resolve({ status: res.statusCode, ok: res.statusCode>=200 && res.statusCode<300, data: parsed })
      })
    })

    req.on('error', e => reject(new Error('Network error: '+e.message)))
    req.setTimeout(5000, ()=>{ req.destroy(); reject(new Error('timeout')) })
    if (options.body) req.write(options.body)
    req.end()
  })
}

async function run(){
  console.log('\n🏷️  Running CRUD tests for categories and tasks...\n')
  const results = []
  try{
    // 1) Create category
    let res = await request('/api/categories', { method: 'POST', body: JSON.stringify({ key: `cat_${Date.now()}`, name: 'Test Category' }) })
    assert(res.ok, 'Create category failed: '+JSON.stringify(res))
    const category = res.data
    console.log('✓ Created category', category.id)

    // 2) Read categories and ensure it exists
    res = await request('/api/categories')
    assert(res.ok && Array.isArray(res.data), 'List categories failed')
    const found = res.data.find(c=>c.id===category.id)
    assert(found, 'Created category not found in list')
    console.log('✓ Category found in list')

    // 3) Create task under category
    res = await request('/api/tasks', { method: 'POST', body: JSON.stringify({ key: `task_${Date.now()}`, categoryId: category.id, name: 'Test Task', defaultPoints: 3, frequency: 'DAILY', createdById: 'test' }) })
    assert(res.ok, 'Create task failed: '+JSON.stringify(res))
    const task = res.data
    console.log('✓ Created task', task.id)

    // 4) Read task by listing tasks
    res = await request('/api/tasks')
    assert(res.ok && Array.isArray(res.data), 'List tasks failed')
    const foundTask = res.data.find(t=>t.id===task.id)
    assert(foundTask, 'Created task not found in list')
    console.log('✓ Task found in list')

    // 5) Update task
    const newName = 'Updated Test Task'
    res = await request('/api/tasks', { method: 'PUT', body: JSON.stringify({ id: task.id, name: newName }) })
    assert(res.ok, 'Update task failed')
    assert(res.data.name === newName, 'Task name not updated')
    console.log('✓ Task updated')

    // 6) Update category
    const newCatName = 'Updated Category'
    res = await request('/api/categories', { method: 'PUT', body: JSON.stringify({ id: category.id, name: newCatName }) })
    assert(res.ok, 'Update category failed')
    assert(res.data.name === newCatName, 'Category name not updated')
    console.log('✓ Category updated')

    // 7) Prevent duplicate key creation (optional - API returns 400)
    res = await request('/api/categories', { method: 'POST', body: JSON.stringify({ key: category.key, name: 'Dup' }) })
    if (res.ok) {
      console.warn('⚠️ Duplicate key accepted (not ideal)')
    } else {
      console.log('✓ Duplicate key rejected as expected')
    }

    // 8) Delete task
    res = await request(`/api/tasks?id=${task.id}`, { method: 'DELETE' })
    assert(res.ok, 'Delete task failed')
    console.log('✓ Task deleted')

    // 9) Delete category
    res = await request(`/api/categories?id=${category.id}`, { method: 'DELETE' })
    assert(res.ok, 'Delete category failed')
    console.log('✓ Category deleted')

    console.log('\nAll CRUD tests passed ✅')
    process.exit(0)
  }catch(e){
    console.error('\nTest failed:', e.message)
    process.exit(1)
  }
}

run()
