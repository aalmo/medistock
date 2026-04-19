import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const settingsSchema = z.object({
  name:             z.string().min(1).max(100).optional(),
  timezone:         z.string().optional(),
  language:         z.string().optional(), // NEW: default language
  emailNotifs:      z.boolean().optional(),
  emailAlertLevel:  z.enum(["off", "low", "critical"]).optional(),
  emailDigestFreq:  z.enum(["realtime", "daily", "weekly"]).optional(),
  lowStockDays:     z.number().int().min(1).max(90).optional(),
  expiryAlertDays:  z.number().int().min(1).max(365).optional(),
  drugDatabase:     z.enum(["us", "eu"]).optional(),
})

const USER_SELECT = {
  name: true, email: true, timezone: true, language: true,
  emailNotifs: true, emailAlertLevel: true, emailDigestFreq: true,
  lowStockDays: true, expiryAlertDays: true,
  drugDatabase: true,
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: USER_SELECT,
  })
  return NextResponse.json({ data: user })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const body = await req.json()
  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updated = await prisma.user.update({
    where:  { id: userId },
    data:   parsed.data,
    select: USER_SELECT,
  })
  return NextResponse.json({ data: updated })
}
