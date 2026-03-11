"use client"

import { useSession } from "next-auth/react"
import { Menu } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { getInitials } from "@/lib/utils"

interface NavbarProps {
  onMenuClick?: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { data: session } = useSession()

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />

        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session?.user?.image ?? ""} />
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
              {getInitials(session?.user?.name ?? session?.user?.email ?? "U")}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-sm font-medium leading-none">{session?.user?.name ?? "User"}</p>
            <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  )
}

