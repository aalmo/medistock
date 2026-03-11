"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { Locale, Translation } from "./types"
import { translations, LOCALES } from "./locales/index"

const STORAGE_KEY = "medistock_locale"

interface I18nContextValue {
  locale: Locale
  t: Translation
  setLocale: (l: Locale) => void
  dir: "ltr" | "rtl"
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  t: translations.en,
  setLocale: () => {},
  dir: "ltr",
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  // Restore saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (saved && saved in translations) setLocaleState(saved)
  }, [])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
    // Update <html> dir + lang for RTL support
    document.documentElement.setAttribute("lang", l)
    document.documentElement.setAttribute("dir", LOCALES[l].dir)
  }

  // Keep html attrs in sync on every render
  useEffect(() => {
    document.documentElement.setAttribute("lang", locale)
    document.documentElement.setAttribute("dir", LOCALES[locale].dir)
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, t: translations[locale], setLocale, dir: LOCALES[locale].dir }}>
      {children}
    </I18nContext.Provider>
  )
}

/** Use translations: const { t, locale, setLocale } = useT() */
export function useT() {
  return useContext(I18nContext)
}

