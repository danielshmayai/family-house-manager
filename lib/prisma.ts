import { PrismaClient } from '@prisma/client'

// Ensure DATABASE_URL exists (fallback for local dev). This avoids Prisma initialization
// failures when the environment variable wasn't set by the dev shell.
if (!process.env.DATABASE_URL) {
	// use a local sqlite file by default
	process.env.DATABASE_URL = 'file:./dev.db'
}

const globalAny: any = global
const prisma = globalAny.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalAny.prisma = prisma

export default prisma
