import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { patientSchema } from "@/lib/validations/patient"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = (session.user as { id: string }).id
  const { id } = await params
  const patient = await prisma.patient.findFirst({
    where: { id, userId },
    include: {
      patientMedications: {
        include: {
          medication: true,
          schedules: {
            where: { active: true },
            include: {
              doseLogs: {
                where: {
                  scheduledAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                },
                orderBy: { scheduledAt: "desc" }
              }
            }
          },
          packages: {
            orderBy: { expiryDate: "asc" },
          },
          inventoryEvents: { orderBy: { createdAt: "desc" }, take: 5 }
        }
      }
    }
  })

  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ data: patient })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as { id: string }).id
  const { id } = await params
  const body = await req.json()
  const parsed = patientSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
  }

  const patient = await prisma.patient.findFirst({ where: { id, userId } })
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.patient.update({
    where: { id },
    data: {
      ...parsed.data,
      dob:      parsed.data.dob      ? new Date(parsed.data.dob) : null,
      email:    parsed.data.email    || null,
      avatarUrl: parsed.data.avatarUrl || null,
    }
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as { id: string }).id
  const { id } = await params
  const patient = await prisma.patient.findFirst({ where: { id, userId } })
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.patient.delete({ where: { id } })
  return NextResponse.json({ message: "Deleted" })
}

