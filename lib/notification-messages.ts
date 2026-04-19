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
  // "{patientName}'s {medName} is running low — {units} units left (~{days} days)."
  // Arabic: "{medName} لـ {patientName} ينخفض — {units} وحدة متبقية (~{days} أيام)."
  if (language === "ar") {
    return `${medName} لـ ${patientName} ينخفض — ${unitsLeft} وحدة متبقية (~${daysLeft} ${t.common.days}).`
  }
  if (language === "de") {
    return `${medName} von ${patientName} wird knapp — ${unitsLeft} Einheiten übrig (~${daysLeft} Tage).`
  }
  return `${patientName}'s ${medName} is running low — ${unitsLeft} units left (~${daysLeft} days).`
}

export function expiryAlertMessage(
  patientName: string,
  medName: string,
  daysUntilExpiry: number,
  isExpired: boolean,
  language?: string | null
): string {
  const t = getT(language)
  if (isExpired) {
    const daysAgo = Math.abs(daysUntilExpiry)
    if (language === "ar") {
      return `عبوة ${medName} لـ ${patientName} انتهت منذ ${daysAgo} ${t.common.days} — ${t.packages.disposeNow}`
    }
    if (language === "de") {
      return `${medName}-Packung von ${patientName} ist vor ${daysAgo} Tagen abgelaufen — sofort entsorgen`
    }
    return `${patientName}'s ${medName} package expired ${daysAgo} ${daysAgo === 1 ? "day" : "days"} ago — dispose now`
  } else {
    if (language === "ar") {
      return `عبوة ${medName} لـ ${patientName} تنتهي خلال ${daysUntilExpiry} ${t.common.days}.`
    }
    if (language === "de") {
      return `${medName}-Packung von ${patientName} läuft in ${daysUntilExpiry} Tagen ab.`
    }
    return `${patientName}'s ${medName} package expires in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? "day" : "days"}.`
  }
}

export function reminderMessage(
  patientName: string,
  medName: string,
  pillsPerDose: number,
  language?: string | null
): string {
  const t = getT(language)
  const unit = pillsPerDose === 1 ? t.units.pill : t.units.pills

  if (language === "ar") {
    return `تذكير: يجب على ${patientName} أخذ ${medName} (${pillsPerDose} ${unit}) قريباً.`
  }
  if (language === "de") {
    return `Erinnerung: ${patientName} sollte bald ${medName} (${pillsPerDose} ${unit}) einnehmen.`
  }
  return `Reminder: ${patientName} should take ${medName} (${pillsPerDose} ${unit}) soon.`
}

export function missedDoseMessage(
  patientName: string,
  medName: string,
  pillsPerDose: number,
  language?: string | null
): string {
  const t = getT(language)
  const unit = pillsPerDose === 1 ? t.units.pill : t.units.pills

  if (language === "ar") {
    return `جرعة فائتة: ${patientName} لم يأخذ ${medName} (${pillsPerDose} ${unit}).`
  }
  if (language === "de") {
    return `Verpasste Dosis: ${patientName} hat ${medName} (${pillsPerDose} ${unit}) nicht eingenommen.`
  }
  return `Missed dose: ${patientName} did not take ${medName} (${pillsPerDose} ${unit}).`
}

export function expiryEmailSentMessage(
  patientName: string,
  packageCount: number,
  language?: string | null
): string {
  const t = getT(language)
  if (language === "ar") {
    return `تم إرسال بريد انتهاء الصلاحية لـ ${patientName}: ${packageCount} عبوة تنتهي قريباً.`
  }
  if (language === "de") {
    return `Ablauf-E-Mail für ${patientName} gesendet: ${packageCount} Packung(en) laufen bald ab.`
  }
  return `Expiry email sent for ${patientName}: ${packageCount} package(s) expiring soon.`
}

