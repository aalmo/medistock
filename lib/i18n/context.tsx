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

function applyLocale(l: Locale) {
  const html = document.documentElement
  html.setAttribute("lang", l)
  html.setAttribute("dir", LOCALES[l].dir)
  // Add/remove the .font-arabic class on <body> so Cairo loads
  if (l === "ar") {
    document.body.classList.add("font-arabic")
  } else {
    document.body.classList.remove("font-arabic")
  }
}

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
    applyLocale(l)
  }

  // Keep html attrs in sync whenever locale changes
  useEffect(() => {
    applyLocale(locale)
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

/** Translate a unit type using current locale translations */
export function tUnitLabel(t: Translation, unitType: string, count?: number): string {
  const map: Record<string, [keyof Translation["units"], keyof Translation["units"]]> = {
    pill:       ["pill",       "pills"],
    tablet:     ["tablet",     "tablets"],
    inhalation: ["inhalation", "inhalations"],
    ml:         ["ml",         "ml"],
    drop:       ["drop",       "drops"],
    patch:      ["patch",      "patches"],
    injection:  ["injection",  "injections"],
    other:      ["unit",       "unitsPlural"],
  }
  const [sing, plur] = map[unitType] ?? ["unit", "unitsPlural"]
  if (count === undefined) return t.units[plur] as string
  return (count === 1 ? t.units[sing] : t.units[plur]) as string
}

/** Translate a frequency (times-per-day) using current locale translations */
export function tFrequencyLabel(t: Translation, timesPerDay: number): string {
  switch (timesPerDay) {
    case 1: return t.frequency.onceDaily
    case 2: return t.frequency.twiceDaily
    case 3: return t.frequency.threeTimesDaily
    case 4: return t.frequency.fourTimesDaily
    default: return `${timesPerDay}${t.frequency.timesDaily}`
  }
}

