"use client"

import { useEffect, useState } from "react"

interface InventoryDataPoint {
  name: string
  pills: number
  threshold: number
}

type StatusKey = "empty" | "critical" | "low" | "ok" | "good"

function getStatus(pills: number, threshold: number): {
  key: StatusKey; label: string; color: string; track: string
  barBg: string; badgeBg: string; badgeText: string; badgeBorder: string; glow: string
} {
  if (pills <= 0)             return { key: "empty",    label: "Empty",    color: "#ef4444", track: "#fef2f2", barBg: "bg-red-500",     badgeBg: "bg-red-50",     badgeText: "text-red-700",    badgeBorder: "border-red-200",    glow: "shadow-[0_0_0_3px_#fee2e2]" }
  if (pills <= threshold)     return { key: "critical", label: "Critical", color: "#ef4444", track: "#fef2f2", barBg: "bg-red-500",     badgeBg: "bg-red-50",     badgeText: "text-red-700",    badgeBorder: "border-red-200",    glow: "shadow-[0_0_0_3px_#fee2e2]" }
  if (pills <= threshold * 2) return { key: "low",      label: "Low",      color: "#f59e0b", track: "#fffbeb", barBg: "bg-amber-400",   badgeBg: "bg-amber-50",   badgeText: "text-amber-700",  badgeBorder: "border-amber-200",  glow: "shadow-[0_0_0_3px_#fef3c7]" }
  if (pills <= threshold * 4) return { key: "ok",       label: "OK",       color: "#3b82f6", track: "#eff6ff", barBg: "bg-blue-500",    badgeBg: "bg-blue-50",    badgeText: "text-blue-700",   badgeBorder: "border-blue-200",   glow: "shadow-[0_0_0_3px_#dbeafe]" }
  return                             { key: "good",     label: "Good",     color: "#10b981", track: "#f0fdf4", barBg: "bg-emerald-500", badgeBg: "bg-emerald-50", badgeText: "text-emerald-700",badgeBorder: "border-emerald-200",glow: "shadow-[0_0_0_3px_#d1fae5]" }
}

// Animated SVG donut ring
function DonutRing({ pct, color, track, size = 40 }: { pct: number; color: string; track: string; size?: number }) {
  const [displayed, setDisplayed] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setDisplayed(pct), 80)
    return () => clearTimeout(t)
  }, [pct])

  const r     = (size - 5) / 2
  const circ  = 2 * Math.PI * r
  const offset = circ - (displayed / 100) * circ

  return (
    <svg width={size} height={size} className="-rotate-90" style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth="4.5"/>
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="4.5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}
      />
    </svg>
  )
}

export function InventoryStatusChart({ data }: { data: InventoryDataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">💊</div>
        <p className="text-xs font-semibold text-gray-400">No inventory data yet</p>
      </div>
    )
  }

  const sorted = [...data].sort((a, b) =>
    a.pills / Math.max(a.threshold, 1) - b.pills / Math.max(b.threshold, 1)
  )
  const maxPills = Math.max(...data.map(d => d.pills), 1)

  // Summary counts
  const counts = { empty: 0, critical: 0, low: 0, ok: 0, good: 0 }
  data.forEach(d => { counts[getStatus(d.pills, d.threshold).key]++ })
  const alertCount = counts.empty + counts.critical + counts.low

  return (
    <div className="flex flex-col gap-3">

      {/* ── Summary strip ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {alertCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/>
            {alertCount} need attention
          </span>
        )}
        {(["good","ok","low","critical","empty"] as StatusKey[]).map(k => counts[k] > 0 && (
          <span key={k} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatus(k === "good" ? 999 : k === "ok" ? 50 : k === "low" ? 10 : 0, 7).badgeBg} ${getStatus(k === "good" ? 999 : 0, 7).badgeText} ${getStatus(0, 7).badgeBorder}`}
            style={{ background: k === "good" ? "#f0fdf4" : k === "ok" ? "#eff6ff" : k === "low" ? "#fffbeb" : "#fef2f2",
                     color:      k === "good" ? "#065f46" : k === "ok" ? "#1e40af" : k === "low" ? "#92400e" : "#991b1b",
                     borderColor: k === "good" ? "#bbf7d0" : k === "ok" ? "#bfdbfe" : k === "low" ? "#fde68a" : "#fecaca" }}>
            {counts[k]} {k}
          </span>
        ))}
      </div>

      {/* ── Per-medication rows ── */}
      <div className="space-y-2.5 overflow-y-auto pr-0.5" style={{ maxHeight: 240 }}>
        {sorted.map((item, i) => {
          const s       = getStatus(item.pills, item.threshold)
          const barPct  = Math.min(100, (item.pills / maxPills) * 100)
          const treshPct= Math.min(100, (item.threshold / maxPills) * 100)
          const ringPct = Math.min(100, barPct)
          const daysEst = item.threshold > 0 ? Math.floor(item.pills / (item.threshold / 7)) : null

          return (
            <div
              key={i}
              className={`
                group flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200
                bg-white hover:${s.glow}
                ${s.key === "critical" || s.key === "empty"
                  ? "border-red-100 bg-red-50/40"
                  : s.key === "low"
                  ? "border-amber-100 bg-amber-50/30"
                  : "border-gray-100"}
              `}
            >
              {/* donut ring */}
              <div className="relative shrink-0 flex items-center justify-center">
                <DonutRing pct={ringPct} color={s.color} track={s.track} size={38} />
                <span
                  className="absolute text-[9px] font-black rotate-90"
                  style={{ color: s.color }}
                >
                  {Math.round(ringPct)}%
                </span>
              </div>

              {/* content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-gray-800 truncate leading-tight" title={item.name}>
                    {item.name}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[11px] font-black" style={{ color: s.color }}>
                      {item.pills % 1 === 0 ? item.pills : item.pills.toFixed(1)}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${s.badgeBg} ${s.badgeText} ${s.badgeBorder}`}>
                      {s.label}
                    </span>
                  </div>
                </div>

                {/* stacked bar */}
                <div className="relative h-1.5 rounded-full overflow-visible" style={{ background: s.track }}>
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${s.barBg}`}
                    style={{ width: `${barPct}%` }}
                  />
                  {/* threshold needle */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-px h-3 rounded-full bg-gray-400/70"
                    style={{ left: `${treshPct}%` }}
                    title={`Alert threshold: ${item.threshold}`}
                  />
                </div>

                {/* days remaining estimate */}
                {daysEst !== null && (
                  <p className="text-[9px] text-gray-400 mt-0.5 font-medium">
                    ~{daysEst === 0 ? "0" : daysEst} day{daysEst !== 1 ? "s" : ""} remaining
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
