import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
        <footer className="px-6 py-3 text-xs text-muted-foreground border-t bg-white text-center">
          ⚕️ MediStock is a medication tracking tool only — not medical advice. Always consult a qualified healthcare professional.
        </footer>
      </div>
    </div>
  )
}

