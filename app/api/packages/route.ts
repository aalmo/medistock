import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { syncPillsInStock } from "@/lib/inventory-sync"
import { z } from "zod"

const packageSchema = z.object({
  patientMedicationId: z.string(),
  expiryDate:          z.string(),
  quantity:            z.number().min(0.5),
  unitType:            z.string().default("pill"),
  lotNumber:           z.string().optional(),
  opened:              z.boolean().default(false),
  notes:               z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = (session.user as { id: string }).id
  const { searchParams } = new URL(req.url)
  const pmId         = searchParams.get("patientMedicationId")
  const patientId    = searchParams.get("patientId")
  const expiringSoon = searchParams.get("expiringSoon")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { patientMedication: { patient: { userId } } }
  if (pmId)      where.patientMedicationId = pmId
  if (patientId) where.patientMedication   = { patientId, patient: { userId } }
  if (expiringSoon) {
    const days = parseInt(expiringSoon)
    where.expiryDate = { lte: new Date(Date.now() + days * 86_400_000) }
  }

  const packages = await prisma.medicationPackage.findMany({
    where,
    include: {
      patientMedication: {
        include: {
          medication: { select: { name: true, brandName: true, strength: true } },
          patient:    { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { expiryDate: "asc" },
  })
  return NextResponse.json({ data: packages })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body   = await req.json()
  const parsed = packageSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const pkg = await prisma.medicationPackage.create({
    data: { ...parsed.data, expiryDate: new Date(parsed.data.expiryDate) },
    include: { patientMedication: { include: { medication: true, patient: true } } },
  })

  // Sync pillsInStock on the parent PatientMedication
  await syncPillsInStock(parsed.data.patientMedicationId)

  return NextResponse.json({ data: pkg }, { status: 201 })
}

