import './globals.css'
import React from 'react'
import Providers from '../components/Providers'
import { getServerSession } from 'next-auth'
import { authOptions } from '../lib/auth'
import { cookies } from 'next/headers'
import type { Lang } from '../lib/i18n'

export const metadata = {
  title: 'Family House Manager',
  description: 'Manage household tasks, events and members',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Family House Manager',
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

  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('lang')?.value as Lang | undefined
  const lang: Lang = (session?.user as any)?.language || cookieLang || 'he'
  const dir = lang === 'he' ? 'rtl' : 'ltr'

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#1a56db" />
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              });
            } else if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
            }
          `
        }} />
      </head>
      <body style={{ margin: 0, padding: 0, overflowX: 'hidden' }} suppressHydrationWarning>
        <Providers session={session} defaultLang={lang}>
          <main style={{ minHeight: '100vh', padding: 0 }}>{children}</main>
        </Providers>
      </body>
    </html>
  )
}
