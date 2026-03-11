"use client"

import { useEffect, useState } from "react"
import { Bell, Check, CheckCheck, Mail, AlertTriangle, Clock, Package, Zap, Info } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

interface Notification {
  id:        string
  type:      string
  channel:   string
  message:   string
  read:      boolean
  createdAt: string
  patient?:  { name: string } | null
}

const TYPE_CONFIG: Record<string, {
  icon: string; label: string
  bg: string; border: string; dot: string; text: string; iconEl: React.ElementType
}> = {
  LOW_STOCK:     { icon: "🔴", label: "Low Stock",     bg: "bg-red-50",    border: "border-red-100",    dot: "bg-red-500",    text: "text-red-700",    iconEl: AlertTriangle },
  EXPIRY_ALERT:  { icon: "📦", label: "Expiry Alert",  bg: "bg-violet-50", border: "border-violet-100", dot: "bg-violet-500", text: "text-violet-700", iconEl: Package },
  REMINDER:      { icon: "⏰", label: "Reminder",      bg: "bg-blue-50",   border: "border-blue-100",   dot: "bg-blue-500",   text: "text-blue-700",   iconEl: Clock },
  MISSED_DOSE:   { icon: "⚠️", label: "Missed Dose",   bg: "bg-amber-50",  border: "border-amber-100",  dot: "bg-amber-500",  text: "text-amber-700",  iconEl: AlertTriangle },
  DAILY_SUMMARY: { icon: "📋", label: "Summary",       bg: "bg-slate-50",  border: "border-slate-100",  dot: "bg-slate-400",  text: "text-slate-600",  iconEl: Info },
  RESTOCK_ALERT: { icon: "📦", label: "Restock",       bg: "bg-violet-50", border: "border-violet-100", dot: "bg-violet-500", text: "text-violet-700", iconEl: Package },
  AUTO_COMPLETE: { icon: "✅", label: "Auto-Completed", bg: "bg-green-50",  border: "border-green-100",  dot: "bg-green-500",  text: "text-green-700",  iconEl: Zap },
}
const DEFAULT_CONFIG = { icon: "📋", label: "Notification", bg: "bg-gray-50", border: "border-gray-100", dot: "bg-gray-400", text: "text-gray-600", iconEl: Info }

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading,       setLoading]        = useState(true)
  const [filter,        setFilter]         = useState<"all" | "unread">("all")

  const fetchNotifs = () => {
    setLoading(true)
    fetch("/api/notifications?limit=80")
      .then(r => r.json())
      .then(d => setNotifications(d.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchNotifs() }, [])

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ markAllRead: true }),
    })
    fetchNotifs()
  }

  const markOne = async (id: string) => {
    await fetch("/api/notifications", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, read: true }),
    })
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const displayed = filter === "unread" ? notifications.filter(n => !n.read) : notifications
  const unread    = notifications.filter(n => !n.read).length

  // Group by date
  const groups: Record<string, Notification[]> = {}
  displayed.forEach(n => {
    const d = new Date(n.createdAt)
    const today     = new Date(); today.setHours(0,0,0,0)
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1)
    const label = d >= today ? "Today" : d >= yesterday ? "Yesterday" : d.toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" })
    if (!groups[label]) groups[label] = []
    groups[label].push(n)
  })

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {unread > 0 ? <span className="font-semibold text-blue-600">{unread} unread</span> : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter tabs */}
          <div className="flex bg-gray-100 rounded-xl p-0.5 text-sm">
            {(["all","unread"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-[10px] font-semibold capitalize transition-all ${filter === f ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}>
                {f}{f === "unread" && unread > 0 && <span className="ml-1.5 text-[10px] font-bold bg-blue-500 text-white rounded-full px-1.5 py-0.5">{unread}</span>}
              </button>
            ))}
          </div>
          {unread > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-px transition-all text-gray-600">
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",   value: notifications.length,   color: "text-gray-900" },
          { label: "Unread",  value: unread,                  color: "text-blue-600" },
          { label: "Alerts",  value: notifications.filter(n => n.type === "LOW_STOCK").length, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl px-4 py-3 shadow-[0_1px_8px_-2px_rgba(0,0,0,0.06)] text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="space-y-2.5 animate-pulse">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-2xl py-20 text-center shadow-[0_1px_8px_-2px_rgba(0,0,0,0.06)]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Bell className="w-7 h-7 text-gray-300" />
          </div>
          <p className="font-semibold text-gray-700">{filter === "unread" ? "No unread notifications" : "No notifications yet"}</p>
          <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([date, items]) => (
            <div key={date}>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5 px-1">{date}</p>
              <div className="space-y-2">
                {items.map(n => {
                  const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_CONFIG
                  const isEmail = n.channel === "EMAIL"
                  return (
                    <div
                      key={n.id}
                      onClick={() => !n.read && markOne(n.id)}
                      className={`
                        group flex items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer
                        hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-px
                        ${!n.read ? `${cfg.bg} ${cfg.border}` : "bg-white border-gray-100"}
                      `}
                    >
                      {/* icon */}
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${!n.read ? "bg-white shadow-sm" : "bg-gray-50"}`}>
                        {cfg.icon}
                      </div>

                      {/* content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {n.patient && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {n.patient.name}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                            {cfg.label}
                          </span>
                          {isEmail && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                              <Mail className="w-2.5 h-2.5" /> Email sent
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-sm text-gray-700 leading-snug">{n.message}</p>
                        <p className="mt-1 text-[10px] text-gray-400 font-medium">{formatDateTime(n.createdAt)}</p>
                      </div>

                      {/* unread dot or check */}
                      <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
                        {!n.read
                          ? <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} shadow-sm`} />
                          : <Check className="w-3.5 h-3.5 text-gray-300" />
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
