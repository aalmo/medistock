"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Mail, Bell, Globe, User, Save, CheckCircle2, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const TIMEZONES = [
  "UTC","Europe/Berlin","Europe/London","Europe/Paris","Europe/Rome",
  "America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
  "Asia/Dubai","Asia/Tokyo","Asia/Singapore","Australia/Sydney",
]

interface UserSettings {
  name:            string
  email:           string
  timezone:        string
  emailNotifs:     boolean
  emailAlertLevel: string
  lowStockDays:    number
  expiryAlertDays: number
}

function Section({ icon: Icon, title, subtitle, children }: {
  icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_-2px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

const INPUT = "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
const SELECT = "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white appearance-none"

export default function SettingsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [settings, setSettings] = useState<UserSettings>({
    name: "", email: "", timezone: "UTC",
    emailNotifs: true, emailAlertLevel: "low", lowStockDays: 7, expiryAlertDays: 30,
  })
  const [saving,       setSaving]       = useState(false)
  const [testSending,  setTestSending]  = useState(false)
  const [testResult,   setTestResult]   = useState<"idle"|"sent"|"error">("idle")

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => {
        if (d.data) setSettings(s => ({ ...s, ...d.data }))
      })
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(settings),
      })
      if (res.ok) toast({ title: "✅ Settings saved!", description: "Your preferences have been updated." })
      else        toast({ title: "Error saving", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const sendTest = async () => {
    setTestSending(true)
    setTestResult("idle")
    try {
      const res = await fetch("/api/notifications/test-email", { method: "POST" })
      setTestResult(res.ok ? "sent" : "error")
      if (res.ok) toast({ title: "📧 Test email queued!", description: "Check your inbox (and spam folder)." })
      else        toast({ title: "Failed to send test email", variant: "destructive" })
    } catch {
      setTestResult("error")
    } finally {
      setTestSending(false)
      setTimeout(() => setTestResult("idle"), 4000)
    }
  }

  const update = (k: keyof UserSettings, v: UserSettings[keyof UserSettings]) =>
    setSettings(s => ({ ...s, [k]: v }))

  return (
    <div className="w-full max-w-3xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Preferences for {session?.user?.email}</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-sm hover:bg-blue-700 hover:shadow-md hover:-translate-y-px transition-all disabled:opacity-60">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Account */}
      <Section icon={User} title="Account" subtitle="Your personal information">
        <Field label="Full name">
          <input className={INPUT} value={settings.name} onChange={e => update("name", e.target.value)} placeholder="Your name" />
        </Field>
        <Field label="Email address" hint="Used for login and email notifications">
          <input className={`${INPUT} bg-gray-50 text-gray-500`} value={settings.email} disabled />
        </Field>
      </Section>

      {/* Timezone */}
      <Section icon={Globe} title="Timezone" subtitle="Used for scheduling and reminders">
        <Field label="Your timezone">
          <select className={SELECT} value={settings.timezone} onChange={e => update("timezone", e.target.value)}>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace("_"," ")}</option>)}
          </select>
        </Field>
      </Section>

      {/* Email notifications */}
      <Section icon={Mail} title="Email Notifications" subtitle="Receive low-stock alerts by email">

        {/* Master toggle */}
        <Field label="Email alerts">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-gray-50">
            <div>
              <p className="text-sm font-semibold text-gray-800">Send email alerts</p>
              <p className="text-xs text-gray-400 mt-0.5">Receive alerts when medication stock is low</p>
            </div>
            <button
              onClick={() => update("emailNotifs", !settings.emailNotifs)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${settings.emailNotifs ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${settings.emailNotifs ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </Field>

        {settings.emailNotifs && (
          <>
            {/* Alert level */}
            <Field label="Alert level" hint="Choose which stock levels trigger an email">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "off",      label: "Off",           icon: "🔕", desc: "No emails",             border: "border-gray-200",  bg: "bg-gray-50",    text: "text-gray-600"   },
                  { value: "critical", label: "Critical only", icon: "🔴", desc: "Red alerts only",       border: "border-red-200",   bg: "bg-red-50",     text: "text-red-700"    },
                  { value: "low",      label: "Low + Critical",icon: "🟡", desc: "Yellow & red alerts",   border: "border-amber-200", bg: "bg-amber-50",   text: "text-amber-700"  },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => update("emailAlertLevel", opt.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      settings.emailAlertLevel === opt.value
                        ? `${opt.border} ${opt.bg} shadow-sm`
                        : "border-gray-100 bg-white hover:border-gray-200"
                    }`}
                  >
                    <div className="text-xl mb-1">{opt.icon}</div>
                    <div className={`text-[11px] font-bold ${settings.emailAlertLevel === opt.value ? opt.text : "text-gray-700"}`}>{opt.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </Field>

            {/* Low-stock threshold */}
            <Field label="Low stock threshold" hint={`Send email when stock drops below ${settings.lowStockDays} days remaining`}>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={30} step={1}
                  value={settings.lowStockDays}
                  onChange={e => update("lowStockDays", Number(e.target.value))}
                  className="flex-1 accent-blue-600"/>
                <div className="w-16 text-center">
                  <span className="text-lg font-black text-blue-600">{settings.lowStockDays}</span>
                  <span className="text-xs text-gray-400 block">days</span>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>1 day (urgent)</span><span>30 days (early)</span>
              </div>
            </Field>

            {/* Expiry alert threshold */}
            <Field label="Expiry alert threshold" hint={`Alert when a package expires within ${settings.expiryAlertDays} days`}>
              <div className="flex items-center gap-3">
                <input type="range" min={7} max={180} step={7}
                  value={settings.expiryAlertDays}
                  onChange={e => update("expiryAlertDays", Number(e.target.value))}
                  className="flex-1 accent-violet-600"/>
                <div className="w-16 text-center">
                  <span className="text-lg font-black text-violet-600">{settings.expiryAlertDays}</span>
                  <span className="text-xs text-gray-400 block">days</span>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>7 days</span><span>180 days (6 months)</span>
              </div>
            </Field>

            {/* Email preview / test */}
            <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800">Test your email setup</p>
                  <p className="text-xs text-gray-500 mt-0.5 mb-3">
                    Send a sample low-stock alert to <strong>{settings.email}</strong> to verify delivery.
                  </p>
                  <button
                    onClick={sendTest}
                    disabled={testSending}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    {testSending ? (
                      <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Sending…</>
                    ) : testResult === "sent" ? (
                      <><CheckCircle2 className="w-3.5 h-3.5"/>Email sent!</>
                    ) : (
                      <><Send className="w-3.5 h-3.5"/>Send test email</>
                    )}
                  </button>
                  {testResult === "error" && (
                    <p className="mt-2 text-[11px] text-red-600 font-semibold">
                      ⚠️ Failed. Check that SMTP_HOST, SMTP_USER and SMTP_PASS are set in .env.local
                    </p>
                  )}
                </div>
              </div>

              {/* Setup instructions */}
              <div className="mt-4 pt-4 border-t border-blue-100">
                <p className="text-[11px] font-bold text-blue-700 mb-2">📬 SMTP email setup</p>
                <ol className="space-y-1 text-[11px] text-gray-500 list-none">
                  <li>1. Add to <code className="bg-gray-100 px-1 rounded font-mono">.env.local</code>:</li>
                  <li className="ml-3"><code className="bg-gray-100 px-1 rounded font-mono">SMTP_HOST=smtp.strato.de</code></li>
                  <li className="ml-3"><code className="bg-gray-100 px-1 rounded font-mono">SMTP_PORT=587</code></li>
                  <li className="ml-3"><code className="bg-gray-100 px-1 rounded font-mono">SMTP_USER=you@domain.com</code></li>
                  <li className="ml-3"><code className="bg-gray-100 px-1 rounded font-mono">SMTP_PASS=yourpassword</code></li>
                  <li>2. Restart the dev server</li>
                  <li className="text-gray-400 italic">Leave unset to use Ethereal (preview URL printed in console)</li>
                </ol>
              </div>
            </div>
          </>
        )}
      </Section>

      {/* In-app notifications */}
      <Section icon={Bell} title="In-App Notifications" subtitle="Reminders and alerts inside MediStock">
        <div className="space-y-2.5">
          {[
            { label: "Dose reminders",         desc: "30 minutes before a scheduled dose",       checked: true  },
            { label: "Low stock alerts",        desc: "When stock drops below threshold",          checked: true  },
            { label: "Auto-complete summary",   desc: "When doses are auto-marked at end of day",  checked: true  },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
              <div className="w-9 h-5 rounded-full bg-blue-600 relative">
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Save footer */}
      <div className="flex justify-end pb-8">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-sm hover:bg-blue-700 hover:shadow-md hover:-translate-y-px transition-all disabled:opacity-60">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save all settings"}
        </button>
      </div>
    </div>
  )
}

