"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  Mail, Bell, Globe, User, Save, CheckCircle2,
  Send, Database, ShieldCheck, Settings2, ShieldAlert, TrendingDown, ShieldOff
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useT } from "@/lib/i18n/context"
import { LOCALE_LIST } from "@/lib/i18n/locales"

const TIMEZONES = [
  "UTC","Europe/Berlin","Europe/London","Europe/Paris","Europe/Rome",
  "America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
  "Asia/Dubai","Asia/Tokyo","Asia/Singapore","Australia/Sydney",
]

interface UserSettings {
  name:            string
  email:           string
  timezone:        string
  language:        string // NEW: default language
  emailNotifs:     boolean
  emailAlertLevel: string
  lowStockDays:    number
  expiryAlertDays: number
  drugDatabase:    string
}

// ── Dashboard-style section card ─────────────────────────────────────────────
function Section({
  icon: Icon, title, subtitle, gradient, children,
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  gradient: string
  children: React.ReactNode
}) {
  return (
    <div className="dashboard-surface group relative overflow-hidden transition-all duration-200">
      {/* subtle ambient blob — same as inventory KPI cards */}
      <div className={`pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-[0.07] transition-transform duration-500 group-hover:scale-110`} />

      {/* section header */}
      <div className="relative flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        {/* inventory-style icon: rounded-2xl gradient square with shadow */}
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-[0_6px_16px_-8px_rgba(15,23,42,0.45)]`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>

      <div className="relative px-6 py-5 space-y-5">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

const INPUT  = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
const SELECT = "w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"

export default function SettingsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const { t, setLocale } = useT()
  const [settings, setSettings] = useState<UserSettings>({
    name: "", email: "", timezone: "UTC", language: "en",
    emailNotifs: true, emailAlertLevel: "low", lowStockDays: 7, expiryAlertDays: 30,
    drugDatabase: "us",
  })
  const [saving,      setSaving]      = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [testResult,  setTestResult]  = useState<"idle"|"sent"|"error">("idle")

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => { if (d.data) setSettings(s => ({ ...s, ...d.data })) })
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (res.ok) toast({ title: "✅ Settings saved!", description: "Your preferences have been updated." })
      else        toast({ title: "Error saving", variant: "destructive" })
    } finally { setSaving(false) }
  }

  const sendTest = async () => {
    setTestSending(true); setTestResult("idle")
    try {
      const res = await fetch("/api/notifications/test-email", { method: "POST" })
      setTestResult(res.ok ? "sent" : "error")
      if (res.ok) toast({ title: "📧 Test email queued!", description: "Check your inbox (and spam folder)." })
      else        toast({ title: "Failed to send test email", variant: "destructive" })
    } catch { setTestResult("error") }
    finally {
      setTestSending(false)
      setTimeout(() => setTestResult("idle"), 4000)
    }
  }

  const update = (k: keyof UserSettings, v: UserSettings[keyof UserSettings]) => {
    setSettings(s => ({ ...s, [k]: v }))
    if (k === "language") setLocale(v as import("@/lib/i18n/types").Locale)
  }

  return (
    <div className="relative w-full space-y-6 pb-6">

      {/* ── ambient gradient blob ── */}
      <div className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-44 rounded-3xl bg-gradient-to-r from-blue-100/40 via-violet-100/40 to-indigo-100/40 blur-2xl" />

      {/* ── Header ── */}
      <div className="dashboard-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-[0_6px_16px_-8px_rgba(99,102,241,0.6)]`}>
            <Settings2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t.settings.title}</h1>
            <p className="mt-0.5 text-sm font-medium text-slate-500">{t.settings.subtitle} {session?.user?.email}</p>
          </div>
        </div>
        <button
          onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_-8px_rgba(99,102,241,0.6)] transition-all hover:-translate-y-px hover:shadow-[0_10px_22px_-8px_rgba(99,102,241,0.7)] disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? t.common.saving : t.settings.saveChanges}
        </button>
      </div>

      {/* ── top row: Account + Timezone side-by-side on wider screens ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Account */}
        <Section icon={User} title={t.settings.account} subtitle={t.settings.accountSubtitle} gradient="from-blue-500 to-blue-700">
          <Field label={t.settings.fullName}>
            <input className={INPUT} value={settings.name} onChange={e => update("name", e.target.value)} placeholder={t.settings.fullName} />
          </Field>
          <Field label={t.settings.emailAddress} hint={t.settings.emailHint}>
            <input className={`${INPUT} cursor-not-allowed bg-slate-50 text-slate-400`} value={settings.email} disabled />
          </Field>
          <Field label="Default Language">
            <select className={SELECT} value={settings.language} onChange={e => update("language", e.target.value)}>
              {LOCALE_LIST.map(([code, meta]) => (
                <option key={code} value={code}>{meta.flag} {meta.label}</option>
              ))}
            </select>
          </Field>
        </Section>

        {/* Timezone */}
        <Section icon={Globe} title={t.settings.timezone} subtitle={t.settings.timezoneSubtitle} gradient="from-teal-500 to-cyan-600">
          <Field label={t.settings.yourTimezone}>
            <select className={SELECT} value={settings.timezone} onChange={e => update("timezone", e.target.value)}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g," ")}</option>)}
            </select>
          </Field>
        </Section>

      </div>

      {/* ── Drug Database — full width ── */}
      <Section icon={Database} title={t.settings.drugDatabase} subtitle={t.settings.drugDatabaseSubtitle} gradient="from-violet-500 to-indigo-600">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([
            { value: "us", label: t.settings.usDatabase,  desc: t.settings.usDatabaseDesc, flag: "🇺🇸", tags: ["RxNorm","openFDA"],  selGrad: "from-slate-500 to-slate-700", selRing: "ring-slate-300", selBg: "bg-slate-50", selText: "text-slate-700" },
            { value: "eu", label: t.settings.euDatabase,   desc: t.settings.euDatabaseDesc, flag: "🇪🇺", tags: ["ChEMBL","EMBL-EBI"], selGrad: "from-blue-500 to-violet-600",  selRing: "ring-blue-200",  selBg: "bg-blue-50",  selText: "text-blue-700"  },
          ] as const).map(opt => {
            const active = settings.drugDatabase === opt.value
            return (
              <button
                key={opt.value} type="button"
                onClick={() => update("drugDatabase", opt.value)}
                className={`relative flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-150 hover:-translate-y-px
                  ${active
                    ? `border-transparent bg-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.22)] ring-2 ${opt.selRing}`
                    : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"}`}
              >
                <span className="mt-0.5 shrink-0 text-2xl leading-none">{opt.flag}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${active ? opt.selText : "text-slate-800"}`}>{opt.label}</p>
                  <p className="mt-0.5 text-xs leading-snug text-slate-400">{opt.desc}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {opt.tags.map(tag => (
                      <span key={tag} className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${active ? `${opt.selBg} ${opt.selText}` : "bg-slate-100 text-slate-500"}`}>{tag}</span>
                    ))}
                  </div>
                </div>
                {active && (
                  <div className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${opt.selGrad} shadow-sm`}>
                    <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          💡 Toggle per-search via the <span className="rounded bg-slate-100 px-1 font-mono text-slate-600">US</span> / <span className="rounded bg-blue-100 px-1 font-mono text-blue-600">EU</span> badge in the medication search box.
        </p>
      </Section>

      {/* ── Email Notifications + In-app side-by-side on wide screens ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Email Notifications — takes 2 cols */}
        <div className="lg:col-span-2">
          <Section icon={Mail} title={t.settings.emailNotifs} subtitle={t.settings.emailNotifsSubtitle} gradient="from-rose-500 to-pink-600">
            {/* master toggle */}
            <Field label={t.settings.alertLevel}>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t.settings.sendEmailAlerts}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{t.settings.receiveAlerts}</p>
                </div>
                <button
                  onClick={() => update("emailNotifs", !settings.emailNotifs)}
                  className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${settings.emailNotifs ? "bg-blue-600" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${settings.emailNotifs ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </Field>

            {settings.emailNotifs && (<>
              <Field label={t.settings.alertLevel} hint={t.settings.alertLevelHint}>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value:"off",      label: t.settings.off,         icon: ShieldOff,   gradient:"from-slate-400 to-slate-600", ring:"ring-slate-300", bg:"bg-slate-50", text:"text-slate-600" },
                    { value:"critical", label: t.settings.criticalOnly, icon: ShieldAlert, gradient:"from-red-500 to-rose-600",    ring:"ring-red-200",   bg:"bg-red-50",   text:"text-red-700"   },
                    { value:"low",      label: t.settings.lowCritical,  icon: TrendingDown,gradient:"from-amber-400 to-orange-500",ring:"ring-amber-200", bg:"bg-amber-50", text:"text-amber-700" },
                  ].map(opt => {
                    const active = settings.emailAlertLevel === opt.value
                    return (
                      <button key={opt.value} onClick={() => update("emailAlertLevel", opt.value)}
                        className={`flex flex-col items-center gap-2.5 rounded-xl border-2 p-4 text-center transition-all hover:-translate-y-px
                          ${active ? `border-transparent ${opt.bg} shadow-sm ring-2 ${opt.ring}` : "border-slate-100 bg-white hover:border-slate-200"}`}>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${opt.gradient} shadow-[0_6px_16px_-8px_rgba(15,23,42,0.45)]`}>
                          <opt.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className={`text-[11px] font-bold leading-tight ${active ? opt.text : "text-slate-700"}`}>{opt.label}</div>
                      </button>
                    )
                  })}
                </div>
              </Field>

              <Field label={t.settings.lowStockThreshold} hint={`Send email when stock drops below ${settings.lowStockDays} ${t.settings.days} remaining`}>
                <div className="flex items-center gap-4">
                  <input type="range" min={1} max={30} step={1} value={settings.lowStockDays}
                    onChange={e => update("lowStockDays", Number(e.target.value))} className="flex-1 accent-blue-600" />
                  <div className="w-14 shrink-0 text-center">
                    <span className="text-2xl font-semibold leading-none text-blue-600">{settings.lowStockDays}</span>
                    <span className="mt-0.5 block text-[10px] text-slate-400">{t.settings.days}</span>
                  </div>
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>{t.settings.urgent}</span><span>{t.settings.early}</span></div>
              </Field>

              <Field label={t.settings.expiryThreshold} hint={`Alert when a package expires within ${settings.expiryAlertDays} ${t.settings.days}`}>
                <div className="flex items-center gap-4">
                  <input type="range" min={7} max={180} step={7} value={settings.expiryAlertDays}
                    onChange={e => update("expiryAlertDays", Number(e.target.value))} className="flex-1 accent-violet-600" />
                  <div className="w-14 shrink-0 text-center">
                    <span className="text-2xl font-semibold leading-none text-violet-600">{settings.expiryAlertDays}</span>
                    <span className="mt-0.5 block text-[10px] text-slate-400">{t.settings.days}</span>
                  </div>
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>7 {t.settings.days}</span><span>{t.settings.months6}</span></div>
              </Field>

              {/* test email */}
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-indigo-50/60 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_6px_16px_-8px_rgba(15,23,42,0.45)]`}>
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{t.settings.testEmail}</p>
                    <p className="mt-0.5 mb-3 text-xs text-slate-500">{t.settings.testEmailDesc} <strong className="text-slate-700">{settings.email}</strong></p>
                    <button onClick={sendTest} disabled={testSending}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:shadow-md disabled:opacity-60">
                      {testSending
                        ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />{t.settings.sending}</>
                        : testResult === "sent"
                          ? <><CheckCircle2 className="h-3.5 w-3.5" />{t.settings.emailSent}</>
                          : <><Send className="h-3.5 w-3.5" />{t.settings.sendTestEmail}</>}
                    </button>
                    {testResult === "error" && <p className="mt-2 text-[11px] font-semibold text-red-600">⚠️ Failed — check SMTP env vars in .env.local</p>}
                  </div>
                </div>
                <div className="mt-4 border-t border-blue-100 pt-4">
                  <p className="mb-2 text-[11px] font-bold text-blue-700">📬 {t.settings.smtpSetup}</p>
                  <ol className="list-none space-y-1 text-[11px] text-slate-500">
                    <li>1. Add to <code className="rounded bg-white/70 px-1 font-mono">.env.local</code>:</li>
                    {["SMTP_HOST=smtp.strato.de","SMTP_PORT=587","SMTP_USER=you@domain.com","SMTP_PASS=yourpassword"].map(v => (
                      <li key={v} className="ml-3"><code className="rounded bg-white/70 px-1 font-mono">{v}</code></li>
                    ))}
                    <li>2. Restart the dev server</li>
                    <li className="italic text-slate-400">Leave unset to use Ethereal (preview URL in console)</li>
                  </ol>
                </div>
              </div>
            </>)}
          </Section>
        </div>

        {/* In-app Notifications — 1 col */}
        <Section icon={Bell} title={t.settings.inAppNotifs} subtitle={t.settings.inAppSubtitle} gradient="from-amber-500 to-orange-500">
          <div className="space-y-2.5">
            {[
              { label: t.settings.doseReminders,      desc: t.settings.doseRemindersDesc  },
              { label: t.settings.lowStockAlertsLabel, desc: t.settings.lowStockAlertsDesc },
              { label: t.settings.autoCompleteLabel,   desc: t.settings.autoCompleteDesc   },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3.5 transition-colors hover:border-slate-200">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                </div>
                <div className="relative h-6 w-11 shrink-0 rounded-full bg-blue-600">
                  <span className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" />
                </div>
              </div>
            ))}
          </div>
        </Section>

      </div>

      {/* ── Save footer ── */}
      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 px-6 py-3 font-semibold text-white shadow-[0_6px_16px_-8px_rgba(99,102,241,0.6)] transition-all hover:-translate-y-px hover:shadow-[0_10px_22px_-8px_rgba(99,102,241,0.7)] disabled:opacity-60">
          <Save className="h-4 w-4" />
          {saving ? t.common.saving : t.settings.saveAll}
        </button>
      </div>
    </div>
  )
}

