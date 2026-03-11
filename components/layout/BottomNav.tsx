"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Calendar, Package, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n/context"

export function BottomNav() {
  const pathname = usePathname()
  const { t } = useT()

  const items = [
    { href: "/dashboard",     label: t.nav.dashboard,     icon: LayoutDashboard },
    { href: "/patients",      label: t.nav.patients,      icon: Users },
    { href: "/schedules",     label: t.nav.schedules,     icon: Calendar },
    { href: "/packages",      label: t.nav.packages,      icon: Package },
    { href: "/notifications", label: t.nav.notifications, icon: Bell },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_24px_-8px_rgba(15,23,42,0.12)]">
      <div className="flex items-stretch h-16">
        {items.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",
                isActive
                  ? "text-blue-600"
                  : "text-slate-400 hover:text-slate-700"
              )}
            >
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-xl transition-all",
                isActive ? "bg-blue-100 scale-110" : ""
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="leading-none">{item.label}</span>
            </Link>
          )
        })}
      </div>
      {/* Safe area for iOS home indicator */}
      <div className="h-safe-bottom bg-white" />
    </nav>
  )
}

