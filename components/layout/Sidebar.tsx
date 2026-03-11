"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, Pill, Calendar, Bell,
  Settings, Package, LogOut, Activity, Boxes, Languages
} from "lucide-react"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n/context"
import { LOCALE_LIST } from "@/lib/i18n/locales"
import type { Locale } from "@/lib/i18n/types"

export function Sidebar() {
  const pathname = usePathname()
  const { t, locale, setLocale } = useT()

  const navItems = [
    { href: "/dashboard",     label: t.nav.dashboard,     icon: LayoutDashboard },
    { href: "/patients",      label: t.nav.patients,      icon: Users },
    { href: "/medications",   label: t.nav.medications,   icon: Pill },
    { href: "/schedules",     label: t.nav.schedules,     icon: Calendar },
    { href: "/inventory",     label: t.nav.inventory,     icon: Package },
    { href: "/packages",      label: t.nav.packages,      icon: Boxes },
    { href: "/notifications", label: t.nav.notifications, icon: Bell },
    { href: "/settings",      label: t.nav.settings,      icon: Settings },
  ]

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
                <Icon className="w-5 h-5 shrink-0" />
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Language switcher */}
      <div className="mt-4 pt-4 border-t border-slate-700/60">
        <div className="flex items-center gap-2 px-3 mb-2">
          <Languages className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t.common.language}</span>
        </div>
        <div className="flex gap-1.5 px-1">
          {LOCALE_LIST.map(([code, meta]) => (
            <button
              key={code}
              onClick={() => setLocale(code as Locale)}
              title={meta.label}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all",
                locale === code
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <span className="text-sm leading-none">{meta.flag}</span>
              <span className="hidden sm:inline text-[10px]">{code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <div className="pt-3 border-t border-slate-700 mt-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-5 h-5 mr-3" />
          {t.nav.signOut}
        </Button>
      </div>
    </aside>
  )
}
