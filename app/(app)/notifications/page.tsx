"use client"

import { useEffect, useState } from "react"
import {
  Bell, Check, CheckCheck, Mail, Clock, Package, Zap, Info,
  ShieldAlert, BellOff, MessageSquare
} from "lucide-react"
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
  label: string
  bg: string; border: string; dot: string; text: string
  iconEl: React.ElementType; iconBg: string; iconColor: string
}> = {
  LOW_STOCK:     { label: "Low Stock",      bg: "bg-red-50",     border: "border-red-100",     dot: "bg-red-500",    text: "text-red-700",    iconEl: ShieldAlert, iconBg: "bg-red-100",    iconColor: "text-red-600" },
  EXPIRY_ALERT:  { label: "Expiry Alert",   bg: "bg-violet-50",  border: "border-violet-100",  dot: "bg-violet-500", text: "text-violet-700", iconEl: Package,     iconBg: "bg-violet-100", iconColor: "text-violet-600" },
  REMINDER:      { label: "Reminder",       bg: "bg-blue-50",    border: "border-blue-100",    dot: "bg-blue-500",   text: "text-blue-700",   iconEl: Clock,       iconBg: "bg-blue-100",   iconColor: "text-blue-600" },
  MISSED_DOSE:   { label: "Missed Dose",    bg: "bg-amber-50",   border: "border-amber-100",   dot: "bg-amber-500",  text: "text-amber-700",  iconEl: ShieldAlert, iconBg: "bg-amber-100",  iconColor: "text-amber-600" },
  DAILY_SUMMARY: { label: "Summary",        bg: "bg-slate-50",   border: "border-slate-100",   dot: "bg-slate-400",  text: "text-slate-600",  iconEl: Info,        iconBg: "bg-slate-100",  iconColor: "text-slate-500" },
  RESTOCK_ALERT: { label: "Restock",        bg: "bg-violet-50",  border: "border-violet-100",  dot: "bg-violet-500", text: "text-violet-700", iconEl: Package,     iconBg: "bg-violet-100", iconColor: "text-violet-600" },
  AUTO_COMPLETE: { label: "Auto-Completed", bg: "bg-emerald-50", border: "border-emerald-100", dot: "bg-emerald-500",text: "text-emerald-700",iconEl: Zap,         iconBg: "bg-emerald-100",iconColor: "text-emerald-600" },
}
const DEFAULT_CONFIG = { label: "Notification", bg: "bg-slate-50", border: "border-slate-100", dot: "bg-slate-400", text: "text-slate-600", iconEl: Info, iconBg: "bg-slate-100", iconColor: "text-slate-500" }

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
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    })
    fetchNotifs()
  }

  const markOne = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    })
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const displayed = filter === "unread" ? notifications.filter(n => !n.read) : notifications
  const unread    = notifications.filter(n => !n.read).length
  const alertCount = notifications.filter(n => n.type === "LOW_STOCK" || n.type === "MISSED_DOSE").length

  // Group by date
  const groups: Record<string, Notification[]> = {}
  displayed.forEach(n => {
    const d = new Date(n.createdAt)
    const today     = new Date(); today.setHours(0,0,0,0)
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    const label = d >= today ? "Today" : d >= yesterday ? "Yesterday" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    if (!groups[label]) groups[label] = []
    groups[label].push(n)
  })

  return (
    <div className="relative w-full space-y-5 pb-3">
      <div className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-44 rounded-3xl bg-gradient-to-r from-blue-100/40 via-violet-100/40 to-indigo-100/40 blur-2xl" />

      {/* ── Header ── */}
      <div className="dashboard-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {unread > 0
              ? <span><span className="font-semibold text-blue-600">{unread} unread</span> · {notifications.length} total</span>
              : "All caught up · " + notifications.length + " total"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-0.5 text-sm">
            {(["all", "unread"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 font-semibold capitalize transition-all ${filter === f ? "bg-white text-slate-900 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.35)]" : "text-slate-500 hover:text-slate-700"}`}>
                {f}
                {f === "unread" && unread > 0 && (
                  <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">{unread}</span>
                )}
              </button>
            ))}
          </div>
          {unread > 0 && (
            <button onClick={markAllRead}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:-translate-y-px hover:shadow-md">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",   value: notifications.length, gradient: "from-slate-500 to-slate-600",   accent: "text-slate-700",   icon: MessageSquare },
          { label: "Unread",  value: unread,               gradient: "from-blue-500 to-indigo-600",   accent: "text-blue-700",    icon: Bell },
          { label: "Alerts",  value: alertCount,           gradient: "from-red-500 to-rose-600",      accent: "text-red-700",     icon: ShieldAlert },
        ].map(s => (
          <div key={s.label} className="dashboard-surface group relative overflow-hidden p-4">
            <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-br ${s.gradient} opacity-[0.07]`} />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{s.label}</p>
                <p className={`mt-1.5 text-3xl font-semibold leading-none tracking-tight ${s.accent}`}>{s.value}</p>
              </div>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} shadow-sm`}>
                <s.icon className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="space-y-2.5 animate-pulse">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-2xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="dashboard-surface py-20 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <BellOff className="h-7 w-7 text-slate-300" />
          </div>
          <p className="font-semibold text-slate-700">{filter === "unread" ? "No unread notifications" : "No notifications yet"}</p>
          <p className="mt-1 text-xs text-slate-500">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([date, items]) => (
            <div key={date}>
              <p className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">{date}</p>
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {items.map(n => {
                  const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_CONFIG
                  const Icon = cfg.iconEl
                  const isEmail = n.channel === "EMAIL"
                  return (
                    <div key={n.id} onClick={() => !n.read && markOne(n.id)}
                      className={`dashboard-surface group flex items-start gap-4 p-4 cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-[0_12px_28px_-12px_rgba(15,23,42,0.3)]
                        ${!n.read ? `border-l-4 ${cfg.border.replace("border-", "border-l-")}` : "opacity-80"}`}>

                      {/* Icon */}
                      <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl ${!n.read ? cfg.iconBg : "bg-slate-100"} shadow-sm`}>
                        <Icon className={`h-5 w-5 ${!n.read ? cfg.iconColor : "text-slate-400"}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {n.patient && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {n.patient.name}
                            </span>
                          )}
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                            {cfg.label}
                          </span>
                          {isEmail && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                              <Mail className="h-2.5 w-2.5" /> Email
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-800 leading-snug">{n.message}</p>
                        <p className="mt-1 text-[11px] font-medium text-slate-400">{formatDateTime(n.createdAt)}</p>
                      </div>

                      {/* Read indicator */}
                      <div className="shrink-0 pt-0.5">
                        {!n.read
                          ? <span className={`block h-2.5 w-2.5 rounded-full ${cfg.dot} shadow-sm`} />
                          : <Check className="h-4 w-4 text-slate-300" />
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
