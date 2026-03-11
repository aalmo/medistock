import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as { id: string }).id
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get("limit") ?? "20")

  const notifications = await prisma.notification.findMany({
    where: { userId },
    include: { patient: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit
  })

  return NextResponse.json({ data: notifications })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as { id: string }).id
  const body = await req.json()

  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    })
    return NextResponse.json({ message: "All marked read" })
  }

  if (body.id) {
    await prisma.notification.update({
      where: { id: body.id, userId },
      data: { read: true }
    })
    return NextResponse.json({ message: "Marked read" })
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 })
}

