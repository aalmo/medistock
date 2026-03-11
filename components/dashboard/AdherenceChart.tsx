"use client"

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts"

interface AdherenceDataPoint {
  date: string; adherence: number; taken: number; missed: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const v = payload[0].value as number
  const color = v >= 80 ? "#10b981" : v >= 60 ? "#f59e0b" : "#ef4444"
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3.5 py-2.5 text-xs">
      <p className="font-bold text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: color }}/>
        <span className="font-black text-base" style={{ color }}>{v}%</span>
        <span className="text-gray-400">adherence</span>
      </div>
      {payload[0]?.payload && (
        <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-gray-100">
          <span className="text-emerald-600 font-semibold">✓ {payload[0].payload.taken} taken</span>
          <span className="text-red-400 font-semibold">✗ {payload[0].payload.missed} missed</span>
        </div>
      )}
    </div>
  )
}

export function AdherenceChart({ data }: { data: AdherenceDataPoint[] }) {
  const avg = data.length ? Math.round(data.reduce((s, d) => s + d.adherence, 0) / data.length) : 0
  const gradientId = "adherenceGradient"

  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -30, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18}/>
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 600 }}
          tickLine={false} axisLine={false}
        />
        <YAxis
          domain={[0, 100]} tickFormatter={v => `${v}%`}
          tick={{ fontSize: 10, fill: "#d1d5db" }}
          tickLine={false} axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }}/>
        <ReferenceLine y={avg} stroke="#3b82f6" strokeDasharray="4 4" strokeWidth={1.5} strokeOpacity={0.4}/>
        <Area
          type="monotone" dataKey="adherence"
          stroke="#3b82f6" strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
