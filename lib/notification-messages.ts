// Generate localized notification messages based on user language
import en from "@/lib/i18n/locales/en"
import ar from "@/lib/i18n/locales/ar"
import de from "@/lib/i18n/locales/de"
import type { Translation } from "@/lib/i18n/types"

const translations: Record<string, Translation> = { en, ar, de }

function getT(lang: string | null | undefined): Translation {
  return translations[lang ?? "en"] ?? translations.en
}

export function lowStockMessage(
  patientName: string,
  medName: string,
  unitsLeft: number,
  daysLeft: number,
  language?: string | null
): string {
  const t = getT(language)
  // Format the number to remove unnecessary decimals (3.0 → 3, 3.5 → 3.5)
  const units = unitsLeft % 1 === 0 ? Math.floor(unitsLeft) : unitsLeft.toFixed(1)
  const days = daysLeft % 1 === 0 ? Math.floor(daysLeft) : daysLeft.toFixed(1)

  // "{patientName}'s {medName} is running low — {units} units left (~{days} days)."
  // Arabic: "{medName} لـ {patientName} ينخفض — {units} وحدة متبقية (~{days} أيام)."
  // German: "{medName} von {patientName} wird knapp — {units} Einheiten übrig (~{days} Tage)."
  if (language === "ar") {
    return `${medName} لـ ${patientName} ينخفض — ${units} وحدة متبقية (~${days} ${t.common.days}).`
  }
  if (language === "de") {
    return `${medName} von ${patientName} wird knapp — ${units} Einheiten übrig (~${days} Tage).`
  }
  return `${patientName}'s ${medName} is running low — ${units} units left (~${days} days).`
}

export function expiryAlertMessage(
  patientName: string,
  medName: string,
  daysUntilExpiry: number,
  isExpired: boolean,
  language?: string | null
): string {
  const t = getT(language)
  const days = Math.abs(daysUntilExpiry)
  const daysFormatted = days % 1 === 0 ? Math.floor(days) : days.toFixed(1)

  if (isExpired) {
    if (language === "ar") {
      return `عبوة ${medName} لـ ${patientName} انتهت منذ ${daysFormatted} ${t.common.days} — ${t.packages.disposeNow}`
    }
    if (language === "de") {
      return `${medName}-Packung von ${patientName} ist vor ${daysFormatted} Tagen abgelaufen — sofort entsorgen`
    }
    return `${patientName}'s ${medName} package expired ${daysFormatted} ${days === 1 ? "day" : "days"} ago — dispose now`
  } else {
    if (language === "ar") {
      return `عبوة ${medName} لـ ${patientName} تنتهي خلال ${daysFormatted} ${t.common.days}.`
    }
    if (language === "de") {
      return `${medName}-Packung von ${patientName} läuft in ${daysFormatted} Tagen ab.`
    }
    return `${patientName}'s ${medName} package expires in ${daysFormatted} ${daysUntilExpiry === 1 ? "day" : "days"}.`
  }
}

export function reminderMessage(
  patientName: string,
  medName: string,
  pillsPerDose: number,
  language?: string | null
): string {
  const t = getT(language)
  const pills = pillsPerDose % 1 === 0 ? Math.floor(pillsPerDose) : pillsPerDose.toFixed(1)
  const unit = pillsPerDose === 1 ? t.units.pill : t.units.pills

  if (language === "ar") {
    return `تذكير: يجب على ${patientName} أخذ ${medName} (${pills} ${unit}) قريباً.`
  }
  if (language === "de") {
    return `Erinnerung: ${patientName} sollte bald ${medName} (${pills} ${unit}) einnehmen.`
  }
  return `Reminder: ${patientName} should take ${medName} (${pills} ${unit}) soon.`
}

export function missedDoseMessage(
  patientName: string,
  medName: string,
  pillsPerDose: number,
  language?: string | null
): string {
  const t = getT(language)
  const pills = pillsPerDose % 1 === 0 ? Math.floor(pillsPerDose) : pillsPerDose.toFixed(1)
  const unit = pillsPerDose === 1 ? t.units.pill : t.units.pills

  if (language === "ar") {
    return `جرعة فائتة: ${patientName} لم يأخذ ${medName} (${pills} ${unit}).`
  }
  if (language === "de") {
    return `Verpasste Dosis: ${patientName} hat ${medName} (${pills} ${unit}) nicht eingenommen.`
  }
  return `Missed dose: ${patientName} did not take ${medName} (${pills} ${unit}).`
}

export function expiryEmailSentMessage(
  patientName: string,
  packageCount: number,
  language?: string | null
): string {
  if (language === "ar") {
    return `تم إرسال بريد انتهاء الصلاحية لـ ${patientName}: ${packageCount} عبوة تنتهي قريباً.`
  }
  if (language === "de") {
    return `Ablauf-E-Mail für ${patientName} gesendet: ${packageCount} Packung(en) laufen bald ab.`
  }
  return `Expiry email sent for ${patientName}: ${packageCount} package(s) expiring soon.`
}

export function lowStockEmailSentMessage(
  patientName: string,
  medNames: string,
  language?: string | null
): string {
  if (language === "ar") {
    return `تم إرسال تنبيه بريدي لـ ${patientName}: ${medNames}`
  }
  if (language === "de") {
    return `E-Mail-Warnung für ${patientName} gesendet: ${medNames}`
  }
  return `Email alert sent for ${patientName}: ${medNames}`
}

