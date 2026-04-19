import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { syncPillsInStock } from "@/lib/inventory-sync"

// PATCH /api/inventory/[id] - restock by adding a new package
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { quantity, expiryDate, lotNumber, reason } = body

  if (!quantity || quantity <= 0) {
    return NextResponse.json({ error: "Quantity must be positive" }, { status: 400 })
  }
  if (!expiryDate) {
    return NextResponse.json({ error: "Expiry date is required" }, { status: 400 })
  }

  const pm = await prisma.patientMedication.findUnique({ where: { id } })
  if (!pm) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const newTotal = await prisma.$transaction(async (tx) => {
    await tx.medicationPackage.create({
      data: {
        patientMedicationId: id,
        quantity,
        expiryDate: new Date(expiryDate),
        unitType:   pm.unitType,
        lotNumber:  lotNumber ?? null,
      },
    })
    const stock = await syncPillsInStock(id, tx)
    await tx.inventoryEvent.create({
      data: {
        patientMedicationId: id,
        type:    "RESTOCK",
        quantity,
        reason:  reason ?? "Restock",
      },
    })
    return stock
  })

  return NextResponse.json({ data: { pillsInStock: newTotal } })
}
