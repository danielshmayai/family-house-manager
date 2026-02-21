import './globals.css'
import React from 'react'
import Providers from '../components/Providers'
import { getServerSession } from 'next-auth'
import { authOptions } from '../pages/api/auth/[...nextauth]'

export const metadata = {
  title: 'FamFlow — Family Activity Manager',
  description: "The fun way to manage your family's chores and compete for the crown!",
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let session: any = null
  try { session = await getServerSession(authOptions) } catch (e) { /* ignore */ }

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body style={{ margin: 0, padding: 0, overflowX: 'hidden' }}>
        <Providers session={session}>
          <div className="app-shell">
            <main style={{ minHeight: '100vh', padding: 0 }}>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
