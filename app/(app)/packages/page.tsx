"use client"

import { useEffect, useState, useCallback } from "react"
import { format, differenceInDays, isPast } from "date-fns"
import {
  Package, Plus, Trash2, Pencil, X, Check, ChevronDown, ChevronUp,
  CalendarClock, Boxes
} from "lucide-react"

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
  if (isPast(exp))                               return { key: "expired",  label: "Expired",  days, color: "#ef4444", bg: "bg-red-50",    border: "border-red-200",    badge: "bg-red-500 text-white",   icon: "💀" }
  if (days <= 7)                                 return { key: "critical", label: "Critical", days, color: "#ef4444", bg: "bg-red-50",    border: "border-red-200",    badge: "bg-red-500 text-white",   icon: "🔴" }
  if (days <= alertDays)                         return { key: "warning",  label: "Warning",  days, color: "#f59e0b", bg: "bg-amber-50",  border: "border-amber-200",  badge: "bg-amber-400 text-white", icon: "🟡" }
  return                                                { key: "good",    label: "Good",     days, color: "#10b981", bg: "bg-emerald-50",border: "border-emerald-200",badge: "bg-emerald-500 text-white",icon: "✅" }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-violet-600" />
            </div>
            <p className="font-bold text-gray-900">{editPkg ? "Edit Package" : "Add Package"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

          {/* Medication selector */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Medication</label>
            <select
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 bg-white"
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
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Expiry Date *</label>
              <input type="date"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                value={form.expiryDate}
                onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                Quantity ({selectedPm?.unitType ?? "units"})
              </label>
              <input type="number" min={0.5} step={0.5}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
              />
            </div>
          </div>

          {/* Lot number */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Lot / Batch Number</label>
            <input type="text" placeholder="e.g. LOT-2024-AB123"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              value={form.lotNumber}
              onChange={e => setForm(f => ({ ...f, lotNumber: e.target.value }))}
            />
          </div>

          {/* Opened toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50">
            <div>
              <p className="text-sm font-semibold text-gray-800">Package opened</p>
              <p className="text-xs text-gray-400">Mark if the package/bottle is already open</p>
            </div>
            <button onClick={() => setForm(f => ({ ...f, opened: !f.opened }))}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.opened ? "bg-violet-600" : "bg-gray-300"}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.opened ? "translate-x-5" : ""}`} />
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea rows={2} placeholder="Optional notes…"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-60 transition-colors shadow-sm">
            {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Saving…</> : <><Check className="w-3.5 h-3.5"/>{editPkg ? "Update" : "Add Package"}</>}
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
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Packages</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track expiry dates across all medication packages</p>
        </div>
        <button onClick={() => { setEditTarget(null); setModal("add") }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold shadow-sm hover:bg-violet-700 hover:-translate-y-px transition-all">
          <Plus className="w-4 h-4" /> Add Package
        </button>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: "expired",  label: "Expired",       value: expiredCount,  gradient: "from-red-500 to-rose-600",     accent: "text-red-700",    icon: "💀" },
          { key: "critical", label: "Critical (<7d)", value: criticalCount, gradient: "from-red-400 to-orange-500",   accent: "text-orange-700", icon: "🔴" },
          { key: "warning",  label: `Warning (<${alertDays}d)`, value: warningCount, gradient: "from-amber-400 to-yellow-500", accent: "text-amber-700", icon: "🟡" },
          { key: "good",     label: "Good",           value: goodCount,     gradient: "from-emerald-500 to-teal-600", accent: "text-emerald-700",icon: "✅" },
        ].map(kpi => (
          <button key={kpi.key}
            onClick={() => setFilter(f => f === kpi.key ? "all" : kpi.key as typeof filter)}
            className={`group relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-200
              shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_20px_-4px_rgba(0,0,0,0.12)] hover:-translate-y-0.5
              ${filter === kpi.key ? "ring-2 ring-offset-1 ring-violet-500" : ""}
              bg-white`}>
            <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.07] bg-gradient-to-br ${kpi.gradient} group-hover:scale-125 transition-transform duration-500`}/>
            <div className={`relative inline-flex w-9 h-9 rounded-xl items-center justify-center bg-gradient-to-br ${kpi.gradient} shadow-sm text-base mb-2`}>
              {kpi.icon}
            </div>
            <p className={`text-2xl font-black ${kpi.accent}`}>{kpi.value}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">{kpi.label}</p>
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
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${s.bg} ${s.border}`}>
            <span className="text-xl">{s.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">
                {pat.name}'s {med.brandName ?? med.name}{med.strength ? ` (${med.strength})` : ""}
                {nextExpiry.lotNumber ? <span className="font-normal text-gray-500"> · Lot {nextExpiry.lotNumber}</span> : ""}
              </p>
              <p className="text-xs" style={{ color: s.color }}>
                {s.key === "expired"
                  ? `Expired ${Math.abs(s.days)} day${Math.abs(s.days) !== 1 ? "s" : ""} ago`
                  : `Expires in ${s.days} day${s.days !== 1 ? "s" : ""} — ${format(new Date(nextExpiry.expiryDate), "dd MMM yyyy")}`}
              </p>
            </div>
            <CalendarClock className="w-5 h-5 shrink-0" style={{ color: s.color }}/>
          </div>
        )
      })()}

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2">
        <div className="flex bg-gray-100 rounded-xl p-0.5 text-sm">
          {(["all","expired","critical","warning","good"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-[10px] font-semibold capitalize transition-all ${filter === f ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}>
              {f === "all" ? `All (${packages.length})` : f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grouped list ── */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_,i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl py-20 text-center shadow-[0_1px_8px_-2px_rgba(0,0,0,0.06)]">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-violet-50 flex items-center justify-center">
            <Boxes className="w-7 h-7 text-violet-300" />
          </div>
          <p className="font-semibold text-gray-700">No packages found</p>
          <p className="text-xs text-gray-400 mt-1">Add a package using the button above</p>
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
              <div key={group.pmId} className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_-2px_rgba(0,0,0,0.07)] border border-gray-100">
                {/* Group header */}
                <button
                  onClick={() => setExpandedPm(isExpanded ? null : group.pmId)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${ws.bg}`}>
                    {ws.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-gray-900">{group.label}</p>
                    <p className="text-xs text-gray-400">{group.items.length} package{group.items.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ws.badge}`}>
                      {ws.label}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
                  </div>
                </button>

                {/* Expanded packages */}
                {isExpanded && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {group.items
                      .slice()
                      .sort((a: MedPackage, b: MedPackage) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                      .map((pkg: MedPackage) => {
                        const s      = getExpStatus(pkg.expiryDate, alertDays)
                        const expFmt = format(new Date(pkg.expiryDate), "dd MMM yyyy")
                        return (
                          <div key={pkg.id} className={`flex items-center gap-4 px-5 py-3.5 ${s.bg}`}>
                            {/* Expiry ring indicator */}
                            <div className="shrink-0 text-center w-12">
                              <p className="text-lg font-black leading-none" style={{ color: s.color }}>
                                {s.key === "expired" ? "EXP" : s.days}
                              </p>
                              <p className="text-[9px] text-gray-400 font-semibold uppercase">
                                {s.key === "expired" ? "days ago" : "days"}
                              </p>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
                                {pkg.opened && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">Opened</span>}
                                {pkg.lotNumber && <span className="text-[10px] text-gray-500 font-mono">Lot: {pkg.lotNumber}</span>}
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                <span className="font-semibold">{pkg.quantity} {pkg.unitType}{pkg.quantity !== 1 ? "s" : ""}</span>
                                <span className="text-gray-400"> · Expires {expFmt}</span>
                              </p>
                              {pkg.notes && <p className="text-[11px] text-gray-400 mt-0.5 italic">{pkg.notes}</p>}
                            </div>

                            {/* Actions */}
                            <div className="shrink-0 flex items-center gap-1">
                              <button
                                onClick={() => { setEditTarget(pkg); setModal("edit") }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/80 transition-colors"
                                title="Edit package"
                              >
                                <Pencil className="w-3.5 h-3.5 text-gray-500"/>
                              </button>
                              <button
                                onClick={() => deletePackage(pkg.id)}
                                disabled={deleting === pkg.id}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
                                title="Delete package"
                              >
                                {deleting === pkg.id
                                  ? <span className="w-3 h-3 border-2 border-red-200 border-t-red-500 rounded-full animate-spin"/>
                                  : <Trash2 className="w-3.5 h-3.5 text-red-400"/>
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
                      className="w-full flex items-center gap-2 px-5 py-3 text-xs font-semibold text-violet-600 hover:bg-violet-50/50 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5"/> Add another package for this medication
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






