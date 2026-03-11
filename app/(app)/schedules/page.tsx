"use client"

import { useEffect, useState } from "react"
import {
  Calendar, Clock, CheckCircle, AlertTriangle, XCircle,
  Pill, Wind, Droplets, Syringe, Zap, Package, FlaskConical,
  ChevronLeft, ChevronRight
} from "lucide-react"
import { getFrequencyLabel, parseJsonArray } from "@/lib/calculations"
import { format, startOfWeek, addDays, isSameDay, subWeeks, addWeeks } from "date-fns"
import { useT } from "@/lib/i18n/context"

const UNIT_THEME: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  pill:       { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", icon: Pill },
  tablet:     { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   icon: Pill },
  inhalation: { bg: "bg-sky-50",    text: "text-sky-700",    border: "border-sky-200",    icon: Wind },
  ml:         { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200",   icon: FlaskConical },
  drop:       { bg: "bg-cyan-50",   text: "text-cyan-700",   border: "border-cyan-200",   icon: Droplets },
  patch:      { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  icon: Zap },
  injection:  { bg: "bg-rose-50",   text: "text-rose-700",   border: "border-rose-200",   icon: Syringe },
  other:      { bg: "bg-slate-50",  text: "text-slate-700",  border: "border-slate-200",  icon: Package },
}

function StatusIcon({ status }: { status: string }) {
  if (status === "TAKEN")   return <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
  if (status === "MISSED")  return <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
  if (status === "SKIPPED") return <XCircle className="w-3 h-3 text-gray-400 shrink-0" />
  return <Clock className="w-3 h-3 text-blue-400 shrink-0" />
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const { t } = useT()

  useEffect(() => {
    fetch("/api/schedules")
      .then(r => r.json())
      .then(d => setSchedules(d.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  const today      = new Date()
  const baseWeek   = weekOffset === 0 ? today : weekOffset > 0 ? addWeeks(today, weekOffset) : subWeeks(today, -weekOffset)
  const weekStart  = startOfWeek(baseWeek, { weekStartsOn: 1 })
  const weekDays   = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Build all dose events across every schedule
  const allEvents = schedules.flatMap(sch =>
    (sch.doseLogs ?? []).map((log: any) => ({
      ...log,
      medName:     sch.patientMedication?.medication?.name ?? "Unknown",
      brandName:   sch.patientMedication?.medication?.brandName,
      strength:    sch.patientMedication?.medication?.strength,
      patientName: sch.patientMedication?.patient?.name ?? "",
      unitType:    (sch.patientMedication as any)?.unitType ?? "pill",
      pillsPerDose: sch.pillsPerDose,
    }))
  )

  if (loading) return (
    <div className="w-full space-y-5 animate-pulse">
      <div className="h-20 w-64 rounded-xl bg-muted" />
      <div className="h-72 rounded-2xl bg-muted" />
      <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted" />)}</div>
    </div>
  )

  return (
    <div className="relative w-full space-y-6 pb-3">
      <div className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-44 rounded-3xl bg-gradient-to-r from-blue-100/40 via-violet-100/40 to-sky-100/40 blur-2xl" />

      {/* ── Header ── */}
      <div className="dashboard-surface p-5">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t.schedules.title}</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">{t.schedules.subtitle}</p>
      </div>

      {/* ── Weekly Calendar ── */}
      <div className="dashboard-surface overflow-hidden">
        {/* calendar header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {format(weekStart, "MMMM d")} - {format(addDays(weekStart, 6), "MMMM d, yyyy")}
            </h2>
            {weekOffset === 0 && <p className="text-xs text-slate-500">Current week</p>}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset(o => o - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 transition-colors hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4 text-slate-500" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="h-8 rounded-lg border border-slate-200 px-2.5 text-xs font-medium transition-colors hover:bg-slate-50"
            >
              Today
            </button>
            <button
              onClick={() => setWeekOffset(o => o + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 transition-colors hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* day columns */}
        <div className="p-4">
          {/* Day headers */}
          <div className="mb-3 grid grid-cols-7 gap-2">
            {weekDays.map(d => {
              const isToday = isSameDay(d, today)
              return (
                <div key={d.toISOString()} className="text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    {format(d, "EEE")}
                  </p>
                  <div className={`
                    mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full
                    text-sm font-semibold
                    ${isToday
                      ? "bg-blue-600 text-white shadow-[0_2px_8px_rgba(59,130,246,0.35)]"
                      : "text-slate-700"}
                  `}>
                    {format(d, "d")}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Dose cells */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => {
              const isToday = isSameDay(day, today)
              const dayEvents = allEvents
                .filter(e => isSameDay(new Date(e.scheduledAt), day))
                .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

              return (
                <div
                  key={day.toISOString()}
                  className={`
                    min-h-[112px] space-y-1 rounded-xl p-1.5
                    ${isToday
                      ? "bg-blue-50 ring-1 ring-blue-200"
                      : "bg-slate-50/70"}
                  `}
                >
                  {dayEvents.length === 0 && (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-[10px] text-slate-300">-</span>
                    </div>
                  )}
                  {dayEvents.slice(0, 4).map((ev: any) => {
                    const theme = UNIT_THEME[ev.unitType] ?? UNIT_THEME.pill
                    return (
                      <div
                        key={ev.id}
                        title={`${ev.patientName}: ${ev.brandName ?? ev.medName}${ev.strength ? ` (${ev.strength})` : ""} at ${format(new Date(ev.scheduledAt), "HH:mm")}`}
                        className={`
                          flex cursor-default items-center gap-1 rounded-lg border px-1.5 py-1
                          text-[10px] font-medium
                          ${theme.bg} ${theme.text} ${theme.border}
                        `}
                      >
                        <StatusIcon status={ev.status} />
                        <span className="truncate leading-none">
                          {ev.brandName ?? ev.medName}
                        </span>
                      </div>
                    )
                  })}
                  {dayEvents.length > 4 && (
                    <p className="text-center text-[9px] text-slate-500">+{dayEvents.length - 4} more</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Schedule list ── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">All Active Schedules</h2>
        {schedules.length === 0 ? (
          <div className="dashboard-surface py-16 text-center text-slate-500">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Calendar className="h-7 w-7 opacity-30" />
            </div>
            <p className="font-medium">No schedules yet</p>
            <p className="mt-1 text-sm">Add medications to patients to create schedules</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map(sch => {
              const unit   = (sch.patientMedication as any)?.unitType ?? "pill"
              const theme  = UNIT_THEME[unit] ?? UNIT_THEME.pill
              const Icon   = theme.icon
              const times  = parseJsonArray<string>(sch.timesOfDay, ["08:00"])
              const medName   = sch.patientMedication?.medication?.name ?? "Unknown"
              const brandName = sch.patientMedication?.medication?.brandName
              const strength  = sch.patientMedication?.medication?.strength
              const patient   = sch.patientMedication?.patient?.name ?? ""

              // Dose log summary
              const logs    = sch.doseLogs ?? []
              const total   = logs.length
              const taken   = logs.filter((l: any) => l.status === "TAKEN").length
              const missed  = logs.filter((l: any) => l.status === "MISSED").length
              const pending = logs.filter((l: any) => l.status === "PENDING").length

              return (
                <div
                  key={sch.id}
                  className="dashboard-surface flex items-center gap-4 px-5 py-4 transition-all duration-150 hover:-translate-y-px hover:shadow-[0_18px_30px_-24px_rgba(15,23,42,0.5)]"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${theme.bg} ${theme.border}`}>
                    <Icon className={`h-5 w-5 ${theme.text}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {brandName ?? medName}
                      </p>
                      {strength && <span className="shrink-0 text-xs text-slate-400">({strength})</span>}
                    </div>
                    <p className="truncate text-xs text-slate-500">{patient}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {getFrequencyLabel(times.length)}
                      </span>
                      {times.map((t, i) => (
                        <span key={i} className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${theme.bg} ${theme.text}`}>{t}</span>
                      ))}
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${sch.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {sch.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {/* Dose stats */}
                  {total > 0 && (
                    <div className="shrink-0 flex items-center gap-3 text-center">
                      <div>
                        <p className="text-sm font-semibold text-emerald-600">{taken}</p>
                        <p className="text-[9px] text-slate-500">taken</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-red-500">{missed}</p>
                        <p className="text-[9px] text-slate-500">missed</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-500">{pending}</p>
                        <p className="text-[9px] text-slate-500">pending</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

