"use client"

import { useEffect, useState, useCallback } from "react"
import { format, differenceInDays, isPast } from "date-fns"
import {
  Package, Plus, Trash2, Pencil, X, Check, ChevronDown, ChevronUp,
  CalendarClock, Boxes, ShieldAlert, Timer, ShieldCheck, Clock4
} from "lucide-react"
import { useT } from "@/lib/i18n/context"

// ── Types ─────────────────────────────────────────────────────────────────
interface MedPackage {
  id:                  string
  patientMedicationId: string
  lotNumber:           string | null
  expiryDate:          string
  quantity:            number
  unitType:            string
  opened:              boolean
  notes:               string | null
  patientMedication: {
    medication: { name: string; brandName: string | null; strength: string | null }
    patient:    { id: string; name: string }
  }
}

// ── Status helpers ────────────────────────────────────────────────────────
function getExpStatus(expiryDate: string, alertDays = 30) {
  const exp  = new Date(expiryDate)
  const now  = new Date()
  const days = differenceInDays(exp, now)
  if (isPast(exp))                               return { key: "expired",  label: "Expired",  days, color: "#ef4444", bg: "bg-red-50",    border: "border-red-200",    badge: "bg-red-500 text-white",   icon: ShieldAlert }
  if (days <= 7)                                 return { key: "critical", label: "Critical", days, color: "#ef4444", bg: "bg-red-50",    border: "border-red-200",    badge: "bg-red-500 text-white",   icon: Clock4 }
  if (days <= alertDays)                         return { key: "warning",  label: "Warning",  days, color: "#f59e0b", bg: "bg-amber-50",  border: "border-amber-200",  badge: "bg-amber-400 text-white", icon: Timer }
  return                                                { key: "good",    label: "Good",     days, color: "#10b981", bg: "bg-emerald-50",border: "border-emerald-200",badge: "bg-emerald-500 text-white",icon: ShieldCheck }
}

// ── Add/Edit modal ────────────────────────────────────────────────────────
interface PatientMed {
  id: string
  unitType: string
  medication: { name: string; brandName: string | null; strength: string | null }
  patient:    { id: string; name: string }
}

function PackageModal({
  onClose, onSaved, editPkg, patientMeds
}: {
  onClose: () => void
  onSaved: () => void
  editPkg?: MedPackage | null
  patientMeds: PatientMed[]
}) {
  const { t } = useT()
  const [form, setForm] = useState({
    patientMedicationId: editPkg?.patientMedicationId ?? (patientMeds[0]?.id ?? ""),
    expiryDate:          editPkg ? format(new Date(editPkg.expiryDate), "yyyy-MM-dd") : "",
    quantity:            editPkg?.quantity ?? 1,
    lotNumber:           editPkg?.lotNumber ?? "",
    opened:              editPkg?.opened ?? false,
    notes:               editPkg?.notes ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  const selectedPm = patientMeds.find(p => p.id === form.patientMedicationId)

  const save = async () => {
    if (!form.patientMedicationId || !form.expiryDate) { setError("Medication and expiry date are required."); return }
    setSaving(true); setError("")
      try {
        const url    = editPkg ? `/api/packages/${editPkg.id}` : "/api/packages"
        const method = editPkg ? "PATCH" : "POST"
        const res    = await fetch(url, {
          method, headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            quantity:  Number(form.quantity),
            unitType:  selectedPm?.unitType ?? "pill",
          }),
        })
        if (!res.ok) { setError("Failed to save package. Please try again."); return }
        onSaved()
      } catch { setError("Failed to save package. Please try again.") }
    finally   { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_26px_60px_-28px_rgba(15,23,42,0.55)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100">
              <Package className="h-4 w-4 text-violet-600" />
            </div>
            <p className="font-semibold text-slate-900">{editPkg ? t.packages.editPackage : t.packages.addPackage}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {error && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          {/* Medication selector */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t.packages.medication}</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              value={form.patientMedicationId}
              onChange={e => setForm(f => ({ ...f, patientMedicationId: e.target.value }))}
              disabled={!!editPkg}
            >
              {patientMeds.map(pm => (
                <option key={pm.id} value={pm.id}>
                  {pm.patient.name} — {pm.medication.brandName ?? pm.medication.name}{pm.medication.strength ? ` (${pm.medication.strength})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Expiry date + quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t.packages.expiryDate} *</label>
              <input type="date"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                value={form.expiryDate}
                onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Quantity ({selectedPm?.unitType ?? "units"})
              </label>
              <input type="number" min={0.5} step={0.5}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
              />
            </div>
          </div>

          {/* Lot number */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t.packages.lotNumber}</label>
            <input type="text" placeholder={t.packages.lotPlaceholder}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              value={form.lotNumber}
              onChange={e => setForm(f => ({ ...f, lotNumber: e.target.value }))}
            />
          </div>

          {/* Opened toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{t.packages.opened}</p>
              <p className="text-xs text-slate-500">{t.packages.openedDesc}</p>
            </div>
            <button onClick={() => setForm(f => ({ ...f, opened: !f.opened }))}
              className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${form.opened ? "bg-violet-600" : "bg-slate-300"}`}>
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${form.opened ? "translate-x-5" : ""}`} />
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t.common.notes}</label>
            <textarea rows={2} placeholder={t.common.optional + "..."}
              className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100">
            {t.common.cancel}
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-blue-700 disabled:opacity-60">
            {saving
              ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"/>{t.common.saving}</>
              : <><Check className="h-3.5 w-3.5"/>{editPkg ? t.common.save : t.packages.addPackage}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function PackagesPage() {
  const [packages,    setPackages]    = useState<MedPackage[]>([])
  const [patientMeds, setPatientMeds] = useState<PatientMed[]>([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState<"add" | "edit" | null>(null)
  const [editTarget,  setEditTarget]  = useState<MedPackage | null>(null)
  const [filter,      setFilter]      = useState<"all" | "expired" | "critical" | "warning" | "good">("all")
  const [expandedPm,  setExpandedPm]  = useState<string | null>(null)
  const [alertDays,   setAlertDays]   = useState(30)
  const [deleting,    setDeleting]    = useState<string | null>(null)
  const { t } = useT()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pkgRes, pmRes, settingsRes] = await Promise.all([
        fetch("/api/packages"),
        fetch("/api/patients"),
        fetch("/api/settings"),
      ])
      const pkgData      = await pkgRes.json()
      const settingsData = await settingsRes.json()
      if (settingsData.data?.expiryAlertDays) setAlertDays(settingsData.data.expiryAlertDays)

      setPackages(pkgData.data ?? [])

      // Flatten patients → patientMedications
      if (pmRes.ok) {
        const pd = await pmRes.json()
        const pms: PatientMed[] = []
        for (const pt of pd.data ?? []) {
          for (const pm of pt.patientMedications ?? []) {
            pms.push({ id: pm.id, unitType: pm.unitType, medication: pm.medication, patient: { id: pt.id, name: pt.name } })
          }
        }
        setPatientMeds(pms)
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    // Trigger expiry check inline
    fetch("/api/cron/expiry-check", { method: "POST" }).catch(() => {})
  }, [load])

  const deletePackage = async (id: string) => {
    if (!confirm("Delete this package?")) return
    setDeleting(id)
    await fetch(`/api/packages/${id}`, { method: "DELETE" })
    setPackages(p => p.filter(pkg => pkg.id !== id))
    setDeleting(null)
  }

  // ── Computed ──
  const filtered = filter === "all" ? packages : packages.filter(p => getExpStatus(p.expiryDate, alertDays).key === filter)
  const expiredCount  = packages.filter(p => getExpStatus(p.expiryDate, alertDays).key === "expired").length
  const criticalCount = packages.filter(p => getExpStatus(p.expiryDate, alertDays).key === "critical").length
  const warningCount  = packages.filter(p => getExpStatus(p.expiryDate, alertDays).key === "warning").length
  const goodCount     = packages.filter(p => getExpStatus(p.expiryDate, alertDays).key === "good").length

  // Group by patient+medication
  const grouped = new Map<string, { label: string; patientName: string; medName: string; pmId: string; items: MedPackage[] }>()
  for (const pkg of filtered) {
    const key = pkg.patientMedicationId
    const med = pkg.patientMedication.medication
    const pat = pkg.patientMedication.patient
    if (!grouped.has(key)) grouped.set(key, {
      pmId:        key,
      label:       `${pat.name} — ${med.brandName ?? med.name}${med.strength ? ` (${med.strength})` : ""}`,
      patientName: pat.name,
      medName:     med.brandName ?? med.name,
      items:       [],
    })
    grouped.get(key)!.items.push(pkg)
  }

  // ── Days until worst package ──
  const nextExpiry = packages
    .filter(p => !isPast(new Date(p.expiryDate)))
    .sort((a,b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0]

  return (
    <div className="relative w-full space-y-5 pb-3">
      <div className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-44 rounded-3xl bg-gradient-to-r from-violet-100/40 via-indigo-100/40 to-sky-100/40 blur-2xl" />

      {/* ── Header ── */}
      <div className="dashboard-surface flex items-center justify-between p-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t.packages.title}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">{t.packages.subtitle}</p>
        </div>
        <button onClick={() => { setEditTarget(null); setModal("add") }}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_-12px_rgba(109,40,217,0.7)] transition-all hover:-translate-y-px hover:shadow-[0_16px_28px_-12px_rgba(109,40,217,0.75)]">
          <Plus className="h-4 w-4" /> {t.packages.addPackage}
        </button>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { key: "expired",  label: t.packages.expired,          value: expiredCount,  gradient: "from-red-500 to-rose-600",     accent: "text-red-700",    icon: ShieldAlert },
          { key: "critical", label: t.packages.criticalLabel,     value: criticalCount, gradient: "from-red-400 to-orange-500",   accent: "text-orange-700", icon: Clock4 },
          { key: "warning",  label: `${t.packages.warningLabel} (<${alertDays}d)`, value: warningCount, gradient: "from-amber-400 to-yellow-500", accent: "text-amber-700", icon: Timer },
          { key: "good",     label: t.packages.goodLabel,         value: goodCount,     gradient: "from-emerald-500 to-teal-600", accent: "text-emerald-700",icon: ShieldCheck },
        ].map(kpi => (
          <button key={kpi.key}
            onClick={() => setFilter(f => f === kpi.key ? "all" : kpi.key as typeof filter)}
            className={`dashboard-surface group relative overflow-hidden p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_42px_-22px_rgba(15,23,42,0.45)]
              ${filter === kpi.key ? "ring-2 ring-violet-500/80 ring-offset-1" : ""}`}>
            <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${kpi.gradient} opacity-[0.07] transition-transform duration-500 group-hover:scale-110`}/>
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{kpi.label}</p>
                <p className={`mt-2 text-4xl font-semibold leading-none tracking-tight ${kpi.accent}`}>{kpi.value}</p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${kpi.gradient} shadow-[0_6px_16px_-8px_rgba(15,23,42,0.45)]`}>
                <kpi.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Next expiry banner ── */}
      {nextExpiry && (() => {
        const s = getExpStatus(nextExpiry.expiryDate, alertDays)
        const med = nextExpiry.patientMedication.medication
        const pat = nextExpiry.patientMedication.patient
        if (s.key === "good") return null
        return (
          <div className={`dashboard-surface flex items-center gap-4 px-5 py-4 ${s.bg} border ${s.border}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
              <s.icon className="h-5 w-5" style={{ color: s.color }} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {pat.name}'s {med.brandName ?? med.name}{med.strength ? ` (${med.strength})` : ""}
                {nextExpiry.lotNumber ? <span className="font-normal text-slate-500"> · Lot {nextExpiry.lotNumber}</span> : ""}
              </p>
              <p className="mt-0.5 text-xs font-medium" style={{ color: s.color }}>
                {s.key === "expired"
                  ? `${t.packages.expired} ${Math.abs(s.days)} ${t.common.daysAgo} — ${t.packages.disposeNow}`
                  : `${t.packages.expiresIn} ${s.days} ${t.common.days} — ${format(new Date(nextExpiry.expiryDate), "dd MMM yyyy")}`}
              </p>
            </div>
            <CalendarClock className="h-5 w-5 shrink-0" style={{ color: s.color }}/>
          </div>
        )
      })()}

      {/* ── Filter bar ── */}
      <div className="dashboard-surface p-1.5">
        <div className="flex rounded-xl bg-slate-100 p-0.5 text-sm">
          {(["all","expired","critical","warning","good"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 rounded-[10px] px-3 py-1.5 font-semibold capitalize transition-all ${filter === f ? "bg-white text-slate-900 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.35)]" : "text-slate-500 hover:text-slate-700"}`}>
              {f === "all" ? `${t.packages.filterAll} (${packages.length})` : f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grouped list ── */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_,i) => <div key={i} className="h-24 rounded-2xl bg-slate-100"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="dashboard-surface py-20 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
            <Boxes className="h-7 w-7 text-violet-300" />
          </div>
          <p className="font-semibold text-slate-700">{t.packages.noPackages}</p>
          <p className="mt-1 text-xs text-slate-500">{t.packages.noPackagesHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(grouped.values()).map(group => {
            const isExpanded = expandedPm === group.pmId
            const earliestPkg = group.items
              .slice()
              .sort((a: MedPackage, b: MedPackage) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0]
            const ws = getExpStatus(earliestPkg.expiryDate, alertDays)

            return (
              <div key={group.pmId} className="dashboard-surface overflow-hidden border-slate-200/80">
                {/* Group header */}
                <button
                  onClick={() => setExpandedPm(isExpanded ? null : group.pmId)}
                  className="flex w-full items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70"
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ws.bg} shadow-sm`}>
                    <ws.icon className="h-5 w-5" style={{ color: ws.color }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-slate-900">{group.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{group.items.length} package{group.items.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${ws.badge}`}>
                      {ws.label}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400"/> : <ChevronDown className="h-4 w-4 text-slate-400"/>}
                  </div>
                </button>

                {/* Expanded packages */}
                {isExpanded && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {group.items
                      .slice()
                      .sort((a: MedPackage, b: MedPackage) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                      .map((pkg: MedPackage) => {
                        const s      = getExpStatus(pkg.expiryDate, alertDays)
                        const expFmt = format(new Date(pkg.expiryDate), "dd MMM yyyy")
                        return (
                          <div key={pkg.id} className={`flex items-center gap-4 px-5 py-4 ${s.bg}`}>
                            {/* Days indicator */}
                            <div className="w-14 shrink-0 text-center">
                              <p className="text-xl font-semibold leading-none" style={{ color: s.color }}>
                                {s.key === "expired" ? "EXP" : s.days}
                              </p>
                              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                                {s.key === "expired" ? t.common.daysAgo : t.common.daysLeft}
                              </p>
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${s.badge}`}>{s.label}</span>
                                {pkg.opened && <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">Opened</span>}
                                {pkg.lotNumber && <span className="font-mono text-[10px] text-slate-500">Lot: {pkg.lotNumber}</span>}
                              </div>
                              <p className="mt-1 text-xs text-slate-600">
                                <span className="font-semibold">{pkg.quantity} {pkg.unitType}{pkg.quantity !== 1 ? "s" : ""}</span>
                                <span className="text-slate-500"> - Expires {expFmt}</span>
                              </p>
                              {pkg.notes && <p className="mt-0.5 text-[11px] italic text-slate-500">{pkg.notes}</p>}
                            </div>

                            {/* Actions */}
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                onClick={() => { setEditTarget(pkg); setModal("edit") }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/90"
                                title="Edit package"
                              >
                                <Pencil className="h-3.5 w-3.5 text-slate-500"/>
                              </button>
                              <button
                                onClick={() => deletePackage(pkg.id)}
                                disabled={deleting === pkg.id}
                                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                                title="Delete package"
                              >
                                {deleting === pkg.id
                                  ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-200 border-t-red-500"/>
                                  : <Trash2 className="h-3.5 w-3.5 text-red-400"/>
                                }
                              </button>
                            </div>
                          </div>
                        )
                      })}

                    {/* Add package to this medication */}
                    <button
                      onClick={() => {
                        const pm = patientMeds.find(p => p.id === group.pmId)
                        if (pm) {
                          setEditTarget(null)
                          setModal("add")
                        }
                      }}
                      className="flex w-full items-center gap-2 px-5 py-3 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50/60"
                    >
                      <Plus className="h-3.5 w-3.5"/> Add another package for this medication
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (
        <PackageModal
          patientMeds={patientMeds}
          editPkg={modal === "edit" ? editTarget : null}
          onClose={() => { setModal(null); setEditTarget(null) }}
          onSaved={() => { setModal(null); setEditTarget(null); load() }}
        />
      )}
    </div>
  )
}


