'use client'
import { SessionProvider } from 'next-auth/react'
import React from 'react'
import { LanguageProvider } from '@/lib/language-context'
import type { Lang } from '@/lib/i18n'

export default function Providers({ children, session, defaultLang }: { children: React.ReactNode; session: any; defaultLang?: Lang }) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      <LanguageProvider defaultLang={defaultLang || 'he'}>
        {children}
      </LanguageProvider>
    </SessionProvider>
  )
}
