"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Search, User, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials, calculateAge, formatDate } from "@/lib/utils"
import { useT } from "@/lib/i18n/context"

interface Patient {
  id: string
  name: string
  dob: string | null
  gender: string | null
  phone: string | null
  avatarUrl: string | null
  patientMedications: Array<{ id: string; active: boolean }>
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const { t } = useT()

  useEffect(() => {
    fetch("/api/patients")
      .then(r => r.json())
      .then(d => setPatients(d.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative w-full space-y-5 pb-3">
      <div className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-44 rounded-3xl bg-gradient-to-r from-blue-100/40 via-indigo-100/40 to-violet-100/40 blur-2xl" />

      {/* Header */}
      <div className="dashboard-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t.patients.title}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">{patients.length} {t.patients.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              placeholder={t.patients.searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-56 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <Link href="/patients/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_-12px_rgba(37,99,235,0.7)] transition-all hover:-translate-y-px hover:shadow-[0_16px_28px_-12px_rgba(37,99,235,0.75)]">
            <Plus className="h-4 w-4" /> {t.patients.addPatient}
          </Link>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
          {[...Array(8)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="dashboard-surface py-20 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <Users className="h-7 w-7 text-blue-300" />
          </div>
          <p className="font-semibold text-slate-700">{t.patients.noPatients}</p>
          <p className="mt-1 text-xs text-slate-500">{t.patients.noPatientsHint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(patient => {
            const age = calculateAge(patient.dob)
            const medCount = patient.patientMedications.filter(m => m.active).length
            return (
              <Link key={patient.id} href={`/patients/${patient.id}`}>
                <div className="dashboard-surface group flex flex-col gap-4 p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_42px_-22px_rgba(15,23,42,0.45)] cursor-pointer">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={patient.avatarUrl ?? ""} />
                      <AvatarFallback className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                        {getInitials(patient.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{patient.name}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {age !== null && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{t.patients.age} {age}</span>
                        )}
                        {patient.gender && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            {patient.gender.toLowerCase() === "male" ? t.patients.male : patient.gender.toLowerCase() === "female" ? t.patients.female : patient.gender}
                          </span>
                        )}
                      </div>
                      {patient.dob && <p className="mt-1 text-[11px] text-slate-400">{t.patients.dob}: {formatDate(patient.dob)}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100">
                        <User className="h-3.5 w-3.5 text-violet-600" />
                      </div>
                      <span className="text-xs font-semibold text-slate-600">{medCount} {medCount !== 1 ? t.patients.medications : t.patients.medication}</span>
                    </div>
                    {patient.phone && <span className="text-[11px] text-slate-400">{patient.phone}</span>}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
