import './globals.css'
import React from 'react'
import Providers from '../components/Providers'
import { getServerSession } from 'next-auth'
import { authOptions } from '../lib/auth'

export const metadata = {
  title: 'FinanSee - ניהול תיק פיננסי',
  description: 'ניהול חכם של כל הנכסים הפיננסיים שלך במקום אחד',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FinanSee',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#1a56db',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let session: any = null
  try { session = await getServerSession(authOptions) } catch (e) { /* ignore */ }

  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#1a56db" />
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              });
            }
          `
        }} />
      </head>
      <body style={{ margin: 0, padding: 0, overflowX: 'hidden' }} suppressHydrationWarning>
        <Providers session={session}>
          <main style={{ minHeight: '100vh', padding: 0 }}>{children}</main>
        </Providers>
      </body>
    </html>
  )
}
