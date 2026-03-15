import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { doseLogUpdateSchema } from "@/lib/validations/schedule"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const doseLogId = searchParams.get("doseLogId")
  if (doseLogId) {
    const log = await prisma.doseLog.findUnique({ where: { id: doseLogId } })
    return NextResponse.json({ data: log })
  }
  const schedule = await prisma.schedule.findUnique({
    where: { id },
    include: {
      doseLogs: { orderBy: { scheduledAt: "desc" }, take: 50 },
      patientMedication: { include: { medication: true, patient: true } }
    }
  })
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ data: schedule })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = doseLogUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })

  const doseLog = await prisma.doseLog.findUnique({
    where: { id },
    include: { schedule: { include: { patientMedication: true } } }
  })
  if (!doseLog) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const wasTaken = doseLog.status === "TAKEN"
  const nowTaken = parsed.data.status === "TAKEN"

  const updated = await prisma.doseLog.update({
    where: { id },
    data: {
      status:           parsed.data.status,
      takenAt:          nowTaken ? new Date(parsed.data.takenAt ?? Date.now()) : null,
      notes:            parsed.data.notes,
      pillsDecremented: nowTaken ? doseLog.schedule.pillsPerDose : 0
    }
  })

  const pm = doseLog.schedule.patientMedication
  if (nowTaken && !wasTaken) {
    await prisma.patientMedication.update({ where: { id: pm.id }, data: { pillsInStock: { decrement: doseLog.schedule.pillsPerDose } } })
    await prisma.inventoryEvent.create({ data: { patientMedicationId: pm.id, type: "DECREMENT", quantity: -doseLog.schedule.pillsPerDose, reason: "Dose taken" } })
  } else if (!nowTaken && wasTaken) {
    await prisma.patientMedication.update({ where: { id: pm.id }, data: { pillsInStock: { increment: doseLog.schedule.pillsPerDose } } })
    await prisma.inventoryEvent.create({ data: { patientMedicationId: pm.id, type: "ADJUSTMENT", quantity: doseLog.schedule.pillsPerDose, reason: "Dose status reversed" } })
  }

  return NextResponse.json({ data: updated })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const { frequency, timesOfDay, daysOfWeek, pillsPerDose } = body

  const schedule = await prisma.schedule.findUnique({ where: { id } })
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.schedule.update({
    where: { id },
    data: {
      ...(frequency    && { frequency }),
      ...(timesOfDay   && { timesOfDay:  JSON.stringify(timesOfDay) }),
      ...(daysOfWeek   && { daysOfWeek:  JSON.stringify(daysOfWeek) }),
      ...(pillsPerDose !== undefined && { pillsPerDose: Number(pillsPerDose) }),
    }
  })
  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.schedule.update({ where: { id }, data: { active: false } })
  return NextResponse.json({ message: "Schedule deactivated" })
}
