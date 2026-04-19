"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Calculator, X, Plus, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { parseJsonArray, containerLabel, computeTotalUnitsFromContainers, computeContainersRemaining } from "@/lib/calculations"
import { useT, tUnitLabel } from "@/lib/i18n/context"

const PRESET_TIMES: Record<string, string[]> = {
  DAILY: ["08:00"],
  BID: ["08:00", "20:00"],
  TID: ["08:00", "14:00", "20:00"],
  QID: ["06:00", "12:00", "18:00", "22:00"],
}

interface Schedule {
  id: string
  frequency: string
  timesOfDay: string | string[]
  daysOfWeek: string | number[]
  pillsPerDose: number
}

interface PatientMedication {
  id: string
  unitType: string
  pillsInStock: number
  dosesPerContainer: number
  containersInStock: number
  lowStockThreshold: number
  lowStockPills: number
  notes: string | null
  medication: { id?: string; name: string; brandName?: string | null; genericName?: string | null; strength?: string | null; form?: string | null }
  schedules: Schedule[]
}

interface EditMedicationDialogProps {
  pm: PatientMedication | null
  open: boolean
  onClose: () => void
}

export function EditMedicationDialog({ pm, open, onClose }: EditMedicationDialogProps) {
  const { toast } = useToast()
  const { t } = useT()
  const [saving, setSaving] = useState(false)

  // Drug info fields
  const [medicationName, setMedicationName] = useState("")
  const [brandName, setBrandName] = useState("")
  const [strength, setStrength] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  // Inventory fields
  const [unitType, setUnitType] = useState("pill")
  const [pillsInStock, setPillsInStock] = useState(0)
  const [dosesPerContainer, setDosesPerContainer] = useState(1)
  const [containersInStock, setContainersInStock] = useState(0)
  const [lowStockThreshold, setLowStockThreshold] = useState(7)
  const [lowStockPills, setLowStockPills] = useState(14)
  const [notes, setNotes] = useState("")

  // Schedule fields
  const [frequency, setFrequency] = useState("DAILY")
  const [timesOfDay, setTimesOfDay] = useState<string[]>(["08:00"])
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5, 6, 7])
  const [pillsPerDose, setPillsPerDose] = useState(1)

  const isContainerType = ["inhalation", "ml", "drop", "injection"].includes(unitType)

  // Package management
  interface MedPackage { id: string; quantity: number; expiryDate: string; lotNumber: string | null; unitType: string }
  const [packages,      setPackages]      = useState<MedPackage[]>([])
  const [newPkgQty,     setNewPkgQty]     = useState(30)
  const [newPkgExpiry,  setNewPkgExpiry]  = useState("")
  const [newPkgLot,     setNewPkgLot]     = useState("")
  const [addingPkg,     setAddingPkg]     = useState(false)
  const [deletingPkgId, setDeletingPkgId] = useState<string | null>(null)

  // Preset tags — stored in English (DB key), displayed in current locale
  const PRESET_TAGS = [
    "Blood Pressure", "Cardiac", "Diabetes", "Pain Relief", "Antibiotic",
    "Anti-inflammatory", "Cholesterol", "Thyroid", "Asthma", "Anticoagulant",
    "Antidepressant", "Anxiety", "Epilepsy", "Osteoporosis", "Vitamin / Supplement",
    "Allergy", "Gastric / Acid Reflux", "Sleep", "Blood Thinner", "Immunosuppressant",
  ] as const

  // Helper: display label for a tag key
  const tagDisplay = (key: string) =>
    (t.tagLabels as Record<string, string>)[key] ?? key

  // Translated day labels
  const DAYS_OF_WEEK = [
    { label: t.editMedDialog.mon, value: 1 }, { label: t.editMedDialog.tue, value: 2 },
    { label: t.editMedDialog.wed, value: 3 }, { label: t.editMedDialog.thu, value: 4 },
    { label: t.editMedDialog.fri, value: 5 }, { label: t.editMedDialog.sat, value: 6 },
    { label: t.editMedDialog.sun, value: 7 },
  ]

  // Translated unit types
  const UNIT_TYPES = [
    { value: "pill",       label: `💊 ${t.units.pill}` },
    { value: "tablet",     label: `💊 ${t.units.tablet}` },
    { value: "inhalation", label: `🫁 ${t.units.inhalation}` },
    { value: "ml",         label: `🧴 ${t.units.ml}` },
    { value: "drop",       label: `💧 ${t.units.drop}` },
    { value: "patch",      label: `🩹 ${t.units.patch}` },
    { value: "injection",  label: `💉 ${t.units.injection}` },
    { value: "other",      label: `📦 ${t.units.unit}` },
  ]

  const fetchPackages = async (pmId: string) => {
    const res = await fetch(`/api/packages?patientMedicationId=${pmId}`)
    if (res.ok) { const d = await res.json(); setPackages(d.data ?? []) }
  }

  const addPackage = async () => {
    if (!pm || !newPkgExpiry) return
    setAddingPkg(true)
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientMedicationId: pm.id, quantity: newPkgQty, expiryDate: newPkgExpiry, unitType: pm.unitType, lotNumber: newPkgLot || undefined }),
      })
      if (res.ok) {
        toast({ title: t.editMedDialog.packageAdded })
        setNewPkgQty(30); setNewPkgExpiry(""); setNewPkgLot("")
        await fetchPackages(pm.id)
      } else {
        toast({ title: t.editMedDialog.packageAddFailed, variant: "destructive" })
      }
    } finally { setAddingPkg(false) }
  }

  const deletePackage = async (pkgId: string) => {
    if (!pm) return
    setDeletingPkgId(pkgId)
    try { await fetch(`/api/packages/${pkgId}`, { method: "DELETE" }); await fetchPackages(pm.id) }
    finally { setDeletingPkgId(null) }
  }

  useEffect(() => {
    if (!pm) return
    setMedicationName(pm.medication.name ?? "")
    setBrandName(pm.medication.brandName ?? "")
    setStrength(pm.medication.strength ?? "")
    const rawTags = (pm.medication as { tags?: unknown }).tags
    setTags(Array.isArray(rawTags) ? rawTags : typeof rawTags === "string" ? parseJsonArray<string>(rawTags, []) : [])
    setTagInput("")
    setUnitType(pm.unitType ?? "pill")
    setPillsInStock(pm.pillsInStock)
    setDosesPerContainer(pm.dosesPerContainer ?? 1)
    setContainersInStock(pm.containersInStock ?? 0)
    setLowStockThreshold(pm.lowStockThreshold)
    setLowStockPills(pm.lowStockPills)
    setNotes(pm.notes ?? "")
    if (pm.schedules.length > 0) {
      const sch = pm.schedules[0]
      setFrequency(sch.frequency)
      setTimesOfDay(parseJsonArray<string>(sch.timesOfDay, ["08:00"]))
      setDaysOfWeek(parseJsonArray<number>(sch.daysOfWeek, [1, 2, 3, 4, 5, 6, 7]))
      setPillsPerDose(sch.pillsPerDose)
    }
    fetchPackages(pm.id)
  }, [pm])

  const handleContainerChange = (containers: number, perContainer: number) => {
    setContainersInStock(containers)
    setDosesPerContainer(perContainer)
    setPillsInStock(computeTotalUnitsFromContainers(containers, perContainer))
  }

  const handleFrequencyChange = (freq: string) => {
    setFrequency(freq)
    if (PRESET_TIMES[freq]) setTimesOfDay(PRESET_TIMES[freq])
  }

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b))
  }

  const handleSave = async () => {
    if (!pm) return
    setSaving(true)
    const totalUnits = isContainerType ? computeTotalUnitsFromContainers(containersInStock, dosesPerContainer) : pillsInStock
    const [pmRes, schRes] = await Promise.all([
      fetch(`/api/medications/${pm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicationName: medicationName.trim(), brandName: brandName.trim(), strength: strength.trim(), tags, unitType, pillsInStock: totalUnits, dosesPerContainer, containersInStock, lowStockThreshold, lowStockPills, notes }),
      }),
      pm.schedules.length > 0
        ? fetch(`/api/schedules/${pm.schedules[0].id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ frequency, timesOfDay, daysOfWeek, pillsPerDose }) })
        : Promise.resolve(new Response(JSON.stringify({}), { status: 200 })),
    ])
    setSaving(false)
    if (!pmRes.ok || !schRes.ok) { toast({ title: t.editMedDialog.updateError, variant: "destructive" }); return }
    toast({ title: t.editMedDialog.updateSuccess })
    onClose()
  }

  if (!pm) return null
  const containersLeft = isContainerType ? computeContainersRemaining(pillsInStock, dosesPerContainer) : null

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t.editMedDialog.title} — {medicationName || pm.medication.name}
            {(strength || pm.medication.strength) && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">{strength || pm.medication.strength}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="drug">
          <TabsList className="w-full">
            <TabsTrigger value="drug"      className="flex-1">{t.editMedDialog.tabDrug}</TabsTrigger>
            <TabsTrigger value="inventory" className="flex-1">{t.editMedDialog.tabInventory}</TabsTrigger>
            <TabsTrigger value="schedule"  className="flex-1">{t.editMedDialog.tabSchedule}</TabsTrigger>
          </TabsList>

          {/* ── Drug Info tab ── */}
          <TabsContent value="drug" className="space-y-4 pt-2">
            <div>
              <Label htmlFor="med-name">{t.editMedDialog.drugName}</Label>
              <Input id="med-name" value={medicationName} onChange={e => setMedicationName(e.target.value)} placeholder={t.editMedDialog.drugNamePlaceholder} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="brand-name">{t.editMedDialog.brandName}</Label>
              <Input id="brand-name" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder={t.editMedDialog.brandNamePlaceholder} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="strength">{t.editMedDialog.doseStrength}</Label>
              <Input id="strength" value={strength} onChange={e => setStrength(e.target.value)} placeholder={t.editMedDialog.doseStrengthPlaceholder} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">{t.editMedDialog.doseStrengthHint}</p>
            </div>

            {/* Tags */}
            <div>
              <Label>{t.editMedDialog.categoryTags}</Label>
              {tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {tagDisplay(tag)}
                      <button type="button" onClick={() => setTags(prev => prev.filter(tg => tg !== tag))} className="ml-0.5 rounded-full hover:text-blue-900">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) { e.preventDefault(); const tg = tagInput.trim(); if (!tags.includes(tg)) setTags(prev => [...prev, tg]); setTagInput("") } }}
                  placeholder={t.editMedDialog.tagPlaceholder} className="flex-1 h-8 text-sm" />
                <Button type="button" size="sm" variant="outline" className="h-8 px-2"
                  onClick={() => { const tg = tagInput.trim(); if (tg && !tags.includes(tg)) setTags(prev => [...prev, tg]); setTagInput("") }}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-2">
                <p className="text-[11px] text-muted-foreground mb-1.5">{t.editMedDialog.quickAdd}</p>
                <div className="flex flex-wrap gap-1">
                  {PRESET_TAGS.filter(tg => !tags.includes(tg)).map(tg => (
                    <button key={tg} type="button" onClick={() => setTags(prev => [...prev, tg])}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
                      + {tagDisplay(tg)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Inventory tab ── */}
          <TabsContent value="inventory" className="space-y-4 pt-2">
            <div>
              <Label>{t.editMedDialog.unitType}</Label>
              <Select value={unitType} onValueChange={setUnitType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{UNIT_TYPES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {isContainerType ? (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                  <Calculator className="w-4 h-4" />{t.editMedDialog.containerCalc}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{tUnitLabel(t, unitType)} {t.editMedDialog.perContainer}</Label>
                    <Input type="number" min={1} value={dosesPerContainer} onChange={e => handleContainerChange(containersInStock, Number(e.target.value))} className="mt-1" placeholder="e.g. 100" />
                  </div>
                  <div>
                    <Label className="text-xs">{t.editMedDialog.numContainers} ({containerLabel(unitType)})</Label>
                    <Input type="number" min={0} step={0.5} value={containersInStock} onChange={e => handleContainerChange(Number(e.target.value), dosesPerContainer)} className="mt-1" placeholder="e.g. 10" />
                  </div>
                </div>
                <div className="bg-white rounded-md p-3 text-sm space-y-1 border border-blue-100">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.editMedDialog.totalUnits} {tUnitLabel(t, unitType)}:</span>
                    <span className="font-semibold">{computeTotalUnitsFromContainers(containersInStock, dosesPerContainer).toLocaleString()}</span>
                  </div>
                  {containersLeft !== null && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t.editMedDialog.equivalentContainers}:</span>
                      <span>{containersLeft.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs">{t.editMedDialog.orEnterTotal} {tUnitLabel(t, unitType)}</Label>
                  <Input type="number" min={0} value={pillsInStock} onChange={e => { const total = Number(e.target.value); setPillsInStock(total); setContainersInStock(dosesPerContainer > 0 ? total / dosesPerContainer : 0) }} className="mt-1" />
                </div>
              </div>
            ) : (
              <div>
                <Label>{tUnitLabel(t, unitType)} {t.editMedDialog.inStock}</Label>
                <Input type="number" min={0} step={0.5} value={pillsInStock} onChange={e => setPillsInStock(Number(e.target.value))} className="mt-1" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.editMedDialog.lowStockDays}</Label>
                <Input type="number" min={1} value={lowStockThreshold} onChange={e => setLowStockThreshold(Number(e.target.value))} className="mt-1" />
              </div>
              <div>
                <Label>{t.editMedDialog.lowStockUnits} ({tUnitLabel(t, unitType)})</Label>
                <Input type="number" min={1} step={0.5} value={lowStockPills} onChange={e => setLowStockPills(Number(e.target.value))} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>{t.editMedDialog.notes}</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t.editMedDialog.notesPlaceholder} rows={2} className="mt-1" />
            </div>

            {/* Packages sub-section */}
            <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 space-y-3">
              <p className="text-sm font-semibold text-violet-800">{t.editMedDialog.packages}</p>
              {packages.length === 0 ? (
                <p className="text-xs text-slate-500 italic">{t.editMedDialog.noPackages}</p>
              ) : (
                <div className="space-y-1.5">
                  {[...packages].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()).map(pkg => (
                    <div key={pkg.id} className="flex items-center justify-between gap-2 rounded-lg border border-violet-100 bg-white px-3 py-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-slate-900">{pkg.quantity} {tUnitLabel(t, pkg.unitType)}</span>
                        <span className="mx-1.5 text-slate-400">·</span>
                        <span className="text-slate-600">{t.editMedDialog.expLabel} {format(new Date(pkg.expiryDate), "dd MMM yyyy")}</span>
                        {pkg.lotNumber && <span className="ml-1.5 font-mono text-slate-400">{t.editMedDialog.lotLabel} {pkg.lotNumber}</span>}
                      </div>
                      <button type="button" onClick={() => deletePackage(pkg.id)} disabled={deletingPkgId === pkg.id}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
                        {deletingPkgId === pkg.id ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-200 border-t-red-500" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2 border-t border-violet-100 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">{t.editMedDialog.addPackageTitle}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">{t.editMedDialog.qty} ({tUnitLabel(t, unitType)})</Label>
                    <Input type="number" min={1} step={0.5} value={newPkgQty} onChange={e => setNewPkgQty(Number(e.target.value))} className="mt-0.5 h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">{t.editMedDialog.expiryDate}</Label>
                    <Input type="date" value={newPkgExpiry} onChange={e => setNewPkgExpiry(e.target.value)} className="mt-0.5 h-8 text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px]">{t.editMedDialog.lotOptional}</Label>
                  <Input type="text" placeholder="e.g. LOT2025A" value={newPkgLot} onChange={e => setNewPkgLot(e.target.value)} className="mt-0.5 h-8 text-xs" />
                </div>
                <Button type="button" size="sm" variant="outline" className="w-full border-violet-200 text-violet-700 hover:bg-violet-50"
                  onClick={addPackage} disabled={addingPkg || !newPkgExpiry}>
                  {addingPkg ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t.editMedDialog.adding}</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />{t.editMedDialog.addPackage}</>}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── Schedule tab ── */}
          <TabsContent value="schedule" className="space-y-4 pt-2">
            <div>
              <Label>{t.editMedDialog.frequency}</Label>
              <Select value={frequency} onValueChange={handleFrequencyChange}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">{t.editMedDialog.onceDailyLabel}</SelectItem>
                  <SelectItem value="BID">{t.editMedDialog.twiceDailyLabel}</SelectItem>
                  <SelectItem value="TID">{t.editMedDialog.threeTimesLabel}</SelectItem>
                  <SelectItem value="QID">{t.editMedDialog.fourTimesLabel}</SelectItem>
                  <SelectItem value="WEEKLY">{t.editMedDialog.weeklyLabel}</SelectItem>
                  <SelectItem value="AS_NEEDED">{t.editMedDialog.asNeededLabel}</SelectItem>
                  <SelectItem value="CUSTOM">{t.editMedDialog.customLabel}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t.editMedDialog.timesOfDay}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {timesOfDay.map((time, i) => (
                  <Input key={i} type="time" value={time} onChange={e => setTimesOfDay(prev => prev.map((v, j) => j === i ? e.target.value : v))} className="w-32" />
                ))}
              </div>
            </div>

            <div>
              <Label>{t.editMedDialog.daysOfWeek}</Label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {DAYS_OF_WEEK.map(d => (
                  <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                    className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${daysOfWeek.includes(d.value) ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>{tUnitLabel(t, unitType)} {t.editMedDialog.perDose}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input type="number" min={0.25} step={0.5} value={pillsPerDose} onChange={e => setPillsPerDose(Number(e.target.value))} className="w-28" />
                <span className="text-sm text-muted-foreground">({t.editMedDialog.perDoseHint})</span>
              </div>
              {pillsPerDose % 1 !== 0 && (
                <p className="text-xs text-blue-600 mt-1">{t.editMedDialog.halfDoseNote} — {pillsPerDose} {tUnitLabel(t, unitType, pillsPerDose)} {t.editMedDialog.perDose}</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t.editMedDialog.cancel}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t.editMedDialog.saveChanges}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

