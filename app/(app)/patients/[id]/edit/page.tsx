"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { patientSchema, type PatientFormData } from "@/lib/validations/patient"
import { useToast } from "@/hooks/use-toast"
import { useT } from "@/lib/i18n/context"

export default function EditPatientPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useT()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentGender, setCurrentGender] = useState<string | undefined>()

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema)
  })

  useEffect(() => {
    fetch(`/api/patients/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          const p = d.data
          reset({
            name: p.name ?? "",
            dob: p.dob ? new Date(p.dob).toISOString().split("T")[0] : "",
            gender: p.gender ?? undefined,
            phone: p.phone ?? "",
            email: p.email ?? "",
            notes: p.notes ?? "",
            avatarUrl: p.avatarUrl ?? "",
          })
          if (p.gender) setCurrentGender(p.gender)
        }
      })
      .finally(() => setLoading(false))
  }, [params.id, reset])

  const onSubmit = async (data: PatientFormData) => {
    setSaving(true)
    const res = await fetch(`/api/patients/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).catch(() => null)

    setSaving(false)

    if (!res || !res.ok) {
      const err = res ? await res.json().catch(() => ({})) : {}
      toast({
        title: t.editPatientPage.updateError,
        description: err.error ?? t.editPatientPage.updateErrorFallback,
        variant: "destructive"
      })
      return
    }

    toast({ title: t.editPatientPage.updateSuccess })
    router.push(`/patients/${params.id}`)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/patients/${params.id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">{t.editPatientPage.title}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.editPatientPage.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <div>
              <Label htmlFor="name">{t.editPatientPage.fullName}</Label>
              <Input id="name" {...register("name")} placeholder={t.editPatientPage.fullNamePlaceholder} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dob">{t.editPatientPage.dob}</Label>
                <Input id="dob" type="date" {...register("dob")} />
              </div>
              <div>
                <Label>{t.editPatientPage.gender}</Label>
                <Select
                  value={currentGender}
                  onValueChange={(v) => {
                    setValue("gender", v as "MALE" | "FEMALE" | "OTHER")
                    setCurrentGender(v)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.editPatientPage.genderPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">{t.editPatientPage.male}</SelectItem>
                    <SelectItem value="FEMALE">{t.editPatientPage.female}</SelectItem>
                    <SelectItem value="OTHER">{t.editPatientPage.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">{t.editPatientPage.phone}</Label>
                <Input id="phone" {...register("phone")} placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <Label htmlFor="email">{t.editPatientPage.email}</Label>
                <Input id="email" type="email" {...register("email")} placeholder="patient@email.com" />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">{t.editPatientPage.notes}</Label>
              <Textarea
                id="notes"
                {...register("notes")}
                placeholder={t.editPatientPage.notesPlaceholder}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="avatarUrl">
                {t.editPatientPage.avatarUrl}{" "}
                <span className="text-muted-foreground text-xs">({t.editPatientPage.avatarUrlOptional})</span>
              </Label>
              <Input id="avatarUrl" {...register("avatarUrl")} placeholder="https://..." />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t.editPatientPage.saveChanges}
              </Button>
              <Link href={`/patients/${params.id}`}>
                <Button type="button" variant="outline">{t.editPatientPage.cancel}</Button>
              </Link>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  )
}
