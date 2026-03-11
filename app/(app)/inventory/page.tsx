"use client"

import { useEffect, useState } from "react"
import {
  Package, RefreshCw, Plus, ShieldAlert, ShieldCheck,
  TrendingDown, Boxes, X, Check
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useT } from "@/lib/i18n/context"

interface InventoryItem {
  patientMedicationId: string
  patientName:         string
  medicationName:      string
  medicationStrength:  string | null
  pillsInStock:        number
  avgDailyPills:       number
  daysRemaining:       number
  stockStatus:         "ok" | "low" | "critical"
  lowStockThreshold:   number
}

const STATUS_CONFIG = {
  critical: { label: "Critical",   gradient: "from-red-500 to-rose-600",     accent: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    badge: "bg-red-100 text-red-700 border-red-200",    icon: ShieldAlert },
  low:      { label: "Low Stock",  gradient: "from-amber-400 to-orange-500", accent: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  badge: "bg-amber-100 text-amber-700 border-amber-200", icon: TrendingDown },
  ok:       { label: "In Stock",   gradient: "from-emerald-500 to-teal-600", accent: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200",badge: "bg-emerald-100 text-emerald-700 border-emerald-200",icon: ShieldCheck },
}

// ── Restock Modal ─────────────────────────────────────────────────────────
function RestockModal({ item, onClose, onSaved }: {
  item: InventoryItem; onClose: () => void; onSaved: () => void
}) {
  const { toast } = useToast()
  const { t } = useT()
  const [qty, setQty]       = useState(30)
  const [saving, setSaving] = useState(false)

  const confirm = async () => {
    setSaving(true)
    const res = await fetch(`/api/inventory/${item.patientMedicationId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty, reason: "Manual restock" }),
    })
    if (res.ok) {
      toast({ title: `Added ${qty} units to ${item.medicationName}` })
      onSaved()
    }
    setSaving(false)
  }

  const newTotal  = item.pillsInStock + qty
  const newDays   = item.avgDailyPills > 0 ? Math.floor(newTotal / item.avgDailyPills) : 999

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_26px_60px_-28px_rgba(15,23,42,0.55)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
              <Package className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="font-semibold text-slate-900">{t.inventory.restockTitle}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">{item.medicationName}{item.medicationStrength ? ` (${item.medicationStrength})` : ""}</p>
            <p className="text-xs text-slate-500">{item.patientName}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-2xl font-semibold text-slate-900">{item.pillsInStock}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.inventory.current}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-2xl font-semibold text-emerald-700">{newTotal}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-500">{t.inventory.afterRestock}</p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t.inventory.unitsToAdd}</label>
            <input type="number" min={1} value={qty}
              onChange={e => setQty(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>

          <p className="text-xs text-slate-500">
            {t.inventory.supplyAfter}: <span className="font-semibold text-slate-700">{newDays >= 999 ? "\u221e" : newDays} {t.common.days}</span> {t.inventory.perDay.replace("/", "")} {item.avgDailyPills}{t.inventory.perDay}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100">
            {t.common.cancel}
          </button>
          <button onClick={confirm} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px disabled:opacity-60">
            {saving
              ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />{t.common.saving}</>
              : <><Check className="h-3.5 w-3.5" />{t.inventory.confirmRestock}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [inventory,  setInventory]  = useState<InventoryItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [restocking, setRestocking] = useState<InventoryItem | null>(null)
  const { t } = useT()

  const fetchInventory = () => {
    setLoading(true)
    fetch("/api/inventory")
      .then(r => r.json())
      .then(d => setInventory(d.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchInventory() }, [])

  const sorted = [...inventory].sort((a, b) => {
    const order = { critical: 0, low: 1, ok: 2 }
    return order[a.stockStatus] - order[b.stockStatus]
  })

  const criticalCount = inventory.filter(i => i.stockStatus === "critical").length
  const lowCount      = inventory.filter(i => i.stockStatus === "low").length
  const okCount       = inventory.filter(i => i.stockStatus === "ok").length

  return (
    <div className="relative w-full space-y-5 pb-3">
      <div className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-44 rounded-3xl bg-gradient-to-r from-emerald-100/40 via-teal-100/40 to-sky-100/40 blur-2xl" />

      {/* ── Header ── */}
      <div className="dashboard-surface flex items-center justify-between p-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t.inventory.title}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {criticalCount + lowCount > 0
              ? <span><span className="font-semibold text-red-600">{criticalCount + lowCount} {t.inventory.needAttention}</span></span>
              : t.inventory.allStocked}
          </p>
        </div>
        <button onClick={fetchInventory}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-px hover:shadow-md">
          <RefreshCw className="h-4 w-4" /> {t.common.refresh}
        </button>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t.inventory.criticalLabel, value: criticalCount, gradient: "from-red-500 to-rose-600",     accent: "text-red-700",    icon: ShieldAlert },
          { label: t.inventory.lowStockLabel, value: lowCount,      gradient: "from-amber-400 to-orange-500", accent: "text-amber-700",  icon: TrendingDown },
          { label: t.inventory.inStockLabel,  value: okCount,       gradient: "from-emerald-500 to-teal-600", accent: "text-emerald-700",icon: ShieldCheck },
        ].map(kpi => (
          <div key={kpi.label} className="dashboard-surface group relative overflow-hidden p-5">
            <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${kpi.gradient} opacity-[0.07] transition-transform duration-500 group-hover:scale-110`} />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{kpi.label}</p>
                <p className={`mt-2 text-4xl font-semibold leading-none tracking-tight ${kpi.accent}`}>{kpi.value}</p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${kpi.gradient} shadow-[0_6px_16px_-8px_rgba(15,23,42,0.45)]`}>
                <kpi.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-2xl" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="dashboard-surface py-20 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
            <Boxes className="h-7 w-7 text-emerald-300" />
          </div>
          <p className="font-semibold text-slate-700">{t.inventory.noData}</p>
          <p className="mt-1 text-xs text-slate-500">{t.inventory.noDataHint}</p>
        </div>
      ) : (
        <div className="dashboard-surface overflow-hidden">
          <div className="overflow-x-auto">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{t.inventory.patientMed}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 text-right w-20">{t.inventory.inStock}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 text-right w-16">{t.inventory.avgDay}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 text-right w-16">{t.inventory.daysLeft}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 text-center w-24">{t.common.status}</p>
            <p className="w-24" />
          </div>

          <div className="divide-y divide-slate-100">
            {sorted.map(item => {
              const cfg = STATUS_CONFIG[item.stockStatus]
              const Icon = cfg.icon
              const daysLeft = item.daysRemaining >= 999 ? "∞" : item.daysRemaining
              const pct = Math.min(100, item.lowStockThreshold > 0
                ? Math.round((item.pillsInStock / (item.lowStockThreshold * 3)) * 100)
                : 100)

              return (
                <div key={item.patientMedicationId}
                  className={`group grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/60
                    ${item.stockStatus === "critical" ? "bg-red-50/40" : item.stockStatus === "low" ? "bg-amber-50/30" : ""}`}>

                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                      <Icon className={`h-4 w-4 ${cfg.accent}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.medicationName}
                        {item.medicationStrength && <span className="ml-1.5 text-xs font-normal text-slate-400">({item.medicationStrength})</span>}
                      </p>
                      <p className="text-xs text-slate-500">{item.patientName}</p>
                      {/* Stock bar */}
                      <div className="mt-1.5 h-1 w-32 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${cfg.gradient}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* In Stock */}
                  <p className="w-20 text-right text-sm font-bold text-slate-900">{item.pillsInStock}</p>

                  {/* Avg/Day */}
                  <p className="w-16 text-right text-sm text-slate-500">{item.avgDailyPills}</p>

                  {/* Days Left */}
                  <p className={`w-16 text-right text-sm font-bold ${cfg.accent}`}>{daysLeft}</p>

                  {/* Status badge */}
                  <div className="w-24 flex justify-center">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${cfg.badge}`}>
                      <Icon className="h-3 w-3" />{cfg.label}
                    </span>
                  </div>

                  {/* Restock button */}
                  <div className="w-24 flex justify-end">
                    <button onClick={() => setRestocking(item)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-px hover:border-emerald-300 hover:text-emerald-700 hover:shadow-md">
                      <Plus className="h-3 w-3" /> {t.inventory.restock}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          </div>
        </div>
      )}

      {/* ── Restock Modal ── */}
      {restocking && (
        <RestockModal
          item={restocking}
          onClose={() => setRestocking(null)}
          onSaved={() => { setRestocking(null); fetchInventory() }}
        />
      )}
    </div>
  )
}

