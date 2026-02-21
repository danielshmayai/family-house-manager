const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main(){
  const ts = await prisma.task.findMany({ include: { category: true } })
  console.log('tasks', ts.length)
  process.exit(0)
}
main().catch(e=>{ console.error(e); process.exit(1) })
