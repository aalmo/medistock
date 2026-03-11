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
import { Loader2, Calculator } from "lucide-react"
import { parseJsonArray, unitLabel, containerLabel, computeTotalUnitsFromContainers, computeContainersRemaining } from "@/lib/calculations"

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

  useEffect(() => {
    if (!pm) return
    // Drug info
    setMedicationName(pm.medication.name ?? "")
    setBrandName(pm.medication.brandName ?? "")
    setStrength(pm.medication.strength ?? "")
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

