"use client"

import { useEffect, useRef, useState } from "react"
import { Search, Pill, Wind, Droplets, Syringe, Zap, Package, FlaskConical, Users, Clock, Trash2, Camera } from "lucide-react"
import { Input } from "@/components/ui/input"
import { parseJsonArray } from "@/lib/calculations"
import { useToast } from "@/hooks/use-toast"
import { useT, tUnitLabel, tFrequencyLabel } from "@/lib/i18n/context"

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
  imageUrl: string | null
  tags: string | null         // JSON array stored as string
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
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [zoomedImage, setZoomedImage] = useState<{ url: string; name: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetRef = useRef<string | null>(null)
  const { toast } = useToast()
  const { t } = useT()

  const fetchMeds = () => {
    setLoading(true)
    fetch("/api/medications")
      .then(r => r.json())
      .then(d => setMeds(d.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchMeds() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t.medications.deleteConfirm.replace("{name}", name))) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/medications/${id}`, { method: "DELETE" })
      if (res.ok) {
        setMeds(prev => prev.filter(m => m.id !== id))
        toast({ title: `"${name}" ${t.medications.deleted}` })
      } else {
        toast({ title: t.medications.deleteFailed, variant: "destructive" })
      }
    } finally {
      setDeleting(null)
    }
  }

  const triggerUpload = (medId: string) => {
    uploadTargetRef.current = medId
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const medId = uploadTargetRef.current
    if (!file || !medId) return
    e.target.value = ""
    setUploading(medId)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd })
      if (!uploadRes.ok) throw new Error("Upload failed")
      const { url } = await uploadRes.json()

      // PATCH the medication's imageUrl only
      const putRes = await fetch(`/api/medications/${medId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      })
      if (!putRes.ok) throw new Error("Save failed")
      setMeds(prev => prev.map(m => m.id === medId ? { ...m, imageUrl: url } : m))
      toast({ title: t.medications.photoUpdated })
    } catch {
      toast({ title: t.medications.uploadFailed, variant: "destructive" })
    } finally {
      setUploading(null)
    }
  }

  const allTags = Array.from(
    new Set(
      meds.flatMap(m =>
        typeof m.tags === "string" ? parseJsonArray<string>(m.tags, []) : []
      )
    )
  ).sort()

  const filtered = meds.filter(m => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.brandName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (m.genericName ?? "").toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (activeTag) {
      const tagList: string[] = typeof m.tags === "string" ? parseJsonArray<string>(m.tags, []) : []
      return tagList.includes(activeTag)
    }
    return true
  })

  return (
    <div className="relative w-full space-y-6 pb-3">
      {/* hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Lightbox modal ── */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomedImage.url}
              alt={zoomedImage.name}
              className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl"
            />
            <p className="mt-2 text-center text-sm font-medium text-white/80">{zoomedImage.name}</p>
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg text-slate-700 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-44 rounded-3xl bg-gradient-to-r from-violet-100/40 via-indigo-100/40 to-sky-100/40 blur-2xl" />
      {/* ── Header ── */}
      <div className="dashboard-surface flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t.medications.title}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">{meds.length} {t.medications.subtitle.toLowerCase()}</p>
        </div>

        {/* ── Search ── */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={t.medications.searchMeds}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-white pl-9 text-slate-700 shadow-sm"
          />
        </div>
      </div>

      {/* ── Tag filter bar ── */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
              activeTag === null
                ? "bg-slate-900 text-white border-slate-900"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            {t.medications.all}
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(prev => prev === tag ? null : tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                activeTag === tag
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              {(t.tagLabels as Record<string, string>)[tag] ?? tag}
            </button>
          ))}
        </div>
      )}

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="dashboard-surface py-20 text-center text-slate-500">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Pill className="h-8 w-8 opacity-30" />
          </div>
          <p className="font-medium">{t.medications.noMeds}</p>
          <p className="mt-1 text-sm">{t.medications.medsAppearHint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
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

            // Dose line: e.g. "1 حبة (400 mg)" or "2 استنشاق (50 mcg × 2)"
            const doseLine = doseQty
              ? `${doseQty} ${tUnitLabel(t, unit, doseQty)}${strength
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
                {/* ── Gradient top stripe ── */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${theme.gradient}`} />

                <div className="space-y-3 p-5">

                  {/* ── Row 1: icon + name + image thumbnail top-right ── */}
                  <div className="flex items-start gap-3">

                    {/* Icon */}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${theme.iconBg}`}>
                      <Icon className={`h-4 w-4 ${theme.iconColor}`} />
                    </div>

                    {/* Name block */}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate pr-2 text-base font-semibold leading-tight text-slate-900">
                        {headline}
                        {strength && (
                          <span className="ml-1.5 text-sm font-medium text-slate-500">({strength})</span>
                        )}
                      </h3>
                      {subGeneric && (
                        <p className="mt-0.5 truncate text-xs italic text-slate-500">{subGeneric}</p>
                      )}
                      {form && (
                        <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          {form}
                        </span>
                      )}
                    </div>

                    {/* ── Horizontal image thumbnail (top-right) ── */}
                    <div className="group relative -mr-5 -mt-5 shrink-0">
                      {med.imageUrl ? (
                        <>
                          {/* Thumbnail: flush to top-right of card, no border, blends in */}
                          <div
                            className="h-28 w-48 cursor-zoom-in overflow-hidden rounded-bl-2xl"
                            onClick={() => setZoomedImage({ url: med.imageUrl!, name: headline })}
                            title="Click to enlarge"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={med.imageUrl}
                              alt={headline}
                              className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                            />
                          </div>
                          {/* Camera button to change photo */}
                          <button
                            onClick={e => { e.stopPropagation(); triggerUpload(med.id) }}
                            className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-black/80"
                            title="Change photo"
                          >
                            {uploading === med.id
                              ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              : <Camera className="h-3 w-3 text-white" />
                            }
                          </button>
                        </>
                      ) : (
                        /* No image — dashed placeholder, flush to card top-right */
                        <button
                          onClick={() => triggerUpload(med.id)}
                          className="group/up flex h-28 w-48 flex-col items-center justify-center gap-1.5 rounded-bl-2xl border-b border-l border-dashed border-slate-200 bg-slate-50/60 transition-colors hover:border-slate-300 hover:bg-slate-100"
                          title="Upload photo"
                        >
                          {uploading === med.id
                            ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                            : <>
                                <Camera className="h-5 w-5 text-slate-300 transition-colors group-hover/up:text-slate-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300 transition-colors group-hover/up:text-slate-400">{t.medications.addPhoto}</span>
                              </>
                          }
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {(() => {
                    const tagList: string[] = typeof med.tags === "string"
                      ? parseJsonArray<string>(med.tags, [])
                      : []
                    return tagList.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tagList.map(tag => (
                          <button
                            key={tag}
                            onClick={() => setActiveTag(prev => prev === tag ? null : tag)}
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                              activeTag === tag
                                ? "border-blue-400 bg-blue-100 text-blue-700"
                                : "border-blue-100 bg-blue-50 text-blue-600 hover:border-blue-300"
                            }`}
                          >
                            {(t.tagLabels as Record<string, string>)[tag] ?? tag}
                          </button>
                        ))}
                      </div>
                    ) : null
                  })()}

                  {/* Dosage chip */}
                  {doseLine && (
                    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${theme.iconBg} ${theme.iconColor}`}>
                      <Icon className="h-3 w-3" />
                      {doseLine}
                    </div>
                  )}

                  {/* Schedule times */}
                  {times.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        <Clock className="h-3 w-3" />
                        {tFrequencyLabel(t, times.length)}
                      </span>
                      {times.map((t, i) => (
                        <span key={i} className={`rounded-md px-2 py-0.5 font-mono text-[11px] ${theme.iconBg} ${theme.iconColor}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Divider + meta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <Users className="h-3.5 w-3.5" />
                      {patientCount === 0
                        ? <span className="italic text-slate-400">{t.medications.notAssigned}</span>
                        : patientCount === 1
                          ? assignments[0].patient.name
                          : `${patientCount} ${t.medications.patients}`}
                    </span>
                    <div className="flex items-center gap-2">
                      {med.rxcui && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                          RxCUI {med.rxcui}
                        </span>
                      )}
                      {patientCount === 0 && (
                        <button
                          onClick={() => handleDelete(med.id, headline)}
                          disabled={deleting === med.id}
                          title={t.medications.deleteFromCatalog}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-500 transition-colors hover:border-red-300 hover:bg-red-100 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {deleting === med.id
                            ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                            : <Trash2 className="h-3 w-3" />
                          }
                          {t.medications.deleteFromCatalog}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ingredients */}
                  {med.ingredients && (
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                      <span className="font-medium text-slate-700">{t.medications.activeIngredients}: </span>
                      {med.ingredients}
                    </p>
                  )}

                  {/* Warnings */}
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
