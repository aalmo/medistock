import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { addMinutes } from "date-fns"

// POST /api/cron/reminders
// Called every 30 min by Vercel Cron
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const windowEnd = addMinutes(now, 30)

  // Find upcoming PENDING doses in next 30 minutes
  const upcomingLogs = await prisma.doseLog.findMany({
    where: {
      scheduledAt: { gte: now, lte: windowEnd },
      status: "PENDING",
      schedule: { active: true }
    },
    include: {
      schedule: {
        include: {
          patientMedication: {
            include: {
              patient: { include: { user: true } },
              medication: true
            }
          }
        }
      }
    }
  })

  let sent = 0

  for (const log of upcomingLogs) {
    const pm = log.schedule.patientMedication
    const user = pm.patient.user

    // Check if reminder already sent for this dose (metadata stored as JSON string)
    const alreadySent = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: "REMINDER",
        metadata: { contains: log.id }
      }
    })
    if (alreadySent) continue

    await prisma.notification.create({
      data: {
        userId: user.id,
        patientId: pm.patientId,
        type: "REMINDER",
        message: `Reminder: ${pm.patient.name} should take ${pm.medication.name} (${log.schedule.pillsPerDose} pill${log.schedule.pillsPerDose > 1 ? "s" : ""}) soon.`,
        channel: "IN_APP",
        metadata: JSON.stringify({ doseLogId: log.id })
      }
    })
    sent++
  }

  // Doses are auto-completed (TAKEN) by /api/cron/auto-complete — not marked MISSED here.
  return NextResponse.json({ ok: true, remindersSent: sent })
}

