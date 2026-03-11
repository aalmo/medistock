import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { medicationSchema, patientMedicationSchema } from "@/lib/validations/medication"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get("patientId")

  if (patientId) {
    const userId = (session.user as { id: string }).id
    const patient = await prisma.patient.findFirst({ where: { id: patientId, userId } })
    if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const meds = await prisma.patientMedication.findMany({
      where: { patientId },
      include: { medication: true, schedules: { where: { active: true } } }
    })
    return NextResponse.json({ data: meds })
  }

  const userId = (session.user as { id: string }).id
  const meds = await prisma.medication.findMany({
    orderBy: { name: "asc" },
    include: {
      patientMedications: {
        where: { active: true, patient: { userId } },
        include: {
          patient: { select: { id: true, name: true } },
          schedules: { where: { active: true }, take: 1 },
        }
      }
    }
  })
  return NextResponse.json({ data: meds })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  // Check if assigning existing med to patient
  if (body.patientId && body.medicationId) {
    const parsed = patientMedicationSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })

    // Build create data — cast to any to handle new fields with stale TS cached Prisma types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createData: any = {
      patientId:         parsed.data.patientId,
      medicationId:      parsed.data.medicationId,
      unitType:          parsed.data.unitType          ?? 'pill',
      pillsInStock:      parsed.data.pillsInStock      ?? 0,
      dosesPerContainer: parsed.data.dosesPerContainer ?? 1,
      containersInStock: parsed.data.containersInStock ?? 0,
      lowStockThreshold: parsed.data.lowStockThreshold ?? 7,
      lowStockPills:     parsed.data.lowStockPills     ?? 14,
      notes:             parsed.data.notes             ?? null,
    }

    const pm = await prisma.patientMedication.create({
      data: createData,
      include: { medication: true }
    })

    // Log inventory event
    await prisma.inventoryEvent.create({
      data: {
        patientMedicationId: pm.id,
        type: "RESTOCK",
        quantity: parsed.data.pillsInStock,
        reason: "Initial stock"
      }
    })

    return NextResponse.json({ data: pm }, { status: 201 })
  }

  // Upsert medication in catalog — update metadata if it already exists by name
  const parsed = medicationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })

  const medData = {
    name:        parsed.data.name,
    brandName:   parsed.data.brandName   ?? null,
    genericName: parsed.data.genericName ?? null,
    form:        parsed.data.form        ?? null,
    strength:    parsed.data.strength    ?? null,
    unit:        parsed.data.unit        ?? 'tablet',
    rxcui:       parsed.data.rxcui       ?? null,
    imageUrl:    parsed.data.imageUrl    || null,
    ingredients: parsed.data.ingredients ?? null,
    warnings:    parsed.data.warnings    ?? null,
  }

  const med = await prisma.medication.upsert({
    where: { name: parsed.data.name },
    create: medData,
    update: {
      // Update all enrichment fields but keep existing name as-is
      brandName:   medData.brandName   ?? undefined,
      genericName: medData.genericName ?? undefined,
      form:        medData.form        ?? undefined,
      strength:    medData.strength    ?? undefined,
      rxcui:       medData.rxcui       ?? undefined,
      ingredients: medData.ingredients ?? undefined,
    },
  })

  return NextResponse.json({ data: med }, { status: 201 })
}

