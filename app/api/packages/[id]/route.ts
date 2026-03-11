import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
  expiryDate: z.string().optional(),
  quantity:   z.number().min(0).optional(),
  lotNumber:  z.string().optional(),
  opened:     z.boolean().optional(),
  notes:      z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body   = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const data: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.expiryDate) data.expiryDate = new Date(parsed.data.expiryDate)

  const pkg = await prisma.medicationPackage.update({ where: { id: params.id }, data })
  return NextResponse.json({ data: pkg })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.medicationPackage.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}

