"use client"

import { useSession } from "next-auth/react"
import { Bell } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { getInitials } from "@/lib/utils"

export function Navbar() {
  const { data: session } = useSession()

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        {/* Breadcrumb can be added here */}
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

