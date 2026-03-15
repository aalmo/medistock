"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MedicationSearchCombobox } from "@/components/medications/MedicationSearchCombobox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Calculator } from "lucide-react"
import { format } from "date-fns"
import { unitLabel, containerLabel } from "@/lib/calculations"

interface AddMedicationDialogProps {
  patientId: string
  open: boolean
  onClose: () => void
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

const DAYS_OF_WEEK = [
  { label: "Mon", value: 1 }, { label: "Tue", value: 2 }, { label: "Wed", value: 3 },
  { label: "Thu", value: 4 }, { label: "Fri", value: 5 }, { label: "Sat", value: 6 }, { label: "Sun", value: 7 }
]

const PRESET_TIMES: Record<string, string[]> = {
  DAILY: ["08:00"],
  BID: ["08:00", "20:00"],
  TID: ["08:00", "14:00", "20:00"],
  QID: ["06:00", "12:00", "18:00", "22:00"],
}

export function AddMedicationDialog({ patientId, open, onClose }: AddMedicationDialogProps) {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  const [selectedMed, setSelectedMed] = useState<{
    rxcui?: string; name: string; brandName?: string; genericName?: string
    strength?: string; form?: string; manufacturer?: string; ingredients?: string
  } | null>(null)
  const [medId, setMedId] = useState<string | null>(null)

  const [frequency, setFrequency] = useState("DAILY")
  const [timesOfDay, setTimesOfDay] = useState(["08:00"])
  const [daysOfWeek, setDaysOfWeek] = useState([1, 2, 3, 4, 5, 6, 7])
  const [pillsPerDose, setPillsPerDose] = useState(1)

  const [unitType, setUnitType] = useState("pill")
  const [dosesPerContainer, setDosesPerContainer] = useState(100)
  const [lowStockThreshold, setLowStockThreshold] = useState(7)

  // Single package row for Step 3
  const [pkgQuantity,   setPkgQuantity]   = useState(30)
  const [pkgCount,      setPkgCount]      = useState(1)
  const [pkgExpiryDate, setPkgExpiryDate] = useState("")
  const [pkgLotNumber,  setPkgLotNumber]  = useState("")

  const isContainerType = ["inhalation", "ml", "drop", "injection"].includes(unitType)

  const handleFrequencyChange = (freq: string) => {
    setFrequency(freq)
    setTimesOfDay(PRESET_TIMES[freq] ?? ["08:00"])
  }

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort())
  }

  const handleMedSelect = async (drug: {
    rxcui?: string; name: string; brandName?: string; genericName?: string
    strength?: string; form?: string; manufacturer?: string; ingredients?: string
  }) => {
    setSelectedMed(drug)
    // Create or find medication in catalog — save ALL metadata
    const res = await fetch("/api/medications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:        drug.name,
        brandName:   drug.brandName   ?? null,
        genericName: drug.genericName ?? null,
        strength:    drug.strength    ?? null,
        form:        drug.form        ?? null,
        rxcui:       drug.rxcui       ?? null,
        ingredients: drug.ingredients ?? null,
      })
    })
    if (res.ok) {
      const data = await res.json()
      setMedId(data.data.id)
    }
    setStep(2)
  }

  const handleFinish = async () => {
    if (!medId) return
    if (!pkgExpiryDate) {
      toast({ title: "Please set a package expiry date", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      // 1. Create PatientMedication — pillsInStock = packages × quantity per package
      const totalUnits = pkgCount * pkgQuantity
      const pmRes = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          medicationId: medId,
          unitType,
          pillsInStock:      totalUnits,
          dosesPerContainer: isContainerType ? dosesPerContainer : 1,
          containersInStock: isContainerType ? Math.floor(totalUnits / dosesPerContainer) : 0,
          lowStockThreshold,
        }),
      })
      if (!pmRes.ok) throw new Error("Failed to assign medication")
      const pmData = await pmRes.json()
      const pmId = pmData.data.id

      // 2. Create one MedicationPackage per package count (all same expiry/lot)
      for (let i = 0; i < pkgCount; i++) {
        await fetch("/api/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientMedicationId: pmId,
            quantity:   pkgQuantity,
            expiryDate: pkgExpiryDate,
            unitType,
            lotNumber:  pkgLotNumber || undefined,
          }),
        })
      }

      // 3. Create Schedule
      await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientMedicationId: pmId,
          frequency,
          timesOfDay,
          daysOfWeek,
          pillsPerDose,
          startDate: format(new Date(), "yyyy-MM-dd"),
        }),
      })

      toast({ title: "Medication added successfully!" })
      setStep(1)
      setSelectedMed(null)
      setMedId(null)
      setPkgCount(1)
      setPkgExpiryDate("")
      setPkgLotNumber("")
      onClose()
    } catch {
      toast({ title: "Error adding medication", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => { setStep(1); onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Step 1: Search Medication"}
            {step === 2 && "Step 2: Configure Schedule"}
            {step === 3 && "Step 3: Set Inventory"}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex gap-2 mb-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-blue-500" : "bg-muted"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Search for a medication by name (powered by RxNorm)</p>
            <MedicationSearchCombobox
              onSelect={handleMedSelect}
              placeholder="e.g. Aspirin, Metformin, Lisinopril..."
            />
            <p className="text-xs text-muted-foreground">Or enter manually:</p>
            <div className="flex gap-2">
              <Input placeholder="Medication name" id="manual-name" />
              <Button variant="outline" onClick={() => {
                const val = (document.getElementById("manual-name") as HTMLInputElement)?.value
                if (val) handleMedSelect({ name: val })
              }}>Use</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {/* Selected drug summary card */}
            {selectedMed && (
              <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-base">💊</span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">
                    {selectedMed.brandName ?? selectedMed.name}
                    {selectedMed.strength && (
                      <span className="ml-1.5 font-normal text-gray-500">({selectedMed.strength})</span>
                    )}
                  </p>
                  {selectedMed.genericName && selectedMed.genericName !== (selectedMed.brandName ?? selectedMed.name) && (
                    <p className="text-xs text-muted-foreground italic">{selectedMed.genericName}</p>
                  )}
                  {selectedMed.brandName && selectedMed.brandName !== selectedMed.name && (
                    <p className="text-xs text-muted-foreground">{selectedMed.name}</p>
                  )}
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {selectedMed.form && (
                      <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded font-medium uppercase">{selectedMed.form}</span>
                    )}
                    {selectedMed.rxcui && (
                      <span className="text-[10px] font-mono text-gray-400">RxCUI {selectedMed.rxcui}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={handleFrequencyChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Once daily</SelectItem>
                  <SelectItem value="BID">Twice daily (BID)</SelectItem>
                  <SelectItem value="TID">Three times daily (TID)</SelectItem>
                  <SelectItem value="QID">Four times daily (QID)</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="AS_NEEDED">As needed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Times of Day</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {timesOfDay.map((t, i) => (
                  <Input key={i} type="time" value={t} onChange={e => setTimesOfDay(prev => prev.map((v, j) => j === i ? e.target.value : v))} className="w-32" />
                ))}
              </div>
            </div>

            <div>
              <Label>Days of Week</Label>
              <div className="flex gap-1 mt-1">
                {DAYS_OF_WEEK.map(d => (
                  <button
                    key={d.value}
                    onClick={() => toggleDay(d.value)}
                    className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                      daysOfWeek.includes(d.value) ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Pills per dose</Label>
              <Input type="number" min={0.25} step={0.5} value={pillsPerDose} onChange={e => setPillsPerDose(Number(e.target.value))} className="w-24 mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Supports 0.5 (half pill), 1, 2, etc.</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label>Unit / Dosage type</Label>
              <Select value={unitType} onValueChange={setUnitType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map(u => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Container info for inhalation/liquid types */}
            {isContainerType && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                  <Calculator className="w-4 h-4" />
                  {containerLabel(unitType)} info
                </div>
                <div>
                  <Label className="text-xs">{unitLabel(unitType)} per {containerLabel(unitType)}</Label>
                  <Input type="number" min={1} value={dosesPerContainer}
                    onChange={e => setDosesPerContainer(Number(e.target.value))} className="mt-1" placeholder="e.g. 100" />
                </div>
              </div>
            )}

            {/* Package row */}
            <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 space-y-3">
              <p className="text-sm font-semibold text-violet-800">📦 Package Details</p>

              {/* Number of packages + doses per package */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Number of packages</Label>
                  <Input
                    type="number" min={1} step={1}
                    value={pkgCount}
                    onChange={e => setPkgCount(Math.max(1, Math.floor(Number(e.target.value))))}
                    className="mt-1"
                    placeholder="e.g. 3"
                  />
                </div>
                <div>
                  <Label className="text-xs">{unitLabel(unitType)} per package</Label>
                  <Input
                    type="number" min={1} step={0.5}
                    value={pkgQuantity}
                    onChange={e => setPkgQuantity(Number(e.target.value))}
                    className="mt-1"
                    placeholder="e.g. 30"
                  />
                </div>
              </div>

              {/* Total preview */}
              {pkgCount > 1 && (
                <div className="flex items-center justify-between rounded-lg bg-violet-100/70 px-3 py-2 text-xs font-medium text-violet-800">
                  <span>{pkgCount} packages × {pkgQuantity} {unitLabel(unitType)}</span>
                  <span className="font-bold">{pkgCount * pkgQuantity} {unitLabel(unitType)} total</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Expiry Date *</Label>
                  <Input
                    type="date"
                    value={pkgExpiryDate}
                    onChange={e => setPkgExpiryDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Lot Number (optional)</Label>
                  <Input
                    type="text"
                    value={pkgLotNumber}
                    onChange={e => setPkgLotNumber(e.target.value)}
                    placeholder="e.g. LOT2025A"
                    className="mt-1"
                  />
                </div>
              </div>

              <p className="text-[11px] text-violet-600">
                {pkgCount > 1
                  ? `${pkgCount} separate package records will be created, each with ${pkgQuantity} ${unitLabel(unitType)}.`
                  : "More packages can be added later from the patient page."}
              </p>
            </div>

            <div>
              <Label>Low stock alert (days)</Label>
              <Input type="number" min={1} value={lowStockThreshold}
                onChange={e => setLowStockThreshold(Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Alert when less than {lowStockThreshold} days of medication remain</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>}
          {step < 3 && step > 1 && <Button onClick={() => setStep(s => s + 1)}>Next</Button>}
          {step === 3 && (
            <Button onClick={handleFinish} disabled={saving || !pkgExpiryDate}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Medication
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

