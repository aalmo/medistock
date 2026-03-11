import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💊</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">MediStock</h1>
          <p className="text-slate-500 mt-1">Medication management for caregivers</p>
        </div>
        {children}
        <p className="text-center text-xs text-slate-400 mt-6">
          ⚕️ For tracking purposes only — not medical advice
        </p>
      </div>
    </div>
  )
}

