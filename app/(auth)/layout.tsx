import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import Image from "next/image"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo.svg" alt="MediStock Logo" width={260} height={80} className="mx-auto" priority />
          <h1 className="sr-only">MediStock</h1>
          <p className="text-slate-500 mt-1">Medication management for caregivers</p>
        </div>
        {children}
        <p className="text-center text-xs text-slate-400 mt-6">
          &copy; {new Date().getFullYear()} MediStock. All rights reserved.
        </p>
      </div>
    </div>
  )
}
