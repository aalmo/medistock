"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"
import { BottomNav } from "@/components/layout/BottomNav"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#f5f6fa]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        {/* pb-20 on mobile to clear the bottom nav bar */}
        <main className="flex-1 px-4 py-4 pb-24 md:px-6 md:py-5 md:pb-6 lg:px-8 lg:py-6 lg:pb-6 overflow-auto">
          {children}
        </main>
        <footer className="hidden lg:block px-4 py-3 text-xs text-muted-foreground border-t bg-white text-center">
          ⚕️ MediStock is a medication tracking tool only — not medical advice. Always consult a qualified healthcare professional.
        </footer>
      </div>
      {/* Bottom navigation — mobile only */}
      <BottomNav />
    </div>
  )
}
