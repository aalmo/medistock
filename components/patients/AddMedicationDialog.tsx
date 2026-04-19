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
import { containerLabel } from "@/lib/calculations"
import { useT, tUnitLabel } from "@/lib/i18n/context"

interface AddMedicationDialogProps {
  patientId: string
  open: boolean
  onClose: () => void
}

const PRESET_TIMES: Record<string, string[]> = {
  DAILY: ["08:00"],
  BID: ["08:00", "20:00"],
  TID: ["08:00", "14:00", "20:00"],
  QID: ["06:00", "12:00", "18:00", "22:00"],
}

export function AddMedicationDialog({ patientId, open, onClose }: AddMedicationDialogProps) {
  const { toast } = useToast()
  const { t } = useT()
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

  const [pkgQuantity,   setPkgQuantity]   = useState(30)
  const [pkgCount,      setPkgCount]      = useState(1)
  const [pkgExpiryDate, setPkgExpiryDate] = useState("")
  const [pkgLotNumber,  setPkgLotNumber]  = useState("")

  const isContainerType = ["inhalation", "ml", "drop", "injection"].includes(unitType)

  // Days of week using translation keys
  const DAYS_OF_WEEK = [
    { label: t.addMedDialog.mon, value: 1 },
    { label: t.addMedDialog.tue, value: 2 },
    { label: t.addMedDialog.wed, value: 3 },
    { label: t.addMedDialog.thu, value: 4 },
    { label: t.addMedDialog.fri, value: 5 },
    { label: t.addMedDialog.sat, value: 6 },
    { label: t.addMedDialog.sun, value: 7 },
  ]

  // Unit types with translated labels
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
      toast({ title: t.addMedDialog.noExpiryError, variant: "destructive" })
      return
    }
    setSaving(true)
    try {
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

      toast({ title: t.addMedDialog.savedSuccess })
      setStep(1)
      setSelectedMed(null)
      setMedId(null)
      setPkgCount(1)
      setPkgExpiryDate("")
      setPkgLotNumber("")
      onClose()
    } catch {
      toast({ title: t.addMedDialog.saveError, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => { setStep(1); onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && t.addMedDialog.step1Title}
            {step === 2 && t.addMedDialog.step2Title}
            {step === 3 && t.addMedDialog.step3Title}
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
            <p className="text-sm text-muted-foreground">{t.addMedDialog.searchHint}</p>
            <MedicationSearchCombobox
              onSelect={handleMedSelect}
              placeholder={t.addMedDialog.searchPlaceholder}
            />
            <p className="text-xs text-muted-foreground">{t.addMedDialog.orManual}</p>
            <div className="flex gap-2">
              <Input placeholder={t.addMedDialog.medNamePlaceholder} id="manual-name" />
              <Button variant="outline" onClick={() => {
                const val = (document.getElementById("manual-name") as HTMLInputElement)?.value
                if (val) handleMedSelect({ name: val })
              }}>{t.addMedDialog.use}</Button>
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
              <Label>{t.addMedDialog.frequency}</Label>
              <Select value={frequency} onValueChange={handleFrequencyChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">{t.addMedDialog.onceDailyLabel}</SelectItem>
                  <SelectItem value="BID">{t.addMedDialog.twiceDailyLabel}</SelectItem>
                  <SelectItem value="TID">{t.addMedDialog.threeTimesLabel}</SelectItem>
                  <SelectItem value="QID">{t.addMedDialog.fourTimesLabel}</SelectItem>
                  <SelectItem value="WEEKLY">{t.addMedDialog.weeklyLabel}</SelectItem>
                  <SelectItem value="AS_NEEDED">{t.addMedDialog.asNeededLabel}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t.addMedDialog.timesOfDay}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {timesOfDay.map((time, i) => (
                  <Input key={i} type="time" value={time}
                    onChange={e => setTimesOfDay(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                    className="w-32" />
                ))}
              </div>
            </div>

            <div>
              <Label>{t.addMedDialog.daysOfWeek}</Label>
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
              <Label>{t.addMedDialog.pillsPerDose}</Label>
              <Input type="number" min={0.25} step={0.5} value={pillsPerDose}
                onChange={e => setPillsPerDose(Number(e.target.value))} className="w-24 mt-1" />
              <p className="text-xs text-muted-foreground mt-1">{t.addMedDialog.pillsPerDoseHint}</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label>{t.addMedDialog.unitType}</Label>
              <Select value={unitType} onValueChange={setUnitType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map(u => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isContainerType && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                  <Calculator className="w-4 h-4" />
                  {containerLabel(unitType)} info
                </div>
                <div>
                  <Label className="text-xs">{tUnitLabel(t, unitType)} {t.addMedDialog.perPackage}</Label>
                  <Input type="number" min={1} value={dosesPerContainer}
                    onChange={e => setDosesPerContainer(Number(e.target.value))} className="mt-1" placeholder="e.g. 100" />
                </div>
              </div>
            )}

            <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 space-y-3">
              <p className="text-sm font-semibold text-violet-800">{t.addMedDialog.packageDetails}</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t.addMedDialog.numPackages}</Label>
                  <Input type="number" min={1} step={1} value={pkgCount}
                    onChange={e => setPkgCount(Math.max(1, Math.floor(Number(e.target.value))))}
                    className="mt-1" placeholder="e.g. 3" />
                </div>
                <div>
                  <Label className="text-xs">{tUnitLabel(t, unitType)} {t.addMedDialog.perPackage}</Label>
                  <Input type="number" min={1} step={0.5} value={pkgQuantity}
                    onChange={e => setPkgQuantity(Number(e.target.value))}
                    className="mt-1" placeholder="e.g. 30" />
                </div>
              </div>

              {pkgCount > 1 && (
                <div className="flex items-center justify-between rounded-lg bg-violet-100/70 px-3 py-2 text-xs font-medium text-violet-800">
                  <span>{pkgCount} × {pkgQuantity} {tUnitLabel(t, unitType)}</span>
                  <span className="font-bold">{pkgCount * pkgQuantity} {tUnitLabel(t, unitType)} {t.units.total}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t.addMedDialog.expiryDate}</Label>
                  <Input type="date" value={pkgExpiryDate}
                    onChange={e => setPkgExpiryDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">{t.addMedDialog.lotNumber} <span className="text-muted-foreground">({t.addMedDialog.lotOptional})</span></Label>
                  <Input type="text" value={pkgLotNumber}
                    onChange={e => setPkgLotNumber(e.target.value)}
                    placeholder="e.g. LOT2025A" className="mt-1" />
                </div>
              </div>

              <p className="text-[11px] text-violet-600">
                {pkgCount > 1
                  ? t.addMedDialog.multiPkgNote
                      .replace("{count}", String(pkgCount))
                      .replace("{qty}", String(pkgQuantity))
                      .replace("{unit}", tUnitLabel(t, unitType))
                  : t.addMedDialog.morePkgLater}
              </p>
            </div>

            <div>
              <Label>{t.addMedDialog.lowStockDays}</Label>
              <Input type="number" min={1} value={lowStockThreshold}
                onChange={e => setLowStockThreshold(Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">
                {t.addMedDialog.lowStockHint.replace("{days}", String(lowStockThreshold))}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>{t.addMedDialog.back}</Button>}
          {step < 3 && step > 1 && <Button onClick={() => setStep(s => s + 1)}>{t.addMedDialog.next}</Button>}
          {step === 3 && (
            <Button onClick={handleFinish} disabled={saving || !pkgExpiryDate}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.addMedDialog.save}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

