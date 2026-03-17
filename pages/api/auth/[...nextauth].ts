import NextAuth from 'next-auth'
import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '../../../lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials){
        if (!credentials) return null
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user) return null
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null
        return { id: user.id, name: user.name, email: user.email, role: user.role, householdId: user.householdId }
      }
    })
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user, trigger }){
      if (user) {
        token.user = { id: (user as any).id, name: (user as any).name, email: (user as any).email, role: (user as any).role, householdId: (user as any).householdId }
      }
      // When client calls update(), re-fetch user from DB to get fresh data
      if (trigger === 'update' && (token as any).user?.id) {
        const freshUser = await prisma.user.findUnique({ where: { id: (token as any).user.id } })
        if (freshUser) {
          token.user = { id: freshUser.id, name: freshUser.name, email: freshUser.email, role: freshUser.role, householdId: freshUser.householdId }
        }
      }
      return token
    },
    async session({ session, token }){
      if (token && (token as any).user) session.user = (token as any).user
      return session
    }
  }
}

export default NextAuth(authOptions)
