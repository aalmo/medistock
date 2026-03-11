"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, Pill, Calendar, Bell,
  Settings, Package, LogOut, Activity, Boxes
} from "lucide-react"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/dashboard",     label: "Dashboard",    icon: LayoutDashboard },
  { href: "/patients",      label: "Patients",     icon: Users },
  { href: "/medications",   label: "Medications",  icon: Pill },
  { href: "/schedules",     label: "Schedules",    icon: Calendar },
  { href: "/inventory",     label: "Inventory",    icon: Package },
  { href: "/packages",      label: "Packages",     icon: Boxes },
  { href: "/notifications", label: "Notifications",icon: Bell },
  { href: "/settings",      label: "Settings",     icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-white px-4 py-6">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold">MediStock</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link key={item.href} href={item.href}>
              <span className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}>
                <Icon className="w-5 h-5" />
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-700">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
