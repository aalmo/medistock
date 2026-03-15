/**
 * MediStock Email Service — SMTP via Nodemailer
 * Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env / .env.local
 * Falls back to Ethereal (test inbox, preview URL in console) when SMTP is not configured.
 */

import nodemailer from "nodemailer"
import en from "@/lib/i18n/locales/en"
import ar from "@/lib/i18n/locales/ar"
import de from "@/lib/i18n/locales/de"
import type { Translation } from "@/lib/i18n/types"

/** Always creates a fresh transporter so env changes take effect without restart. */
function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT ?? "587")
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  console.log(`[Email] createTransporter → host=${host ?? "NOT_SET"} port=${port} user=${user ?? "NOT_SET"}`)

  if (!host || !user || !pass) {
    return null  // signal: no SMTP config
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },   // allow self-signed certs
  })
}

function getTranslation(lang: string): Translation {
  if (lang === "ar") return ar
  if (lang === "de") return de
  return en
}

/**
 * Core send helper used by all public send functions.
 * Returns { ok, previewUrl? } so callers can log preview links.
 */
async function sendMail(opts: {
  to:      string
  subject: string
  html:    string
  text:    string
}): Promise<boolean> {
  const from = process.env.EMAIL_FROM ?? "MediStock <noreply@medistock.app>"

  const transport = createTransporter()

  if (!transport) {
    // No SMTP configured → fall back to Ethereal so dev can still preview emails
    console.warn("[Email] No SMTP config — falling back to Ethereal preview account")
    try {
      const testAccount = await nodemailer.createTestAccount()
      const testTransport = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      })
      const info = await testTransport.sendMail({
        from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text,
      })
      const preview = nodemailer.getTestMessageUrl(info)
      console.log("[Email] Ethereal preview URL:", preview)
      return true
    } catch (err) {
      console.error("[Email] Ethereal fallback failed:", err)
      return false
    }
  }

  // Real SMTP send
  try {
    const info = await transport.sendMail({
      from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text,
    })
    console.log(`[Email] ✅ Sent via SMTP → ${opts.to} | msgId: ${info.messageId}`)
    return true
  } catch (err) {
    console.error("[Email] ❌ SMTP send failed:", err)
    return false
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Low-Stock Alert Email
// ─────────────────────────────────────────────────────────────────────────────

export interface LowStockEmailData {
  toEmail:     string
  toName:      string
  patientName: string
  medications: Array<{
    name:         string
    brandName?:   string
    strength?:    string
    unitType:     string
    pillsInStock: number
    daysLeft:     number
    threshold:    number
    status:       "low" | "critical"
  }>
  language?: string // NEW: pass language
}

const STATUS_COLORS = {
  critical: { bg: "#fef2f2", border: "#fecaca", badge: "#ef4444", badgeText: "#fff", label: "CRITICAL", icon: "🔴" },
  low:      { bg: "#fffbeb", border: "#fde68a", badge: "#f59e0b", badgeText: "#fff", label: "LOW",      icon: "🟡" },
}

export function buildLowStockEmail(data: LowStockEmailData, t: Translation): { subject: string; html: string; text: string } {
  const criticalCount = data.medications.filter(m => m.status === "critical").length
  const lowCount      = data.medications.filter(m => m.status === "low").length
  const appUrl        = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

  const subject = criticalCount > 0
    ? `🔴 CRITICAL: ${criticalCount} medication${criticalCount > 1 ? "s" : ""} need immediate restocking — ${data.patientName}`
    : `🟡 Low Stock: ${lowCount} medication${lowCount > 1 ? "s" : ""} running low — ${data.patientName}`

  const medCards = data.medications
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .map(med => {
      const c       = STATUS_COLORS[med.status]
      const daysBar = Math.min(100, Math.round((med.daysLeft / Math.max(med.threshold, 1)) * 100))
      const barColor = med.status === "critical" ? "#ef4444" : "#f59e0b"
      const displayName = med.brandName ?? med.name
      const subName     = med.brandName ? med.name : ""
      return `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:12px;border-radius:16px;overflow:hidden;border:1.5px solid ${c.border};background:${c.bg};">
        <tr><td style="padding:18px 20px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td>
              <span style="font-size:17px;font-weight:800;color:#111827;">${displayName}${med.strength ? ` (${med.strength})` : ""}</span>
              ${subName ? `<br/><span style="font-size:12px;color:#6b7280;">${subName}</span>` : ""}
            </td>
            <td align="right" valign="top">
              <span style="background:${c.badge};color:${c.badgeText};font-size:11px;font-weight:800;padding:4px 10px;border-radius:99px;display:inline-block;">${c.icon} ${c.label}</span>
            </td>
          </tr></table>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:14px;"><tr>
            <td width="32%" style="text-align:center;padding:10px 6px;background:#fff;border-radius:10px;border:1px solid #e5e7eb;">
              <div style="font-size:20px;font-weight:900;color:${barColor};">${med.pillsInStock % 1 === 0 ? med.pillsInStock : med.pillsInStock.toFixed(1)}</div>
              <div style="font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-top:2px;">${med.unitType}s left</div>
            </td>
            <td width="4%"></td>
            <td width="32%" style="text-align:center;padding:10px 6px;background:#fff;border-radius:10px;border:1px solid #e5e7eb;">
              <div style="font-size:20px;font-weight:900;color:${med.daysLeft <= 3 ? "#ef4444" : med.daysLeft <= 7 ? "#f59e0b" : "#111827"};">${med.daysLeft}</div>
              <div style="font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-top:2px;">days left</div>
            </td>
            <td width="4%"></td>
            <td width="32%" style="text-align:center;padding:10px 6px;background:#fff;border-radius:10px;border:1px solid #e5e7eb;">
              <div style="font-size:20px;font-weight:900;color:#6b7280;">${med.threshold}</div>
              <div style="font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-top:2px;">day alert</div>
            </td>
          </tr></table>
          <div style="margin-top:12px;">
            <div style="font-size:10px;color:${barColor};font-weight:700;text-align:right;margin-bottom:4px;">${daysBar}% of threshold</div>
            <div style="height:6px;background:#e5e7eb;border-radius:99px;overflow:hidden;">
              <div style="height:6px;width:${daysBar}%;background:${barColor};border-radius:99px;"></div>
            </div>
          </div>
        </td></tr>
      </table>`
    }).join("")

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;padding:32px 16px;">
<tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);border-radius:20px 20px 0 0;padding:32px 32px 28px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td><div style="font-size:22px;font-weight:900;color:#fff;">💊 MediStock</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:2px;">Medication Inventory Alert</div></td>
      <td align="right"><div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:8px 14px;">
        <div style="font-size:11px;color:rgba(255,255,255,0.7);font-weight:600;text-transform:uppercase;">Patient</div>
        <div style="font-size:16px;font-weight:800;color:#fff;">${data.patientName}</div>
      </div></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#fff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:28px 32px;">
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">Hello <strong>${data.toName || "Caregiver"}</strong>,<br/>
    The following medications for <strong>${data.patientName}</strong> require your attention.</p>
    ${medCards}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;"><tr><td align="center">
      <a href="${appUrl}/inventory" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;">📦 Go to Inventory →</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 20px 20px;padding:16px 32px;">
    <p style="margin:0;font-size:11px;color:#9ca3af;">MediStock — Medication tracking for caregivers.<br/>
    <a href="${appUrl}/settings" style="color:#3b82f6;text-decoration:none;">Manage email preferences</a></p>
    <p style="margin:8px 0 0;font-size:10px;color:#d1d5db;text-align:center;">⚕️ MediStock is a tracking tool only — not a substitute for medical advice.</p>
  </td></tr>
</table></td></tr></table>
</body></html>`

  const text = [
    `MediStock — Low Stock Alert for ${data.patientName}`,
    ``,
    ...data.medications.map(m =>
      `• ${m.brandName ?? m.name}${m.strength ? ` (${m.strength})` : ""} — ${m.pillsInStock} ${m.unitType}s left, ~${m.daysLeft} days [${m.status.toUpperCase()}]`
    ),
    ``, `Go to Inventory: ${appUrl}/inventory`,
    ``, `MediStock — tracking tool only, not medical advice.`,
  ].join("\n")

  return { subject, html, text }
}

export async function sendLowStockEmail(data: LowStockEmailData): Promise<boolean> {
  const t = getTranslation(data.language || "en")
  const { subject, html, text } = buildLowStockEmail(data, t)
  return sendMail({ to: data.toEmail, subject, html, text })
}

// ─────────────────────────────────────────────────────────────────────────────
// Expiry Alert Email
// ─────────────────────────────────────────────────────────────────────────────

export interface ExpiryEmailData {
  toEmail:     string
  toName:      string
  patientName: string
  packages: Array<{
    medicationName: string
    strength?:      string
    lotNumber?:     string
    expiryDate:     string
    quantity:       number
    unitType:       string
    daysLeft:       number
    status:         "expired" | "critical" | "warning"
  }>
  language?: string // NEW: pass language
}

const EXPIRY_COLORS = {
  expired:  { bg: "#fef2f2", border: "#fecaca", badge: "#ef4444", label: "EXPIRED",  icon: "💀" },
  critical: { bg: "#fef2f2", border: "#fecaca", badge: "#ef4444", label: "CRITICAL", icon: "🔴" },
  warning:  { bg: "#fffbeb", border: "#fde68a", badge: "#f59e0b", label: "WARNING",  icon: "🟡" },
}

export function buildExpiryEmail(data: ExpiryEmailData, t: Translation): { subject: string; html: string; text: string } {
  const expiredCount  = data.packages.filter(p => p.status === "expired").length
  const criticalCount = data.packages.filter(p => p.status === "critical").length
  const appUrl        = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

  const subject = expiredCount > 0
    ? `💀 EXPIRED: ${expiredCount} package${expiredCount > 1 ? "s" : ""} have expired — ${data.patientName}`
    : criticalCount > 0
    ? `🔴 URGENT: ${criticalCount} package${criticalCount > 1 ? "s" : ""} expire within 7 days — ${data.patientName}`
    : `🟡 Expiry Alert: Packages expiring soon — ${data.patientName}`

  const pkgCards = data.packages.map(pkg => {
    const c        = EXPIRY_COLORS[pkg.status]
    const expDate  = new Date(pkg.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    const daysLabel = pkg.daysLeft <= 0
      ? `Expired ${Math.abs(pkg.daysLeft)} day${Math.abs(pkg.daysLeft) !== 1 ? "s" : ""} ago`
      : `Expires in ${pkg.daysLeft} day${pkg.daysLeft !== 1 ? "s" : ""}`
    return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:12px;border-radius:16px;overflow:hidden;border:1.5px solid ${c.border};background:${c.bg};">
      <tr><td style="padding:16px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td><span style="font-size:15px;font-weight:800;color:#111827;">${pkg.medicationName}${pkg.strength ? ` (${pkg.strength})` : ""}</span>
              ${pkg.lotNumber ? `<br/><span style="font-size:11px;color:#6b7280;">Lot: ${pkg.lotNumber}</span>` : ""}</td>
          <td align="right" valign="top"><span style="background:${c.badge};color:#fff;font-size:11px;font-weight:800;padding:4px 10px;border-radius:99px;display:inline-block;">${c.icon} ${c.label}</span></td>
        </tr></table>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;"><tr>
          <td width="30%" style="text-align:center;padding:10px 6px;background:#fff;border-radius:10px;border:1px solid #e5e7eb;">
            <div style="font-size:20px;font-weight:900;color:${c.badge};">${pkg.daysLeft <= 0 ? "0" : pkg.daysLeft}</div>
            <div style="font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-top:2px;">days left</div>
          </td>
          <td width="5%"></td>
          <td width="30%" style="text-align:center;padding:10px 6px;background:#fff;border-radius:10px;border:1px solid #e5e7eb;">
            <div style="font-size:13px;font-weight:800;color:#111827;">${expDate}</div>
            <div style="font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-top:2px;">expiry date</div>
          </td>
          <td width="5%"></td>
          <td width="30%" style="text-align:center;padding:10px 6px;background:#fff;border-radius:10px;border:1px solid #e5e7eb;">
            <div style="font-size:20px;font-weight:900;color:#374151;">${pkg.quantity}</div>
            <div style="font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-top:2px;">${pkg.unitType}s</div>
          </td>
        </tr></table>
        <p style="margin:10px 0 0;font-size:12px;font-weight:700;color:${c.badge};">${daysLabel}</p>
      </td></tr>
    </table>`
  }).join("")

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;padding:32px 16px;">
<tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);border-radius:20px 20px 0 0;padding:28px 32px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td><div style="font-size:22px;font-weight:900;color:#fff;">💊 MediStock</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:2px;">Medication Expiry Alert</div></td>
      <td align="right"><div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:8px 14px;">
        <div style="font-size:11px;color:rgba(255,255,255,0.7);font-weight:600;text-transform:uppercase;">Patient</div>
        <div style="font-size:16px;font-weight:800;color:#fff;">${data.patientName}</div>
      </div></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#fff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:28px 32px;">
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">Hello <strong>${data.toName}</strong>,<br/>
    The following packages for <strong>${data.patientName}</strong> require your attention.</p>
    ${pkgCards}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;"><tr><td align="center">
      <a href="${appUrl}/packages" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;">📦 Manage Packages →</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 20px 20px;padding:16px 32px;">
    <p style="margin:0;font-size:11px;color:#9ca3af;">MediStock — Medication tracking for caregivers. <a href="${appUrl}/settings" style="color:#7c3aed;">Manage alerts</a></p>
    <p style="margin:8px 0 0;font-size:10px;color:#d1d5db;text-align:center;">⚕️ MediStock is a tracking tool only — not a substitute for medical advice.</p>
  </td></tr>
</table></td></tr></table>
</body></html>`

  const text = [
    `MediStock — Expiry Alert for ${data.patientName}`, ``,
    ...data.packages.map(p =>
      `• ${p.medicationName}${p.strength ? ` (${p.strength})` : ""}${p.lotNumber ? ` Lot:${p.lotNumber}` : ""} — ${new Date(p.expiryDate).toLocaleDateString()} (${p.daysLeft <= 0 ? "EXPIRED" : `${p.daysLeft}d left`}) [${p.status.toUpperCase()}]`
    ),
    ``, `Manage: ${appUrl}/packages`,
  ].join("\n")

  return { subject, html, text }
}

export async function sendExpiryEmail(data: ExpiryEmailData): Promise<boolean> {
  const t = getTranslation(data.language || "en")
  const { subject, html, text } = buildExpiryEmail(data, t)
  return sendMail({ to: data.toEmail, subject, html, text })
}
