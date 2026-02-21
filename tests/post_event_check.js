(async ()=>{
  try{
    const url = process.argv[2] || 'http://localhost:3001/api/events'
    const payload = { eventType: 'TASK_COMPLETED', recordedById: 'nonexistent-user' }
    const res = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const text = await res.text()
    console.log('status', res.status)
    console.log(text)
  }catch(e){
    console.error('error', e)
    process.exit(1)
  }
})()
