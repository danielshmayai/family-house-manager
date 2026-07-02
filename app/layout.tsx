import './globals.css'
import React from 'react'
import { Heebo } from 'next/font/google'
import Providers from '../components/Providers'
import BottomNav from '../components/BottomNav'
import { getServerSession } from 'next-auth'
import { authOptions } from '../lib/auth'
import { cookies } from 'next/headers'
import type { Lang } from '../lib/i18n'

// Heebo covers Hebrew + Latin in one family; exposed as --font-app for globals.css
const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-app',
  display: 'swap',
})

export const metadata = {
  title: 'Family House Manager',
  description: 'Manage household tasks, events and members',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
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
  themeColor: '#667eea',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let session: any = null
  try { session = await getServerSession(authOptions) } catch (e) { /* ignore */ }

  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('lang')?.value as Lang | undefined
  const lang: Lang = (session?.user as any)?.language || cookieLang || 'he'
  const dir = lang === 'he' ? 'rtl' : 'ltr'

  return (
    <html lang={lang} dir={dir} className={heebo.variable} suppressHydrationWarning>
      <head>
        {/* viewport, manifest, icons, theme-color, appleWebApp are all declared via
            the metadata/viewport exports above — Next.js injects them automatically.
            Only non-metadata things live here. */}
        <meta name="mobile-web-app-capable" content="yes" />
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
          <main style={{ minHeight: '100vh', padding: 0, paddingBottom: 'var(--nav-clearance)' }}>{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  )
}
