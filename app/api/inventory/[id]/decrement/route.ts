import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/inventory/[id]/decrement - manual single dose decrement
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const pm = await prisma.patientMedication.findUnique({
    where: { id: params.id },
    include: { schedules: { where: { active: true }, take: 1 } }
  })
  if (!pm) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const pillsPerDose = pm.schedules[0]?.pillsPerDose ?? 1

  if (pm.pillsInStock < pillsPerDose) {
    return NextResponse.json({ error: "Insufficient stock" }, { status: 400 })
  }

  const updated = await prisma.patientMedication.update({
    where: { id: params.id },
    data: { pillsInStock: { decrement: pillsPerDose } }
  })

  await prisma.inventoryEvent.create({
    data: {
      patientMedicationId: params.id,
      type: "DECREMENT",
      quantity: -pillsPerDose,
      reason: "Manual dose"
    }
  })

  return NextResponse.json({ data: updated })
}

