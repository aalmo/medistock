import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { syncPillsInStock } from "@/lib/inventory-sync"
import { z } from "zod"

const updateSchema = z.object({
  expiryDate: z.string().optional(),
  quantity:   z.number().min(0).optional(),
  lotNumber:  z.string().optional(),
  opened:     z.boolean().optional(),
  notes:      z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body   = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const data: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.expiryDate) data.expiryDate = new Date(parsed.data.expiryDate)

  const pkg = await prisma.$transaction(async (tx) => {
    const updated = await tx.medicationPackage.update({ where: { id }, data })
    await syncPillsInStock(updated.patientMedicationId, tx)
    return updated
  })
  return NextResponse.json({ data: pkg })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const pkg = await prisma.medicationPackage.findUnique({
    where:  { id },
    select: { patientMedicationId: true },
  })
  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.medicationPackage.delete({ where: { id } })
    await syncPillsInStock(pkg.patientMedicationId, tx)
  })
  return NextResponse.json({ ok: true })
}
