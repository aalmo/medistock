"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Users, Pill, Clock, Activity, TrendingUp,
  TrendingDown, ArrowRight, CheckCircle2, Package,
  Wind, Droplets, Syringe, Zap, FlaskConical, Boxes,
  ShieldAlert, ShieldCheck
} from "lucide-react"
import { AdherenceChart } from "@/components/dashboard/AdherenceChart"
import { InventoryStatusChart } from "@/components/dashboard/InventoryStatusChart"
import { format } from "date-fns"

const UNIT_THEME: Record<string, { iconBg: string; iconColor: string; bar: string; icon: React.ElementType }> = {
  pill:       { iconBg: "bg-violet-100", iconColor: "text-violet-600", bar: "bg-violet-500", icon: Pill },
  tablet:     { iconBg: "bg-blue-100",   iconColor: "text-blue-600",   bar: "bg-blue-500",   icon: Pill },
  inhalation: { iconBg: "bg-sky-100",    iconColor: "text-sky-600",    bar: "bg-sky-500",    icon: Wind },
  ml:         { iconBg: "bg-teal-100",   iconColor: "text-teal-600",   bar: "bg-teal-500",   icon: FlaskConical },
  drop:       { iconBg: "bg-cyan-100",   iconColor: "text-cyan-600",   bar: "bg-cyan-500",   icon: Droplets },
  patch:      { iconBg: "bg-amber-100",  iconColor: "text-amber-600",  bar: "bg-amber-500",  icon: Zap },
  injection:  { iconBg: "bg-rose-100",   iconColor: "text-rose-600",   bar: "bg-rose-500",   icon: Syringe },
  other:      { iconBg: "bg-slate-100",  iconColor: "text-slate-600",  bar: "bg-slate-500",  icon: Package },
}

interface DashboardData {
  totalPatients: number
  dueTodayCount: number
  takenTodayCount: number
  pendingTodayCount: number
  adherenceRate: number
  lowStockCount: number
  expiredPkgCount:  number
  expiringPkgCount: number
  expiryAlertDays:  number
  upcomingDoses: Array<{
    id: string; patientName: string; medicationName: string
    brandName?: string; strength?: string
    scheduledAt: string; pillsPerDose: number; unitType: string; status: string
  }>
  adherenceTrend: Array<{ date: string; adherence: number; taken: number; missed: number }>
  inventoryChartData: Array<{ name: string; pills: number; threshold: number }>
}

// ── Floating KPI card ──────────────────────────────────────────────────────
function KPI({
  icon: Icon, label, value, sub, gradient, accent, trend, trendUp
}: {
  icon: React.ElementType; label: string; value: string | number
  sub?: string; gradient: string; accent: string; trend?: string; trendUp?: boolean
}) {
  return (
    <div className="dashboard-surface group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_42px_-22px_rgba(15,23,42,0.45)]">
      <div className={`absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br ${gradient} opacity-[0.07] transition-transform duration-500 group-hover:scale-110`} />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className={`mt-2 text-4xl font-semibold leading-none tracking-tight ${accent}`}>{value}</p>
          {sub && <p className="mt-1.5 text-xs font-medium text-slate-500">{sub}</p>}
          {trend && (
            <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${trendUp ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend}
            </div>
          )}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-[0_8px_20px_-10px_rgba(15,23,42,0.5)]`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  )
}

// ── Ring progress ─────────────────────────────────────────────────────────
function RingProgress({ percent, color, size = 64 }: { percent: number; color: string; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="6"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }}/>
    </svg>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const today = new Date()

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => setData(d.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="h-20 rounded-2xl bg-muted" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-36 bg-muted rounded-2xl" />)}
      </div>
      <div className="h-16 rounded-2xl bg-muted" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 h-72 bg-muted rounded-2xl" />
        <div className="lg:col-span-2 h-72 bg-muted rounded-2xl" />
      </div>
      <div className="h-64 rounded-2xl bg-muted" />
    </div>
  )

  if (!data) return null

  const donePercent = data.dueTodayCount > 0 ? Math.round((data.takenTodayCount / data.dueTodayCount) * 100) : 0
  const adherenceColor = data.adherenceRate >= 80 ? "#10b981" : data.adherenceRate >= 60 ? "#f59e0b" : "#ef4444"
  const progressColor  = donePercent === 100 ? "#10b981" : donePercent >= 50 ? "#3b82f6" : "#f59e0b"

  return (
    <div className="relative w-full space-y-6 pb-3">
      <div className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-48 rounded-3xl bg-gradient-to-r from-indigo-100/40 via-sky-100/40 to-violet-100/40 blur-2xl" />

      {/* ── Header ── */}
      <div className="dashboard-surface flex items-center justify-between p-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">{format(today, "EEEE, MMMM d, yyyy")}</p>
        </div>
        <Link href="/patients" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-px hover:shadow-[0_12px_24px_-12px_rgba(15,23,42,0.35)]">
          All Patients <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPI
          icon={Users} label="Total Patients" value={data.totalPatients}
          sub="under active care"
          gradient="from-blue-500 to-indigo-600" accent="text-indigo-700"
        />
        <KPI
          icon={Clock} label="Doses Due Today"
          value={`${data.takenTodayCount}/${data.dueTodayCount}`}
          sub={`${data.pendingTodayCount} still pending`}
          gradient="from-violet-500 to-purple-600" accent="text-violet-700"
          trend={donePercent === 100 ? "All done!" : undefined} trendUp={true}
        />
        <KPI
          icon={Activity} label="Adherence Rate" value={`${data.adherenceRate}%`}
          sub="last 30 days"
          gradient={data.adherenceRate >= 80 ? "from-emerald-500 to-teal-600" : data.adherenceRate >= 60 ? "from-amber-500 to-orange-500" : "from-red-500 to-rose-600"}
          accent={data.adherenceRate >= 80 ? "text-emerald-700" : data.adherenceRate >= 60 ? "text-amber-700" : "text-red-700"}
          trend={data.adherenceRate >= 80 ? "On track" : data.adherenceRate >= 60 ? "Needs attention" : "Critical"}
          trendUp={data.adherenceRate >= 80}
        />
        <KPI
          icon={data.lowStockCount > 0 ? ShieldAlert : ShieldCheck}
          label="Low Stock Alerts" value={data.lowStockCount}
          sub={data.lowStockCount === 0 ? "All stocked up" : "need restocking"}
          gradient={data.lowStockCount > 0 ? "from-red-500 to-rose-600" : "from-green-500 to-emerald-600"}
          accent={data.lowStockCount > 0 ? "text-red-700" : "text-emerald-700"}
          trend={data.lowStockCount > 0 ? `${data.lowStockCount} medication${data.lowStockCount > 1 ? "s" : ""}` : "All good"}
          trendUp={data.lowStockCount === 0}
        />
        <KPI
          icon={data.expiredPkgCount > 0 ? ShieldAlert : ShieldCheck}
          label="Expired Packages" value={data.expiredPkgCount}
          sub={data.expiredPkgCount === 0 ? "None expired" : "dispose immediately"}
          gradient={data.expiredPkgCount > 0 ? "from-red-600 to-rose-700" : "from-slate-400 to-slate-500"}
          accent={data.expiredPkgCount > 0 ? "text-red-700" : "text-slate-600"}
          trend={data.expiredPkgCount > 0 ? "Action required" : "All clear"}
          trendUp={data.expiredPkgCount === 0}
        />
        <KPI
          icon={Boxes}
          label={`Expiring <${data.expiryAlertDays}d`} value={data.expiringPkgCount}
          sub={data.expiringPkgCount === 0 ? "All dates OK" : "check packages page"}
          gradient={data.expiringPkgCount > 0 ? "from-amber-500 to-orange-500" : "from-emerald-500 to-teal-600"}
          accent={data.expiringPkgCount > 0 ? "text-amber-700" : "text-emerald-700"}
          trend={data.expiringPkgCount > 0 ? `${data.expiringPkgCount} package${data.expiringPkgCount !== 1 ? "s" : ""}` : "All good"}
          trendUp={data.expiringPkgCount === 0}
        />
      </div>

      {/* ── Today progress + Adherence ring ── */}
      {data.dueTodayCount > 0 && (
        <div className="dashboard-surface flex items-center gap-6 p-6">
          {/* Ring */}
          <div className="relative shrink-0">
            <RingProgress percent={donePercent} color={progressColor} size={76} />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-gray-700">{donePercent}%</span>
          </div>
          {/* Bar + labels */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Today's Progress</p>
                <p className="mt-0.5 text-xs text-slate-500">{data.takenTodayCount} of {data.dueTodayCount} doses completed</p>
              </div>
              <div className="flex items-center gap-5 text-center">
                <div>
                  <p className="text-xl font-black text-emerald-600">{data.takenTodayCount}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Taken</p>
                </div>
                <div className="w-px h-8 bg-slate-100"/>
                <div>
                  <p className="text-xl font-black text-blue-500">{data.pendingTodayCount}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pending</p>
                </div>
                <div className="w-px h-8 bg-slate-100"/>
                <div>
                  <p className="text-xl font-black text-slate-300">{data.dueTodayCount - data.takenTodayCount - data.pendingTodayCount}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Missed</p>
                </div>
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${donePercent}%`, background: progressColor }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Inventory Status — 3 cols (bigger) */}
        <div className="dashboard-surface p-6 lg:col-span-3">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Inventory Status</p>
              <p className="mt-0.5 text-xs text-slate-500">Stock vs threshold</p>
            </div>
          </div>
          <InventoryStatusChart data={data.inventoryChartData} />
        </div>

        {/* Adherence trend — 2 cols */}
        <div className="dashboard-surface p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Adherence Trend</p>
              <p className="mt-0.5 text-xs text-slate-500">Last 7 days</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: `${adherenceColor}18`, color: adherenceColor }}>
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: adherenceColor }}/>
              {data.adherenceRate}% avg
            </div>
          </div>
          <AdherenceChart data={data.adherenceTrend} />
        </div>
      </div>

      {/* ── Upcoming Doses ── */}
      <div className="dashboard-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Upcoming Doses</h2>
            <p className="mt-0.5 text-xs text-slate-500">Next 24 hours · pending only</p>
          </div>
          <Link href="/schedules" className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
            Full calendar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {data.upcomingDoses.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">All caught up!</p>
            <p className="mt-1 text-xs text-slate-500">No pending doses in the next 24 hours</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100/90">
            {data.upcomingDoses.map((dose, idx) => {
              const theme     = UNIT_THEME[dose.unitType] ?? UNIT_THEME.pill
              const Icon      = theme.icon
              const doseTime  = new Date(dose.scheduledAt)
              const isToday   = doseTime.toDateString() === today.toDateString()
              const displayName = dose.brandName ?? dose.medicationName
              const minutesUntil = Math.round((doseTime.getTime() - today.getTime()) / 60000)
              const isSoon = minutesUntil >= 0 && minutesUntil <= 60

              return (
                <div key={dose.id} className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/70">
                  {/* index + icon */}
                  <div className="shrink-0 flex items-center gap-3">
                    <span className="w-4 text-right text-[11px] font-bold text-slate-300">{idx + 1}</span>
                    <div className={`w-9 h-9 rounded-xl ${theme.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${theme.iconColor}`} />
                    </div>
                  </div>

                  {/* name + patient */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold leading-tight text-slate-900">
                      {displayName}
                      {dose.strength && <span className="ml-1.5 text-xs font-normal text-slate-400">({dose.strength})</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {dose.patientName} · {dose.pillsPerDose} {dose.unitType}{dose.pillsPerDose !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* time badge */}
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-bold ${theme.iconColor}`}>{format(doseTime, "HH:mm")}</p>
                    <p className="text-[10px] text-slate-400">
                      {isSoon ? `in ${minutesUntil}m` : isToday ? "today" : format(doseTime, "MMM d")}
                    </p>
                  </div>

                  {/* status pill */}
                  <div className="shrink-0">
                    {isSoon ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"/>Soon
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"/>Pending
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

