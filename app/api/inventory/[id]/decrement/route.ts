import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { syncPillsInStock } from "@/lib/inventory-sync"
import { startOfDay } from "date-fns"

// POST /api/inventory/[id]/decrement - manual single dose decrement (FIFO)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const todayStart = startOfDay(new Date())

  const pm = await prisma.patientMedication.findUnique({
    where: { id },
    include: {
      schedules: { where: { active: true }, take: 1 },
      packages: {
        where:   { expiryDate: { gte: todayStart } },
        orderBy: { expiryDate: "asc" },
      },
    },
  })
  if (!pm) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const pillsPerDose = pm.schedules[0]?.pillsPerDose ?? 1

  let newStock: number

  if (pm.packages.length === 0) {
    // Legacy fallback — no packages
    if (pm.pillsInStock < pillsPerDose) {
      return NextResponse.json({ error: "Insufficient stock" }, { status: 400 })
    }
    const updated = await prisma.patientMedication.update({
      where: { id },
      data:  { pillsInStock: { decrement: pillsPerDose } },
    })
    newStock = updated.pillsInStock
  } else {
    // FIFO: deduct from earliest-expiry package first
    let remaining = pillsPerDose
    for (const pkg of pm.packages) {
      if (remaining <= 0) break
      const deduct = Math.min(pkg.quantity, remaining)
      const newQty = pkg.quantity - deduct
      if (newQty <= 0) {
        await prisma.medicationPackage.delete({ where: { id: pkg.id } })
      } else {
        await prisma.medicationPackage.update({ where: { id: pkg.id }, data: { quantity: newQty } })
      }
      remaining -= deduct
    }
    newStock = await syncPillsInStock(id)
  }

  await prisma.inventoryEvent.create({
    data: {
      patientMedicationId: id,
      type:     "DECREMENT",
      quantity: -pillsPerDose,
      reason:   "Manual dose",
    },
  })

  return NextResponse.json({ data: { pillsInStock: newStock } })
}

