"use client"

import { SessionProvider } from "next-auth/react"
import { I18nProvider, useT } from "@/lib/i18n/context"
import { useSession } from "next-auth/react"
import { useEffect } from "react"
import type { Locale } from "@/lib/i18n/types"

function LocaleSync() {
  const { data: session } = useSession()
  const { locale, setLocale } = useT()
  useEffect(() => {
    if (session?.user?.language && session.user.language !== locale) {
      setLocale(session.user.language as Locale)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.language])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <LocaleSync />
        {children}
      </I18nProvider>
    </SessionProvider>
  )
}
