import { PrismaClient } from '@prisma/client'

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db'
}

const globalAny: any = global
const prisma = globalAny.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalAny.prisma = prisma

export default prisma
