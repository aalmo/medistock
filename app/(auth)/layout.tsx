import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import Image from "next/image"
import { Cairo } from "next/font/google"

const cairo = Cairo({ subsets: ["latin", "arabic"], weight: ["400", "600", "700"], display: "swap" })

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4 ${cairo.className}`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo.svg" alt="MediStock Logo" width={260} height={80} className="mx-auto" priority />
          <h1 className="sr-only">MediStock</h1>
          <p className="text-slate-500 mt-1">Medication management for caregivers</p>
        </div>
        {children}
        <div className="mt-6 space-y-3">
          <p className="text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} MediStock. All rights reserved.
          </p>
          <div className="px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg">
            <p className="text-center text-xs text-blue-700 leading-relaxed">
              ⚕️ MediStock is a medication tracking tool only — not medical advice. Always consult a qualified healthcare professional.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
