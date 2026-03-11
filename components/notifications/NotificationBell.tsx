"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/utils"

interface Notification {
  id: string
  type: string
  message: string
  read: boolean
  createdAt: string
  patient?: { name: string } | null
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=10")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.data ?? [])
        setUnreadCount((data.data ?? []).filter((n: Notification) => !n.read).length)
      }
    } catch {}
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", body: JSON.stringify({ markAllRead: true }), headers: { "Content-Type": "application/json" } })
    fetchNotifications()
  }

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "LOW_STOCK": return "🔴"
      case "REMINDER": return "⏰"
      case "MISSED_DOSE": return "⚠️"
      default: return "📋"
    }
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} className="relative">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 bg-white border rounded-xl shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No notifications</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`px-4 py-3 text-sm ${!n.read ? "bg-blue-50" : ""}`}>
                    <div className="flex items-start gap-2">
                      <span className="text-base">{getNotifIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        {n.patient && <p className="font-medium text-xs text-muted-foreground">{n.patient.name}</p>}
                        <p className="text-sm">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDateTime(n.createdAt)}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-2 border-t">
              <a href="/notifications" className="text-xs text-blue-600 hover:underline">View all notifications</a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

