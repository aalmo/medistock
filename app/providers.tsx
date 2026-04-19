"use client"

import { SessionProvider } from "next-auth/react"
import { I18nProvider, useT } from "@/lib/i18n/context"
import { useSession } from "next-auth/react"
import { useEffect } from "react"
import type { Locale } from "@/lib/i18n/types"
import { translations } from "@/lib/i18n/locales"

// Fetches the user's saved language from the DB the moment the session becomes
// authenticated — so the DB preference always wins over a stale JWT or localStorage.
function LocaleSync() {
  const { status } = useSession()
  const { setLocale } = useT()

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/settings")
      .then(r => r.json())
      .then(({ data }) => {
        if (data?.language && data.language in translations) {
          setLocale(data.language as Locale)
        }
      })
      .catch(() => {})
  // Only re-run when authentication state changes (not on every render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

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
