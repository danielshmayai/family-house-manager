const http = require('http')
const port = process.argv[2] ? Number(process.argv[2]) : 3000
const options = { host: '127.0.0.1', port, path: '/api/tasks', method: 'GET' }
const req = http.request(options, res => {
  console.log('status', res.statusCode)
  res.setEncoding('utf8')
  res.on('data', d => process.stdout.write(d))
})
req.on('error', e => console.error('err', e.message))
req.end()
