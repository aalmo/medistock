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
import { parseJsonArray, unitLabel, containerLabel, computeTotalUnitsFromContainers, computeContainersRemaining } from "@/lib/calculations"

// ...existing code...

const PRESET_TAGS = [
  "Blood Pressure", "Cardiac", "Diabetes", "Pain Relief", "Antibiotic",
  "Anti-inflammatory", "Cholesterol", "Thyroid", "Asthma", "Anticoagulant",
  "Antidepressant", "Anxiety", "Epilepsy", "Osteoporosis", "Vitamin / Supplement",
  "Allergy", "Gastric / Acid Reflux", "Sleep", "Blood Thinner", "Immunosuppressant",
]

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

const DAYS_OF_WEEK = [
  { label: "Mon", value: 1 }, { label: "Tue", value: 2 }, { label: "Wed", value: 3 },
  { label: "Thu", value: 4 }, { label: "Fri", value: 5 }, { label: "Sat", value: 6 }, { label: "Sun", value: 7 },
]

const PRESET_TIMES: Record<string, string[]> = {
  DAILY: ["08:00"],
  BID: ["08:00", "20:00"],
  TID: ["08:00", "14:00", "20:00"],
  QID: ["06:00", "12:00", "18:00", "22:00"],
}

const UNIT_TYPES = [
  { value: "pill",       label: "💊 Pill" },
  { value: "tablet",     label: "💊 Tablet" },
  { value: "inhalation", label: "🫁 Inhalation (inhaler/bottle)" },
  { value: "ml",         label: "🧴 ml (liquid)" },
  { value: "drop",       label: "💧 Drop" },
  { value: "patch",      label: "🩹 Patch" },
  { value: "injection",  label: "💉 Injection" },
  { value: "other",      label: "📦 Other" },
]

export function EditMedicationDialog({ pm, open, onClose }: EditMedicationDialogProps) {
  const { toast } = useToast()
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

  // Container mode: when unitType is inhalation/ml/drop, show container calculator
  const isContainerType = ["inhalation", "ml", "drop", "injection"].includes(unitType)

  // ── Package management ──────────────────────────────────────────────────
  interface MedPackage {
    id: string
    quantity: number
    expiryDate: string
    lotNumber: string | null
    unitType: string
  }
  const [packages,       setPackages]       = useState<MedPackage[]>([])
  const [newPkgQty,      setNewPkgQty]      = useState(30)
  const [newPkgExpiry,   setNewPkgExpiry]   = useState("")
  const [newPkgLot,      setNewPkgLot]      = useState("")
  const [addingPkg,      setAddingPkg]      = useState(false)
  const [deletingPkgId,  setDeletingPkgId]  = useState<string | null>(null)

  const fetchPackages = async (pmId: string) => {
    const res = await fetch(`/api/packages?patientMedicationId=${pmId}`)
    if (res.ok) {
      const d = await res.json()
      setPackages(d.data ?? [])
    }
  }

  const addPackage = async () => {
    if (!pm || !newPkgExpiry) return
    setAddingPkg(true)
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientMedicationId: pm.id,
          quantity:   newPkgQty,
          expiryDate: newPkgExpiry,
          unitType:   pm.unitType,
          lotNumber:  newPkgLot || undefined,
        }),
      })
      if (res.ok) {
        toast({ title: "Package added" })
        setNewPkgQty(30); setNewPkgExpiry(""); setNewPkgLot("")
        await fetchPackages(pm.id)
      } else {
        toast({ title: "Failed to add package", variant: "destructive" })
      }
    } finally { setAddingPkg(false) }
  }

  const deletePackage = async (pkgId: string) => {
    if (!pm) return
    setDeletingPkgId(pkgId)
    try {
      await fetch(`/api/packages/${pkgId}`, { method: "DELETE" })
      await fetchPackages(pm.id)
    } finally { setDeletingPkgId(null) }
  }

  useEffect(() => {
    if (!pm) return
    // Drug info
    setMedicationName(pm.medication.name ?? "")
    setBrandName(pm.medication.brandName ?? "")
    setStrength(pm.medication.strength ?? "")
    const rawTags = (pm.medication as any).tags
    setTags(
      Array.isArray(rawTags) ? rawTags
      : typeof rawTags === "string" ? parseJsonArray<string>(rawTags, [])
      : []
    )
    setTagInput("")
    // Inventory
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

    // Load packages for this medication
    fetchPackages(pm.id)
  }, [pm])

  // When containers or dosesPerContainer change, sync pillsInStock
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
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }

  const handleSave = async () => {
    if (!pm) return
    setSaving(true)

    const totalUnits = isContainerType
      ? computeTotalUnitsFromContainers(containersInStock, dosesPerContainer)
      : pillsInStock

    const [pmRes, schRes] = await Promise.all([
      fetch(`/api/medications/${pm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationName: medicationName.trim(),
          brandName:      brandName.trim(),
          strength:       strength.trim(),
          tags,
          unitType,
          pillsInStock: totalUnits,
          dosesPerContainer,
          containersInStock,
          lowStockThreshold,
          lowStockPills,
          notes,
        }),
      }),
      pm.schedules.length > 0
        ? fetch(`/api/schedules/${pm.schedules[0].id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ frequency, timesOfDay, daysOfWeek, pillsPerDose }),
          })
        : Promise.resolve(new Response(JSON.stringify({}), { status: 200 })),
    ])

    setSaving(false)

    if (!pmRes.ok || !schRes.ok) {
      toast({ title: "Error updating medication", variant: "destructive" })
      return
    }

    toast({ title: "Medication updated!" })
    onClose()
  }

  if (!pm) return null

  const containersLeft = isContainerType
    ? computeContainersRemaining(pillsInStock, dosesPerContainer)
    : null

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit — {medicationName || pm.medication.name}
            {(strength || pm.medication.strength) && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {strength || pm.medication.strength}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="drug">
          <TabsList className="w-full">
            <TabsTrigger value="drug"      className="flex-1">Drug Info</TabsTrigger>
            <TabsTrigger value="inventory" className="flex-1">Inventory</TabsTrigger>
            <TabsTrigger value="schedule"  className="flex-1">Schedule</TabsTrigger>
          </TabsList>

          {/* ── Drug Info tab ── */}
          <TabsContent value="drug" className="space-y-4 pt-2">
            <div>
              <Label htmlFor="med-name">Drug name (generic / INN)</Label>
              <Input
                id="med-name"
                value={medicationName}
                onChange={e => setMedicationName(e.target.value)}
                placeholder="e.g. Ibuprofen"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="brand-name">Brand / Trade name</Label>
              <Input
                id="brand-name"
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                placeholder="e.g. Nurofen, Advil"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="strength">Dose strength (e.g. 400 mg, 5 ml, 10 mcg)</Label>
              <Input
                id="strength"
                value={strength}
                onChange={e => setStrength(e.target.value)}
                placeholder="e.g. 500 mg"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Include the unit — e.g. <code className="bg-muted px-1 rounded">200 mg</code>, <code className="bg-muted px-1 rounded">5 ml</code>, <code className="bg-muted px-1 rounded">25 mcg</code>
              </p>
            </div>

            {/* Tags */}
            <div>
              <Label>Category Tags</Label>
              {/* Selected tags */}
              {tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                        className="ml-0.5 rounded-full hover:text-blue-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Free-text input */}
              <div className="mt-2 flex gap-2">
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                      e.preventDefault()
                      const t = tagInput.trim()
                      if (!tags.includes(t)) setTags(prev => [...prev, t])
                      setTagInput("")
                    }
                  }}
                  placeholder="Type a tag and press Enter…"
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  type="button" size="sm" variant="outline"
                  className="h-8 px-2"
                  onClick={() => {
                    const t = tagInput.trim()
                    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
                    setTagInput("")
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Preset suggestions */}
              <div className="mt-2">
                <p className="text-[11px] text-muted-foreground mb-1.5">Quick add:</p>
                <div className="flex flex-wrap gap-1">
                  {PRESET_TAGS.filter(t => !tags.includes(t)).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTags(prev => [...prev, t])}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      + {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Inventory tab ── */}
          <TabsContent value="inventory" className="space-y-4 pt-2">

            {/* Unit type selector */}
            <div>
              <Label>Unit / Dosage type</Label>
              <Select value={unitType} onValueChange={setUnitType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map(u => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Container mode (inhalation / liquid) */}
            {isContainerType ? (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                  <Calculator className="w-4 h-4" />
                  Container Calculator
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{unitLabel(unitType)} per {containerLabel(unitType)}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={dosesPerContainer}
                      onChange={e => handleContainerChange(containersInStock, Number(e.target.value))}
                      className="mt-1"
                      placeholder="e.g. 100"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Number of {containerLabel(unitType)}s in stock</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={containersInStock}
                      onChange={e => handleContainerChange(Number(e.target.value), dosesPerContainer)}
                      className="mt-1"
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>

                {/* Calculated summary */}
                <div className="bg-white rounded-md p-3 text-sm space-y-1 border border-blue-100">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total {unitLabel(unitType)}:</span>
                    <span className="font-semibold">{computeTotalUnitsFromContainers(containersInStock, dosesPerContainer).toLocaleString()}</span>
                  </div>
                  {containersLeft !== null && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Equivalent {containerLabel(unitType)}s:</span>
                      <span>{containersLeft.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Also allow manual total override */}
                <div>
                  <Label className="text-xs">Or enter total {unitLabel(unitType)} directly</Label>
                  <Input
                    type="number"
                    min={0}
                    value={pillsInStock}
                    onChange={e => {
                      const total = Number(e.target.value)
                      setPillsInStock(total)
                      setContainersInStock(dosesPerContainer > 0 ? total / dosesPerContainer : 0)
                    }}
                    className="mt-1"
                  />
                </div>
              </div>
            ) : (
              /* Simple pill/tablet mode */
              <div>
                <Label>{unitLabel(unitType)} in stock</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={pillsInStock}
                  onChange={e => setPillsInStock(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Low-stock alert (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={lowStockThreshold}
                  onChange={e => setLowStockThreshold(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Low-stock alert ({unitLabel(unitType)})</Label>
                <Input
                  type="number"
                  min={1}
                  step={0.5}
                  value={lowStockPills}
                  onChange={e => setLowStockPills(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Special instructions, notes..."
                rows={2}
                className="mt-1"
              />
            </div>

            {/* ── Packages sub-section ── */}
            <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 space-y-3">
              <p className="text-sm font-semibold text-violet-800">📦 Packages</p>

              {/* Existing packages list */}
              {packages.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No packages recorded yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {[...packages]
                    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                    .map(pkg => (
                      <div key={pkg.id} className="flex items-center justify-between gap-2 rounded-lg border border-violet-100 bg-white px-3 py-2 text-xs">
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-slate-900">{pkg.quantity} {unitLabel(pkg.unitType)}</span>
                          <span className="mx-1.5 text-slate-400">·</span>
                          <span className="text-slate-600">Exp {format(new Date(pkg.expiryDate), "dd MMM yyyy")}</span>
                          {pkg.lotNumber && <span className="ml-1.5 font-mono text-slate-400">Lot {pkg.lotNumber}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => deletePackage(pkg.id)}
                          disabled={deletingPkgId === pkg.id}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                        >
                          {deletingPkgId === pkg.id
                            ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-200 border-t-red-500" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {/* Add new package row */}
              <div className="space-y-2 border-t border-violet-100 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">Add Package</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Qty ({unitLabel(unitType)})</Label>
                    <Input type="number" min={1} step={0.5} value={newPkgQty}
                      onChange={e => setNewPkgQty(Number(e.target.value))} className="mt-0.5 h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Expiry Date *</Label>
                    <Input type="date" value={newPkgExpiry}
                      onChange={e => setNewPkgExpiry(e.target.value)} className="mt-0.5 h-8 text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px]">Lot # (optional)</Label>
                  <Input type="text" placeholder="e.g. LOT2025A" value={newPkgLot}
                    onChange={e => setNewPkgLot(e.target.value)} className="mt-0.5 h-8 text-xs" />
                </div>
                <Button type="button" size="sm" variant="outline"
                  className="w-full border-violet-200 text-violet-700 hover:bg-violet-50"
                  onClick={addPackage}
                  disabled={addingPkg || !newPkgExpiry}
                >
                  {addingPkg
                    ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Adding…</>
                    : <><Plus className="mr-1.5 h-3.5 w-3.5" />Add Package</>}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── Schedule tab ── */}
          <TabsContent value="schedule" className="space-y-4 pt-2">
            <div>
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={handleFrequencyChange}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Once daily</SelectItem>
                  <SelectItem value="BID">Twice daily (BID)</SelectItem>
                  <SelectItem value="TID">Three times daily (TID)</SelectItem>
                  <SelectItem value="QID">Four times daily (QID)</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="AS_NEEDED">As needed (PRN)</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Times of day</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {timesOfDay.map((t, i) => (
                  <Input
                    key={i}
                    type="time"
                    value={t}
                    onChange={e => setTimesOfDay(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                    className="w-32"
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>Days of week</Label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {DAYS_OF_WEEK.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                      daysOfWeek.includes(d.value)
                        ? "bg-blue-500 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>{unitLabel(unitType)} per dose</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min={0.25}
                  step={0.5}
                  value={pillsPerDose}
                  onChange={e => setPillsPerDose(Number(e.target.value))}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">
                  (e.g. 0.5, 1, 2 {unitLabel(unitType)})
                </span>
              </div>
              {pillsPerDose % 1 !== 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  ½ dose — {pillsPerDose} {unitLabel(unitType, pillsPerDose)} per dose
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

