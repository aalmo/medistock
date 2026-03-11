import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { scheduleSchema } from "@/lib/validations/schedule"
import { generateDoseTimes } from "@/lib/calculations"
import { addDays } from "date-fns"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as { id: string }).id
  const { searchParams } = new URL(req.url)
  const patientMedicationId = searchParams.get("patientMedicationId")

  const where: any = {
    patientMedication: { patient: { userId } },
    ...(patientMedicationId ? { patientMedicationId } : {})
  }

  const schedules = await prisma.schedule.findMany({
    where,
    include: {
      patientMedication: {
        include: { medication: true, patient: true }
      },
      doseLogs: {
        orderBy: { scheduledAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  return NextResponse.json({ data: schedules })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = scheduleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })

  const { startDate, endDate, timesOfDay, daysOfWeek, pillsPerDose, ...rest } = parsed.data

  const schedule = await prisma.schedule.create({
    data: {
      ...rest,
      timesOfDay: JSON.stringify(timesOfDay) as any,
      daysOfWeek: JSON.stringify(daysOfWeek) as any,
      pillsPerDose,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
    }
  })

  // Pre-generate DoseLogs for next 30 days
  const from = new Date()
  const to = addDays(from, 30)
  const doseTimes = generateDoseTimes(
    { timesOfDay, daysOfWeek, pillsPerDose, startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : null },
    from,
    to
  )

  if (doseTimes.length > 0) {
    await prisma.doseLog.createMany({
      data: doseTimes.map(dt => ({
        scheduleId:       schedule.id,
        scheduledAt:      dt,
        status:           "PENDING" as const,
        pillsDecremented: 0 as number,
      })),
    })
  }

  return NextResponse.json({ data: schedule }, { status: 201 })
}

