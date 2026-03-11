import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/inventory/[id] - restock (add pills)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { quantity, reason } = body

  if (!quantity || quantity <= 0) {
    return NextResponse.json({ error: "Quantity must be positive" }, { status: 400 })
  }

  const pm = await prisma.patientMedication.findUnique({ where: { id: params.id } })
  if (!pm) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.patientMedication.update({
    where: { id: params.id },
    data: { pillsInStock: { increment: quantity } }
  })

  await prisma.inventoryEvent.create({
    data: {
      patientMedicationId: params.id,
      type: "RESTOCK",
      quantity,
      reason: reason ?? "Restock"
    }
  })

  return NextResponse.json({ data: updated })
}

