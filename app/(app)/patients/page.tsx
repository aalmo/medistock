"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials, calculateAge, formatDate } from "@/lib/utils"

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="text-muted-foreground text-sm">{patients.length} total patients</p>
        </div>
        <Link href="/patients/new">
          <Button><Plus className="w-4 h-4 mr-2" /> Add Patient</Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No patients found</p>
          <p className="text-sm">Add your first patient to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(patient => {
            const age = calculateAge(patient.dob)
            const medCount = patient.patientMedications.filter(m => m.active).length
            return (
              <Link key={patient.id} href={`/patients/${patient.id}`}>
                <div className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={patient.avatarUrl ?? ""} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                        {getInitials(patient.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{patient.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {age !== null && <span className="text-sm text-muted-foreground">Age {age}</span>}
                        {patient.gender && <Badge variant="outline" className="text-xs">{patient.gender}</Badge>}
                      </div>
                      {patient.dob && <p className="text-xs text-muted-foreground mt-1">DOB: {formatDate(patient.dob)}</p>}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{medCount} medication{medCount !== 1 ? "s" : ""}</span>
                    {patient.phone && <span className="text-xs text-muted-foreground">{patient.phone}</span>}
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

