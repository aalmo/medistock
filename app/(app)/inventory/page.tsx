"use client"

import { useEffect, useState } from "react"
import { Package, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface InventoryItem {
  patientMedicationId: string
  patientName: string
  medicationName: string
  medicationStrength: string | null
  pillsInStock: number
  avgDailyPills: number
  daysRemaining: number
  stockStatus: "ok" | "low" | "critical"
  lowStockThreshold: number
}

export default function InventoryPage() {
  const { toast } = useToast()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [restocking, setRestocking] = useState<InventoryItem | null>(null)
  const [restockQty, setRestockQty] = useState(30)

  const fetchInventory = () => {
    fetch("/api/inventory")
      .then(r => r.json())
      .then(d => setInventory(d.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchInventory() }, [])

  const handleRestock = async () => {
    if (!restocking) return
    const res = await fetch(`/api/inventory/${restocking.patientMedicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: restockQty, reason: "Manual restock" })
    })
    if (res.ok) {
      toast({ title: `Added ${restockQty} pills to ${restocking.medicationName}` })
      setRestocking(null)
      fetchInventory()
    }
  }

  const statusBadge = (status: string) => {
    if (status === "critical") return <Badge variant="danger">Critical</Badge>
    if (status === "low") return <Badge variant="warning">Low Stock</Badge>
    return <Badge variant="success">OK</Badge>
  }

  const sorted = [...inventory].sort((a, b) => {
    const order = { critical: 0, low: 1, ok: 2 }
    return order[a.stockStatus] - order[b.stockStatus]
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm">
            {inventory.filter(i => i.stockStatus !== "ok").length} medications need attention
          </p>
        </div>
        <Button variant="outline" onClick={fetchInventory}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg" />)}</div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient / Medication</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">In Stock</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Avg/Day</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Days Left</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map(item => (
                <tr key={item.patientMedicationId} className={item.stockStatus === "critical" ? "bg-red-50" : item.stockStatus === "low" ? "bg-yellow-50" : ""}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.medicationName} {item.medicationStrength && <span className="text-muted-foreground font-normal">{item.medicationStrength}</span>}</p>
                    <p className="text-xs text-muted-foreground">{item.patientName}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{item.pillsInStock}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{item.avgDailyPills}</td>
                  <td className="px-4 py-3 text-right font-semibold">{item.daysRemaining >= 999 ? "∞" : item.daysRemaining}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(item.stockStatus)}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => { setRestocking(item); setRestockQty(30) }}>
                      <Package className="w-3 h-3 mr-1" /> Restock
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!restocking} onOpenChange={() => setRestocking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock: {restocking?.medicationName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Patient: {restocking?.patientName}</p>
            <p className="text-sm">Current stock: <strong>{restocking?.pillsInStock} pills</strong></p>
            <div>
              <Label>Quantity to add</Label>
              <Input type="number" min={1} value={restockQty} onChange={e => setRestockQty(Number(e.target.value))} className="mt-1" />
            </div>
            <p className="text-sm text-muted-foreground">New total: {(restocking?.pillsInStock ?? 0) + restockQty} pills (~{Math.floor(((restocking?.pillsInStock ?? 0) + restockQty) / (restocking?.avgDailyPills || 1))} days)</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestocking(null)}>Cancel</Button>
            <Button onClick={handleRestock}>Confirm Restock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

