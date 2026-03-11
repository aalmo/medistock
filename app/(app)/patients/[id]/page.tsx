"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Pill, Edit, Trash2, AlertTriangle, CheckCircle, Wind, Droplets, Syringe, Zap, Package, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getInitials, calculateAge, formatDate, formatDateTime } from "@/lib/utils"
import { calcAvgDailyPills, calcDaysRemaining, getStockStatus, getFrequencyLabel, parseJsonArray, unitLabel, computeContainersRemaining } from "@/lib/calculations"
import { AddMedicationDialog } from "@/components/patients/AddMedicationDialog"
import { EditMedicationDialog } from "@/components/patients/EditMedicationDialog"
import { useToast } from "@/hooks/use-toast"

// ── Color palette per unit type ──────────────────────────────────────────────
const UNIT_THEME: Record<string, {
  gradient: string
  iconBg: string
  iconColor: string
  accent: string
  icon: React.ElementType
}> = {
  pill:        { gradient: "from-violet-500 to-purple-600",   iconBg: "bg-violet-100",  iconColor: "text-violet-600",  accent: "violet",  icon: Pill },
  tablet:      { gradient: "from-blue-500 to-indigo-600",     iconBg: "bg-blue-100",    iconColor: "text-blue-600",    accent: "blue",    icon: Pill },
  inhalation:  { gradient: "from-sky-500 to-cyan-600",        iconBg: "bg-sky-100",     iconColor: "text-sky-600",     accent: "sky",     icon: Wind },
  ml:          { gradient: "from-teal-500 to-emerald-600",    iconBg: "bg-teal-100",    iconColor: "text-teal-600",    accent: "teal",    icon: FlaskConical },
  drop:        { gradient: "from-cyan-500 to-blue-500",       iconBg: "bg-cyan-100",    iconColor: "text-cyan-600",    accent: "cyan",    icon: Droplets },
  patch:       { gradient: "from-amber-500 to-orange-500",    iconBg: "bg-amber-100",   iconColor: "text-amber-600",   accent: "amber",   icon: Zap },
  injection:   { gradient: "from-rose-500 to-pink-600",       iconBg: "bg-rose-100",    iconColor: "text-rose-600",    accent: "rose",    icon: Syringe },
  other:       { gradient: "from-slate-500 to-gray-600",      iconBg: "bg-slate-100",   iconColor: "text-slate-600",   accent: "slate",   icon: Package },
}

const STATUS_CONFIG = {
  critical: { bar: "bg-red-500",    ring: "ring-red-300",    glow: "shadow-red-100",   label: "Critical",  labelClass: "bg-red-100 text-red-700 border-red-200" },
  low:      { bar: "bg-amber-400",  ring: "ring-amber-300",  glow: "shadow-amber-100", label: "Low Stock", labelClass: "bg-amber-100 text-amber-700 border-amber-200" },
  ok:       { bar: "bg-emerald-500",ring: "ring-emerald-200",glow: "shadow-green-50",  label: "In Stock",  labelClass: "bg-emerald-100 text-emerald-700 border-emerald-200" },
}

export default function PatientDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const [patient, setPatient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [addMedOpen, setAddMedOpen] = useState(false)
  const [editingPm, setEditingPm] = useState<any>(null)

  const fetchPatient = () => {
    fetch(`/api/patients/${params.id}`)
      .then(r => r.json())
      .then(d => setPatient(d.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPatient() }, [params.id])

  const handleMarkDose = async (doseLogId: string, status: "TAKEN" | "SKIPPED") => {
    const res = await fetch(`/api/schedules/${doseLogId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, takenAt: new Date().toISOString() })
    })
    if (res.ok) {
      toast({ title: status === "TAKEN" ? "Dose marked as taken ✓" : "Dose skipped" })
      fetchPatient()
    }
  }

  const handleDeleteMedication = async (pmId: string, medName: string) => {
    if (!confirm(`Remove ${medName} from this patient? This will delete all schedules and dose logs.`)) return
    const res = await fetch(`/api/medications/${pmId}`, { method: "DELETE" })
    if (res.ok) {
      toast({ title: `${medName} removed` })
      fetchPatient()
    } else {
      toast({ title: "Failed to remove medication", variant: "destructive" })
    }
  }

  if (loading) return (
    <div className="max-w-6xl space-y-5 animate-pulse">
      <div className="h-24 rounded-2xl bg-muted" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {[1,2,3].map(i => <div key={i} className="h-56 rounded-2xl bg-muted" />)}
      </div>
    </div>
  )
  if (!patient) return <div className="text-center py-16 text-muted-foreground">Patient not found</div>

  const age = calculateAge(patient.dob)

  return (
    <div className="relative max-w-6xl space-y-6 pb-4">
      <div className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-44 rounded-3xl bg-gradient-to-r from-blue-100/40 via-violet-100/40 to-cyan-100/40 blur-2xl" />
      {/* ── Header ── */}
      <div className="dashboard-surface flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/patients"><Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <Avatar className="h-14 w-14 ring-2 ring-white shadow-md">
            <AvatarImage src={patient.avatarUrl ?? ""} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-lg font-semibold text-white">
              {getInitials(patient.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{patient.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {age !== null && <span className="text-sm text-slate-500">Age {age}</span>}
              {patient.gender && <Badge variant="outline" className="text-xs">{patient.gender}</Badge>}
              {patient.dob && <span className="text-sm text-slate-500">- DOB: {formatDate(patient.dob)}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAddMedOpen(true)} className="rounded-xl border-slate-200 bg-white shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Add Medication
          </Button>
          <Link href={`/patients/${patient.id}/edit`}>
            <Button variant="outline" className="rounded-xl border-slate-200 bg-white shadow-sm"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
          </Link>
        </div>
      </div>

      {patient.notes && (
        <div className="dashboard-surface flex items-start gap-2 border-amber-200/70 bg-amber-50/70 px-4 py-3 text-sm text-amber-800">
          <span className="mt-0.5">📋</span>
          <span>{patient.notes}</span>
        </div>
      )}

      <Tabs defaultValue="medications">
        <TabsList className="dashboard-surface grid h-auto w-full grid-cols-1 gap-1 p-1 sm:grid-cols-3">
          <TabsTrigger value="medications">Medications ({patient.patientMedications.length})</TabsTrigger>
          <TabsTrigger value="today">Today's Doses</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* ── Medications Tab ── */}
        <TabsContent value="medications" className="mt-6">
          {patient.patientMedications.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                <Pill className="w-8 h-8 opacity-30" />
              </div>
              <p className="font-medium">No medications added yet</p>
              <p className="text-sm mt-1">Click "Add Medication" to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {patient.patientMedications.map((pm: any) => {
                const avgDaily = pm.schedules.reduce((s: number, sch: any) =>
                  s + calcAvgDailyPills({
                    timesOfDay: parseJsonArray(sch.timesOfDay, ['08:00']),
                    daysOfWeek: parseJsonArray(sch.daysOfWeek, [1,2,3,4,5,6,7]),
                    pillsPerDose: sch.pillsPerDose,
                    startDate: new Date(sch.startDate)
                  }), 0)

                const daysLeft   = calcDaysRemaining(pm.pillsInStock, avgDaily)
                const status     = getStockStatus(pm.pillsInStock, avgDaily, pm.lowStockThreshold)
                const stockPct   = Math.min(100, avgDaily > 0 ? (daysLeft / (pm.lowStockThreshold * 2)) * 100 : 100)
                const unit       = pm.unitType ?? 'pill'
                const theme      = UNIT_THEME[unit] ?? UNIT_THEME.other
                const statusCfg  = STATUS_CONFIG[status]
                const Icon       = theme.icon
                const containersLeft = ["inhalation","ml","drop","injection"].includes(unit) && pm.dosesPerContainer > 0
                  ? computeContainersRemaining(pm.pillsInStock, pm.dosesPerContainer)
                  : null

                const schedule   = pm.schedules[0]
                const times      = schedule ? parseJsonArray<string>(schedule.timesOfDay, ['08:00']) : []

                // Build display strings
                const medTitle   = pm.medication.brandName && pm.medication.brandName !== pm.medication.name
                  ? pm.medication.brandName
                  : pm.medication.name
                const genericLine = pm.medication.genericName && pm.medication.genericName !== pm.medication.name
                  ? pm.medication.genericName
                  : pm.medication.brandName && pm.medication.brandName !== pm.medication.name
                    ? pm.medication.name
                    : null
                const strengthStr = pm.medication.strength ?? null
                const doseDisplay = schedule
                  ? `${schedule.pillsPerDose} ${unitLabel(unit, schedule.pillsPerDose)}${strengthStr ? ` (${schedule.pillsPerDose === 1 ? strengthStr : `${schedule.pillsPerDose}× ${strengthStr}`})` : ''}`
                  : null

                return (
                  <div
                    key={pm.id}
                    className={`
                      dashboard-surface relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_36px_-24px_rgba(15,23,42,0.42)]
                      ${status === 'critical' ? 'border-red-200/80' : status === 'low' ? 'border-amber-200/80' : ''}
                    `}
                  >
                    {/* ── Coloured top stripe ── */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${theme.gradient}`} />

                    <div className="p-6">
                      {/* ── Top row: icon + name + actions ── */}
                      <div className="flex items-start justify-between gap-4">

                        {/* Left: icon + name block */}
                        <div className="flex min-w-0 items-start gap-3">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${theme.iconBg} shadow-sm`}>
                            <Icon className={`h-5 w-5 ${theme.iconColor}`} />
                          </div>

                          <div className="min-w-0">
                            {/* Brand / Primary name */}
                            <h3 className="truncate text-base font-semibold leading-tight text-slate-900">
                              {medTitle}
                              {strengthStr && (
                                <span className="ml-1.5 text-sm font-medium text-slate-500">({strengthStr})</span>
                              )}
                            </h3>

                            {/* Generic name */}
                            {genericLine && (
                              <p className="mt-0.5 truncate text-xs italic text-slate-500">{genericLine}</p>
                            )}

                            {/* Dosage + strength per dose */}
                            {doseDisplay && (
                              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                <Icon className={`h-3 w-3 ${theme.iconColor}`} />
                                {doseDisplay}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: status badge + actions */}
                        <div className="flex shrink-0 items-center gap-1">
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusCfg.labelClass}`}>
                            {statusCfg.label}
                          </span>
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-gray-700 hover:bg-gray-100"
                            onClick={() => setEditingPm(pm)} title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteMedication(pm.id, pm.medication.name)} title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* ── Stats row ── */}
                      <div className="mt-5 grid grid-cols-3 gap-3">
                        {/* Stock */}
                        <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                          <p className="text-xl font-semibold leading-none text-slate-900">
                            {pm.pillsInStock % 1 === 0 ? pm.pillsInStock : pm.pillsInStock.toFixed(1)}
                          </p>
                          <p className="mt-1 text-[10px] leading-tight text-slate-500">
                            {unitLabel(unit)}
                            {containersLeft !== null && (
                              <span className={`block font-medium ${theme.iconColor}`}>
                                ~{containersLeft.toFixed(1)} containers
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Days */}
                        <div className={`rounded-xl px-3 py-3 text-center ${
                          status === 'critical' ? 'bg-red-50' : status === 'low' ? 'bg-amber-50' : 'bg-emerald-50'
                        }`}>
                          <p className={`text-xl font-semibold leading-none ${
                            status === 'critical' ? 'text-red-600' : status === 'low' ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            {isFinite(daysLeft) ? daysLeft : "∞"}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-500">days left</p>
                        </div>

                        {/* Per day */}
                        <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                          <p className="text-xl font-semibold leading-none text-slate-900">{avgDaily.toFixed(1)}</p>
                          <p className="mt-1 text-[10px] text-slate-500">{unitLabel(unit)}/day</p>
                        </div>
                      </div>

                      {/* ── Progress bar ── */}
                      <div className="mt-4">
                        <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                          <span>Stock level</span>
                          <span>{Math.round(stockPct)}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${statusCfg.bar}`}
                            style={{ width: `${stockPct}%` }}
                          />
                        </div>
                      </div>

                      {/* ── Schedule strip ── */}
                      {schedule && times.length > 0 && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {getFrequencyLabel(times.length)}
                          </span>
                          {times.map((t: string, i: number) => (
                            <span key={i} className={`rounded-md px-2 py-0.5 font-mono text-[11px] ${theme.iconBg} ${theme.iconColor}`}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* ── Tags ── */}
                      {(() => {
                        const rawTags = (pm.medication as any).tags
                        const tagList: string[] = Array.isArray(rawTags)
                          ? rawTags
                          : typeof rawTags === "string"
                          ? parseJsonArray<string>(rawTags, [])
                          : []
                        return tagList.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {tagList.map((tag: string) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-600 border border-blue-100"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null
                      })()}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Today's Doses Tab ── */}
        <TabsContent value="today" className="mt-5 space-y-3">
          {patient.patientMedications.flatMap((pm: any) =>
            pm.schedules.flatMap((sch: any) =>
              sch.doseLogs
                .filter((log: any) => new Date(log.scheduledAt).toDateString() === new Date().toDateString())
                .map((log: any) => {
                  const unit = pm.unitType ?? 'pill'
                  const theme = UNIT_THEME[unit] ?? UNIT_THEME.other
                  const Icon = theme.icon
                  return (
                    <div key={log.id} className="dashboard-surface flex items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${theme.iconBg}`}>
                          <Icon className={`h-4 w-4 ${theme.iconColor}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{pm.medication.name}
                            {pm.medication.strength && <span className="ml-1 font-normal text-slate-500">({pm.medication.strength})</span>}
                          </p>
                          <p className="text-xs text-slate-500">{formatDateTime(log.scheduledAt)} - {sch.pillsPerDose} {unitLabel(unit, sch.pillsPerDose)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {log.status === "TAKEN" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            <CheckCircle className="w-3 h-3" /> Taken
                          </span>
                        ) : log.status === "MISSED" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3" /> Missed
                          </span>
                        ) : (
                          <div className="flex gap-1.5">
                            <Button size="sm" className="h-7 text-xs rounded-lg" onClick={() => handleMarkDose(log.id, "TAKEN")}>✓ Taken</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => handleMarkDose(log.id, "SKIPPED")}>Skip</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
            )
          )}
          {patient.patientMedications.flatMap((pm: any) => pm.schedules.flatMap((s: any) => s.doseLogs.filter((l: any) => new Date(l.scheduledAt).toDateString() === new Date().toDateString()))).length === 0 && (
            <div className="dashboard-surface py-12 text-center text-slate-500">
              <CheckCircle className="mx-auto mb-3 h-10 w-10 opacity-20" />
              <p className="font-medium">No doses scheduled for today</p>
            </div>
          )}
        </TabsContent>

        {/* ── History Tab ── */}
        <TabsContent value="history" className="mt-5 space-y-2.5">
          {patient.patientMedications.flatMap((pm: any) =>
            pm.schedules.flatMap((sch: any) =>
              sch.doseLogs.map((log: any) => (
                <div key={log.id} className="dashboard-surface flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="w-36 shrink-0 text-xs text-slate-500">{formatDateTime(log.scheduledAt)}</span>
                  <span className="flex-1 truncate font-medium text-slate-900">{pm.medication.name}
                    {pm.medication.strength && <span className="ml-1 text-xs font-normal text-slate-500">({pm.medication.strength})</span>}
                  </span>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    log.status === "TAKEN"   ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                    log.status === "MISSED"  ? "bg-red-100 text-red-700 border-red-200" :
                                              "bg-gray-100 text-gray-600 border-gray-200"
                  }`}>{log.status}</span>
                </div>
              ))
            )
          )}
        </TabsContent>
      </Tabs>

      <AddMedicationDialog
        patientId={patient.id}
        open={addMedOpen}
        onClose={() => { setAddMedOpen(false); fetchPatient() }}
      />
      <EditMedicationDialog
        pm={editingPm}
        open={!!editingPm}
        onClose={() => { setEditingPm(null); fetchPatient() }}
      />
    </div>
  )
}
