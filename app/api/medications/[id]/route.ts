import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { medicationSchema } from "@/lib/validations/medication"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const med = await prisma.medication.findUnique({
    where: { id },
    include: { patientMedications: { include: { patient: true, schedules: true } } }
  })
  if (!med) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ data: med })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  if (body.pillsInStock !== undefined || body.lowStockThreshold !== undefined || body.unitType !== undefined || body.medicationName !== undefined) {
    const pm = await prisma.patientMedication.findUnique({ where: { id } })
    if (!pm) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const oldStock = pm.pillsInStock
    const newStock = body.pillsInStock ?? pm.pillsInStock

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      pillsInStock:      newStock,
      lowStockThreshold: body.lowStockThreshold  ?? pm.lowStockThreshold,
      lowStockPills:     body.lowStockPills       ?? pm.lowStockPills,
      notes:             body.notes !== undefined ? body.notes : pm.notes,
    }
    if (body.unitType !== undefined)          updateData.unitType          = body.unitType
    if (body.dosesPerContainer !== undefined) updateData.dosesPerContainer = Number(body.dosesPerContainer)
    if (body.containersInStock !== undefined) updateData.containersInStock = Number(body.containersInStock)

    const updated = await prisma.patientMedication.update({ where: { id }, data: updateData })

    if (body.medicationName !== undefined || body.brandName !== undefined || body.strength !== undefined || body.tags !== undefined) {
      const medUpdate: Record<string, string | null> = {}
      if (body.medicationName !== undefined) medUpdate.name      = body.medicationName
      if (body.brandName      !== undefined) medUpdate.brandName = body.brandName || null
      if (body.strength       !== undefined) medUpdate.strength  = body.strength  || null
      if (body.tags           !== undefined) medUpdate.tags      = JSON.stringify(Array.isArray(body.tags) ? body.tags : [])
      await prisma.medication.update({ where: { id: pm.medicationId }, data: medUpdate })
    }

    if (newStock !== oldStock) {
      await prisma.inventoryEvent.create({
        data: {
          patientMedicationId: pm.id,
          type:     newStock > oldStock ? "RESTOCK" : "ADJUSTMENT",
          quantity: newStock - oldStock,
          reason:   body.reason ?? "Manual adjustment",
        }
      })
    }
    return NextResponse.json({ data: updated })
  }

  const parsed = medicationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
  const { tags, ...rest } = parsed.data
  const updated = await prisma.medication.update({
    where: { id },
    data: { ...rest, imageUrl: rest.imageUrl || null, tags: tags ? JSON.stringify(tags) : "[]" }
  })
  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const pm = await prisma.patientMedication.findUnique({ where: { id } })
  if (pm) {
    await prisma.patientMedication.delete({ where: { id } })
    return NextResponse.json({ message: "Removed from patient" })
  }

  const med = await prisma.medication.findUnique({
    where: { id },
    include: { _count: { select: { patientMedications: true } } }
  })
  if (!med) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (med._count.patientMedications > 0) {
    return NextResponse.json({ error: `Cannot delete — assigned to ${med._count.patientMedications} patient(s).` }, { status: 409 })
  }
  await prisma.medication.delete({ where: { id } })
  return NextResponse.json({ message: "Deleted from catalog" })
}
