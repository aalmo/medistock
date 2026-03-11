"use client"

import { useEffect, useState } from "react"
import {
  Calendar, Clock, CheckCircle, AlertTriangle, XCircle,
  Pill, Wind, Droplets, Syringe, Zap, Package, FlaskConical,
  ChevronLeft, ChevronRight
} from "lucide-react"
import { getFrequencyLabel, parseJsonArray } from "@/lib/calculations"
import { format, startOfWeek, addDays, isSameDay, subWeeks, addWeeks } from "date-fns"

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

const STATUS_STYLE: Record<string, { dot: string; label: string; ring: string }> = {
  TAKEN:   { dot: "bg-emerald-400", label: "text-emerald-700", ring: "ring-emerald-200" },
  MISSED:  { dot: "bg-red-400",     label: "text-red-700",     ring: "ring-red-200" },
  SKIPPED: { dot: "bg-gray-400",    label: "text-gray-500",    ring: "ring-gray-200" },
  PENDING: { dot: "bg-blue-400 animate-pulse", label: "text-blue-600", ring: "ring-blue-200" },
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
    <div className="space-y-4 animate-pulse max-w-5xl">
      <div className="h-10 w-64 bg-muted rounded-xl" />
      <div className="h-72 bg-muted rounded-2xl" />
      <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}</div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Schedules</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Weekly dose calendar for all patients</p>
      </div>

      {/* ── Weekly Calendar ── */}
      <div className="
        bg-white rounded-2xl overflow-hidden
        shadow-[0_4px_24px_-4px_rgba(0,0,0,0.09),0_1px_4px_rgba(0,0,0,0.04)]
      ">
        {/* calendar header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {format(weekStart, "MMMM d")} – {format(addDays(weekStart, 6), "MMMM d, yyyy")}
            </h2>
            {weekOffset === 0 && <p className="text-xs text-muted-foreground">Current week</p>}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset(o => o - 1)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="h-8 px-2.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setWeekOffset(o => o + 1)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* day columns */}
        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-3">
            {weekDays.map(d => {
              const isToday = isSameDay(d, today)
              return (
                <div key={d.toISOString()} className="text-center">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {format(d, "EEE")}
                  </p>
                  <div className={`
                    mx-auto mt-1 w-7 h-7 rounded-full flex items-center justify-center
                    text-sm font-bold
                    ${isToday
                      ? "bg-blue-600 text-white shadow-[0_2px_8px_rgba(59,130,246,0.4)]"
                      : "text-gray-700"}
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
                    min-h-[110px] rounded-xl p-1.5 space-y-1
                    ${isToday
                      ? "bg-blue-50 ring-1 ring-blue-200"
                      : "bg-gray-50/60"}
                  `}
                >
                  {dayEvents.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[10px] text-gray-300">—</span>
                    </div>
                  )}
                  {dayEvents.slice(0, 4).map((ev: any) => {
                    const theme = UNIT_THEME[ev.unitType] ?? UNIT_THEME.pill
                    const Icon = theme.icon
                    return (
                      <div
                        key={ev.id}
                        title={`${ev.patientName}: ${ev.brandName ?? ev.medName}${ev.strength ? ` (${ev.strength})` : ""} at ${format(new Date(ev.scheduledAt), "HH:mm")}`}
                        className={`
                          flex items-center gap-1 px-1.5 py-1 rounded-lg
                          border text-[10px] font-medium
                          ${theme.bg} ${theme.text} ${theme.border}
                          cursor-default
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
                    <p className="text-[9px] text-center text-muted-foreground">+{dayEvents.length - 4} more</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Schedule list ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">All Active Schedules</h2>
        {schedules.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
              <Calendar className="w-7 h-7 opacity-30" />
            </div>
            <p className="font-medium">No schedules yet</p>
            <p className="text-sm mt-1">Add medications to patients to create schedules</p>
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
                  className="
                    bg-white rounded-2xl px-5 py-4
                    shadow-[0_2px_12px_-2px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.04)]
                    hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.10)] hover:-translate-y-px
                    transition-all duration-150
                    flex items-center gap-4
                  "
                >
                  <div className={`shrink-0 w-10 h-10 rounded-xl ${theme.bg} border ${theme.border} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${theme.text}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {brandName ?? medName}
                      </p>
                      {strength && <span className="text-xs text-gray-400 shrink-0">({strength})</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{patient}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                        {getFrequencyLabel(times.length)}
                      </span>
                      {times.map((t, i) => (
                        <span key={i} className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${theme.bg} ${theme.text}`}>{t}</span>
                      ))}
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${sch.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {sch.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {/* Dose stats */}
                  {total > 0 && (
                    <div className="shrink-0 flex items-center gap-3 text-center">
                      <div>
                        <p className="text-sm font-bold text-emerald-600">{taken}</p>
                        <p className="text-[9px] text-muted-foreground">taken</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-red-500">{missed}</p>
                        <p className="text-[9px] text-muted-foreground">missed</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-blue-500">{pending}</p>
                        <p className="text-[9px] text-muted-foreground">pending</p>
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

