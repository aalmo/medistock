import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { patientSchema } from "@/lib/validations/patient"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as { id: string }).id

  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!userExists) {
    return NextResponse.json({ error: "Session expired — please sign out and log in again." }, { status: 401 })
  }

  const patients = await prisma.patient.findMany({
    where: { userId },
    include: {
      patientMedications: {
        where: { active: true },
        include: { medication: true }
      }
    },
    orderBy: { name: "asc" }
  })

  return NextResponse.json({ data: patients })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as { id: string }).id

  // Guard: verify the user actually exists in DB (catches stale JWT sessions after DB reset)
  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!userExists) {
    return NextResponse.json(
      { error: "Session expired — please sign out and log in again." },
      { status: 401 }
    )
  }

  const body = await req.json()
  const parsed = patientSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
  }

  const patient = await prisma.patient.create({
    data: {
      ...parsed.data,
      userId,
      dob: parsed.data.dob ? new Date(parsed.data.dob) : null,
      email: parsed.data.email || null,
      avatarUrl: parsed.data.avatarUrl || null,
    }
  })

  return NextResponse.json({ data: patient }, { status: 201 })
}

