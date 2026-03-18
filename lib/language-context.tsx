'use client'
import React, { createContext, useContext, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { Lang } from './i18n'

type LanguageContextType = {
  lang: Lang
  setLang: (l: Lang) => Promise<void>
}

const LanguageContext = createContext<LanguageContextType>({ lang: 'he', setLang: async () => {} })

export function LanguageProvider({ children, defaultLang }: { children: React.ReactNode; defaultLang: Lang }) {
  const { data: session } = useSession()
  const sessionLang = (session?.user as any)?.language as Lang | undefined
  const [localLang, setLocalLang] = useState<Lang>(defaultLang)

  const lang: Lang = sessionLang || localLang

  async function setLang(newLang: Lang) {
    setLocalLang(newLang)
    try {
      await fetch('/api/user/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: newLang }),
      })
    } catch {}
    window.location.reload()
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}
