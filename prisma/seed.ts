import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main(){
  const hashed = await bcrypt.hash('password', 10)

  const household = await prisma.household.create({
    data: {
      name: 'Demo Family'
    }
  })

  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      name: 'Parent Admin',
      passwordHash: hashed,
      householdId: household.id,
      role: 'ADMIN'
    }
  })

  const categories = [
    { key: 'school', name: 'School', color: '#FF7A7A' },
    { key: 'home', name: 'Home', color: '#7AD3FF' },
    { key: 'dog', name: 'Dog Care', color: '#FFD37A' },
    { key: 'bonus', name: 'Bonus', color: '#C97AFF' }
  ]

  for(const c of categories){
    await prisma.category.create({ data: c })
  }

  const school = await prisma.category.findUnique({ where: { key: 'school' } })
  const home = await prisma.category.findUnique({ where: { key: 'home' } })

  await prisma.task.create({ data: { key: 'school_on_time', categoryId: school!.id, name: 'On Time to School', defaultPoints: 5, frequency: 'DAILY', createdById: admin.id } })
  await prisma.task.create({ data: { key: 'school_good_note', categoryId: school!.id, name: 'Good Teacher Note', defaultPoints: 10, frequency: 'ONCE', createdById: admin.id } })
  await prisma.task.create({ data: { key: 'home_make_bed', categoryId: home!.id, name: 'Make Bed', defaultPoints: 2, frequency: 'DAILY', createdById: admin.id } })

  console.log('Seed completed')
}

main()
.catch(e => { console.error(e); process.exit(1) })
.finally(() => prisma.$disconnect())
