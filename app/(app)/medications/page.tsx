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
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Medications</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{meds.length} in catalog</p>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, brand or generic…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 rounded-xl bg-white shadow-sm border-gray-200"
        />
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <Pill className="w-8 h-8 opacity-30" />
          </div>
          <p className="font-medium">No medications found</p>
          <p className="text-sm mt-1">Medications appear here once added to a patient</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                className="
                  relative rounded-2xl overflow-hidden bg-white
                  shadow-[0_4px_24px_-4px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.04)]
                  hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.06)]
                  hover:-translate-y-0.5 transition-all duration-200
                "
              >
                {/* gradient top stripe */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${theme.gradient}`} />

                <div className="p-5 space-y-4">

                  {/* ── Row 1: icon + name ── */}
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 w-11 h-11 rounded-xl ${theme.iconBg} flex items-center justify-center shadow-sm`}>
                      <Icon className={`w-5 h-5 ${theme.iconColor}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Primary name + strength inline */}
                      <h3 className="font-bold text-base leading-tight text-gray-900 truncate">
                        {headline}
                        {strength && (
                          <span className="ml-1.5 text-sm font-semibold text-gray-400">
                            ({strength})
                          </span>
                        )}
                      </h3>

                      {/* Generic / secondary name */}
                      {subGeneric && (
                        <p className="text-xs text-muted-foreground italic mt-0.5 truncate">
                          {subGeneric}
                        </p>
                      )}

                      {/* Form pill */}
                      {form && (
                        <span className="mt-1 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase tracking-wide">
                          {form}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Row 2: dosage chip ── */}
                  {doseLine && (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${theme.iconBg} ${theme.iconColor}`}>
                      <Icon className="w-3 h-3" />
                      {doseLine}
                    </div>
                  )}

                  {/* ── Row 3: schedule times ── */}
                  {times.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-md">
                        <Clock className="w-3 h-3" />
                        {getFrequencyLabel(times.length)}
                      </span>
                      {times.map((t, i) => (
                        <span key={i} className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${theme.iconBg} ${theme.iconColor}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* ── Row 4: divider + meta ── */}
                  <div className="pt-1 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">

                    {/* patient count */}
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      {patientCount === 0
                        ? <span className="text-gray-400 italic">Not assigned</span>
                        : patientCount === 1
                          ? assignments[0].patient.name
                          : `${patientCount} patients`}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* RxCUI badge */}
                      {med.rxcui && (
                        <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          RxCUI {med.rxcui}
                        </span>
                      )}

                      {/* Delete button — only shown when not assigned to any patient */}
                      {patientCount === 0 && (
                        <button
                          onClick={() => handleDelete(med.id, headline)}
                          disabled={deleting === med.id}
                          title="Delete from catalog"
                          className="
                            inline-flex items-center gap-1 text-[11px] font-medium
                            px-2 py-1 rounded-lg border border-red-200
                            text-red-500 bg-red-50
                            hover:bg-red-100 hover:text-red-700 hover:border-red-300
                            disabled:opacity-40 disabled:cursor-not-allowed
                            transition-colors
                          "
                        >
                          {deleting === med.id
                            ? <span className="w-3 h-3 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                            : <Trash2 className="w-3 h-3" />
                          }
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Row 5: ingredients (if any) ── */}
                  {med.ingredients && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      <span className="font-medium text-gray-600">Active: </span>
                      {med.ingredients}
                    </p>
                  )}

                  {/* ── Row 6: warnings strip (if any) ── */}
                  {med.warnings && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 text-[11px] text-amber-700 line-clamp-2">
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
