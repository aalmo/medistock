/**
 * i18n locale registry
 * ─────────────────────────────────────────────────────────────────────────
 * To add a new language:
 *   1. Create  lib/i18n/locales/<code>.ts  implementing Translation
 *   2. Import it here and add one entry to LOCALES
 * That's it — the language picker in the Sidebar updates automatically.
 */

import type { Locale } from "../types"
import en from "./en"
import de from "./de"
import ar from "./ar"

export const LOCALES: Record<Locale, { label: string; flag: string; dir: "ltr" | "rtl" }> = {
  en: { label: "English",  flag: "🇬🇧", dir: "ltr" },
  de: { label: "Deutsch",  flag: "🇩🇪", dir: "ltr" },
  ar: { label: "العربية", flag: "🇾🇪", dir: "rtl" },
}

export const translations = { en, de, ar }

export const LOCALE_LIST = Object.entries(LOCALES) as [Locale, (typeof LOCALES)[Locale]][]

