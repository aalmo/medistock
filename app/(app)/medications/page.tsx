"use client"

import { useEffect, useState } from "react"
import { Search, Pill, Wind, Droplets, Syringe, Zap, Package, FlaskConical, Users, Clock, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { parseJsonArray, unitLabel, getFrequencyLabel } from "@/lib/calculations"
import { useToast } from "@/hooks/use-toast"

// ── same theme map as patient detail page ──────────────────────────────────
const UNIT_THEME: Record<string, {
  gradient: string; iconBg: string; iconColor: string; icon: React.ElementType
}> = {
  pill:        { gradient: "from-violet-500 to-purple-600",  iconBg: "bg-violet-100", iconColor: "text-violet-600", icon: Pill },
  tablet:      { gradient: "from-blue-500 to-indigo-600",    iconBg: "bg-blue-100",   iconColor: "text-blue-600",   icon: Pill },
  inhalation:  { gradient: "from-sky-500 to-cyan-600",       iconBg: "bg-sky-100",    iconColor: "text-sky-600",    icon: Wind },
  ml:          { gradient: "from-teal-500 to-emerald-600",   iconBg: "bg-teal-100",   iconColor: "text-teal-600",   icon: FlaskConical },
  drop:        { gradient: "from-cyan-500 to-blue-500",      iconBg: "bg-cyan-100",   iconColor: "text-cyan-600",   icon: Droplets },
  patch:       { gradient: "from-amber-500 to-orange-500",   iconBg: "bg-amber-100",  iconColor: "text-amber-600",  icon: Zap },
  injection:   { gradient: "from-rose-500 to-pink-600",      iconBg: "bg-rose-100",   iconColor: "text-rose-600",   icon: Syringe },
  other:       { gradient: "from-slate-500 to-gray-600",     iconBg: "bg-slate-100",  iconColor: "text-slate-600",  icon: Package },
}

// derive a consistent theme from the medication's own form/unit field
function themeForMed(med: any): typeof UNIT_THEME["pill"] {
  // check patientMedications for a unitType
  const unit = med.patientMedications?.[0]?.unitType ?? med.unit ?? "pill"
  return UNIT_THEME[unit] ?? UNIT_THEME.pill
}

interface Medication {
  id: string
  name: string
  brandName: string | null
  genericName: string | null
  form: string | null
  strength: string | null
  unit: string | null
  rxcui: string | null
  ingredients: string | null
  warnings: string | null
  patientMedications: Array<{
    id: string
    unitType: string
    pillsInStock: number
    dosesPerContainer: number
    schedules: Array<{
      frequency: string
      timesOfDay: string | string[]
      pillsPerDose: number
    }>
    patient: { id: string; name: string }
  }>
}

export default function MedicationsPage() {
  const [meds, setMeds] = useState<Medication[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchMeds = () => {
    setLoading(true)
    fetch("/api/medications")
      .then(r => r.json())
      .then(d => setMeds(d.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchMeds() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" from the catalog? This cannot be undone.`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/medications/${id}`, { method: "DELETE" })
      if (res.ok) {
        setMeds(prev => prev.filter(m => m.id !== id))
        toast({ title: `"${name}" deleted from catalog` })
      } else {
        toast({ title: "Failed to delete", variant: "destructive" })
      }
    } finally {
      setDeleting(null)
    }
  }

  const filtered = meds.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.brandName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (m.genericName ?? "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative w-full space-y-6 pb-3">
      <div className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-44 rounded-3xl bg-gradient-to-r from-violet-100/40 via-indigo-100/40 to-sky-100/40 blur-2xl" />
      {/* ── Header ── */}
      <div className="dashboard-surface flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Medications</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">{meds.length} in catalog</p>
        </div>

        {/* ── Search ── */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, brand or generic..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-white pl-9 text-slate-700 shadow-sm"
          />
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="dashboard-surface py-20 text-center text-slate-500">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Pill className="h-8 w-8 opacity-30" />
          </div>
          <p className="font-medium">No medications found</p>
          <p className="mt-1 text-sm">Medications appear here once added to a patient</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(med => {
            const theme = themeForMed(med)
            const Icon  = theme.icon

            // Name logic: prefer brandName as the headline
            const headline    = med.brandName && med.brandName !== med.name ? med.brandName : med.name
            const subGeneric  = med.genericName && med.genericName !== med.name ? med.genericName
                              : med.brandName  && med.brandName  !== med.name ? med.name
                              : null
            const strength    = med.strength ?? null
            const form        = med.form ?? null

            // Aggregate patient assignments
            const assignments = med.patientMedications ?? []
            const patientCount = assignments.length

            // First assignment's schedule (most representative)
            const firstPm  = assignments[0]
            const firstSch = firstPm?.schedules?.[0]
            const unit     = firstPm?.unitType ?? med.unit ?? "pill"
            const times    = firstSch ? parseJsonArray<string>(firstSch.timesOfDay, ["08:00"]) : []
            const doseQty  = firstSch?.pillsPerDose ?? null

            // Dose line: e.g. "1 pill (400 mg)" or "2 inhalations (50 mcg × 2)"
            const doseLine = doseQty
              ? `${doseQty} ${unitLabel(unit, doseQty)}${strength
                  ? ` (${doseQty === 1 ? strength : `${doseQty}× ${strength}`})`
                  : ""}`
              : strength
                ? strength
                : null

            return (
              <div
                key={med.id}
                className="dashboard-surface relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_36px_-24px_rgba(15,23,42,0.45)]"
              >
                {/* gradient top stripe */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${theme.gradient}`} />

                <div className="space-y-4 p-6">

                  {/* ── Row 1: icon + name ── */}
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${theme.iconBg} shadow-sm`}>
                      <Icon className={`h-5 w-5 ${theme.iconColor}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Primary name + strength inline */}
                      <h3 className="truncate text-base font-semibold leading-tight text-slate-900">
                        {headline}
                        {strength && (
                          <span className="ml-1.5 text-sm font-medium text-slate-500">
                            ({strength})
                          </span>
                        )}
                      </h3>

                      {/* Generic / secondary name */}
                      {subGeneric && (
                        <p className="mt-0.5 truncate text-xs italic text-slate-500">
                          {subGeneric}
                        </p>
                      )}

                      {/* Form pill */}
                      {form && (
                        <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          {form}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Row 2: dosage chip ── */}
                  {doseLine && (
                    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${theme.iconBg} ${theme.iconColor}`}>
                      <Icon className="h-3 w-3" />
                      {doseLine}
                    </div>
                  )}

                  {/* ── Row 3: schedule times ── */}
                  {times.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        <Clock className="h-3 w-3" />
                        {getFrequencyLabel(times.length)}
                      </span>
                      {times.map((t, i) => (
                        <span key={i} className={`rounded-md px-2 py-0.5 font-mono text-[11px] ${theme.iconBg} ${theme.iconColor}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* ── Row 4: divider + meta ── */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-1.5">

                    {/* patient count */}
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <Users className="h-3.5 w-3.5" />
                      {patientCount === 0
                        ? <span className="italic text-slate-400">Not assigned</span>
                        : patientCount === 1
                          ? assignments[0].patient.name
                          : `${patientCount} patients`}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* RxCUI badge */}
                      {med.rxcui && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                          RxCUI {med.rxcui}
                        </span>
                      )}

                      {/* Delete button — only shown when not assigned to any patient */}
                      {patientCount === 0 && (
                        <button
                          onClick={() => handleDelete(med.id, headline)}
                          disabled={deleting === med.id}
                          title="Delete from catalog"
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-500 transition-colors hover:border-red-300 hover:bg-red-100 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {deleting === med.id
                            ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                            : <Trash2 className="h-3 w-3" />
                          }
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Row 5: ingredients (if any) ── */}
                  {med.ingredients && (
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                      <span className="font-medium text-slate-700">Active: </span>
                      {med.ingredients}
                    </p>
                  )}

                  {/* ── Row 6: warnings strip (if any) ── */}
                  {med.warnings && (
                    <div className="line-clamp-2 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
                      ⚠️ {med.warnings}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
